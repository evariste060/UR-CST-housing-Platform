import {
  inquirySchema,
  propertyQuerySchema,
  REPORT_REASON_LABELS,
  reportSchema,
  type InquiryInput,
  type Paginated,
  type PropertySummary,
  type ReportInput,
} from '@urcst/shared';
import { Router } from 'express';
import { prisma } from '../db';
import { AppError } from '../lib/errors';
import {
  canView,
  DETAIL_INCLUDE,
  PUBLIC_LISTING,
  SUMMARY_INCLUDE,
  toDetail,
  toSummary,
} from '../lib/propertyDto';
import { propertyOrder, propertyWhere } from '../lib/propertyFilters';
import { currentUser, requireAuth, requireRole } from '../middleware/auth';
import { reportLimiter } from '../middleware/rateLimit';
import { parseQuery, validate } from '../middleware/validate';

const FEATURED_COUNT = 3;

const listingNotFound = () =>
  new AppError(
    404,
    'LISTING_NOT_FOUND',
    'This listing is not available. It may have been removed or is still waiting for review.',
  );

// Created per app, so each test gets fresh rate-limit counters.
export function propertiesRouter() {
  const router = Router();

  router.get('/', async (req, res) => {
    const query = parseQuery(propertyQuerySchema, req.query);
    const { page, pageSize } = query;
    const where = propertyWhere(query);

    const [rows, total] = await prisma.$transaction([
      prisma.property.findMany({
        where,
        include: SUMMARY_INCLUDE,
        orderBy: propertyOrder(query.sort),
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.property.count({ where }),
    ]);

    const body: Paginated<PropertySummary> = { items: rows.map(toSummary), total, page, pageSize };
    res.json(body);
  });

  // Comes before /:id, which would otherwise treat "featured" as an id.
  router.get('/featured', async (_req, res) => {
    const rows = await prisma.property.findMany({
      where: { ...PUBLIC_LISTING, availability: 'AVAILABLE' },
      include: SUMMARY_INCLUDE,
      orderBy: [{ reviewedAt: { sort: 'desc', nulls: 'last' } }, { id: 'asc' }],
      take: FEATURED_COUNT,
    });
    res.json({ items: rows.map(toSummary) });
  });

  router.get('/:id', async (req, res) => {
    const viewer = await currentUser(req, res);
    const row = await prisma.property.findUnique({
      where: { id: req.params.id },
      include: DETAIL_INCLUDE,
    });
    if (!row || !canView(row, viewer)) throw listingNotFound();

    if (viewer?.role === 'STUDENT' && row.reviewStatus === 'APPROVED') {
      const viewedAt = new Date();
      await prisma.propertyView.upsert({
        where: { userId_propertyId: { userId: viewer.id, propertyId: row.id } },
        create: { userId: viewer.id, propertyId: row.id, viewedAt },
        update: { viewedAt },
      });
    }
    res.json(toDetail(row));
  });

  router.post('/:id/reports', reportLimiter(), validate(reportSchema), async (req, res) => {
    const { reason, details } = req.body as ReportInput;
    const reporter = await currentUser(req, res);
    const listing = await prisma.property.findFirst({
      where: { id: req.params.id as string, ...PUBLIC_LISTING },
    });
    if (!listing) throw listingNotFound();

    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN', status: 'ACTIVE' },
      select: { id: true },
    });
    const label = REPORT_REASON_LABELS[reason].toLowerCase();

    await prisma.$transaction(async (tx) => {
      const report = await tx.report.create({
        data: { propertyId: listing.id, reporterId: reporter?.id, reason, details },
      });
      await tx.notification.createMany({
        data: admins.map(({ id }) => ({
          userId: id,
          type: 'REPORT_RECEIVED',
          text: `New report on ${listing.title}: ${label}.`,
          link: '/admin/reports',
        })),
      });
      await tx.activityLog.create({
        data: {
          actorId: reporter?.id,
          action: 'REPORT_RECEIVED',
          targetType: 'Report',
          targetId: report.id,
          text: `Report received for ${listing.title}`,
        },
      });
    });
    res.status(201).json({ ok: true });
  });

  router.post(
    '/:id/inquiries',
    requireAuth,
    requireRole('STUDENT'),
    validate(inquirySchema),
    async (req, res) => {
      const student = req.user!;
      const { message } = req.body as InquiryInput;
      const listing = await prisma.property.findFirst({
        where: { id: req.params.id as string, ...PUBLIC_LISTING },
        include: { landlord: { include: { landlordProfile: true } } },
      });
      if (!listing) throw listingNotFound();

      if (!listing.landlord.landlordProfile?.allowInApp) {
        throw new AppError(
          409,
          'IN_APP_OFF',
          'This landlord does not take messages here. Use their phone number or WhatsApp.',
        );
      }

      const inquiry = await prisma.$transaction(async (tx) => {
        const created = await tx.inquiry.create({
          data: {
            propertyId: listing.id,
            studentId: student.id,
            messages: { create: { senderId: student.id, body: message } },
          },
        });
        await tx.notification.create({
          data: {
            userId: listing.landlordId,
            type: 'INQUIRY_RECEIVED',
            text: `${student.fullName} sent an inquiry about ${listing.title}.`,
            link: '/landlord/inquiries',
          },
        });
        return created;
      });
      res.status(201).json({ id: inquiry.id });
    },
  );

  return router;
}
