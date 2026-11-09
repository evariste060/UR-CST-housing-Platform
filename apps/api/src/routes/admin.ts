import { Prisma, type ReviewStatus } from '@prisma/client';
import {
  adminListingsQuerySchema,
  adminLocationsQuerySchema,
  adminReportsQuerySchema,
  adminUsersQuerySchema,
  locationInputSchema,
  moderationNoteSchema,
  REPORT_REASON_LABELS,
  removeListingSchema,
  resolveReportSchema,
  REVIEW_TABS,
  userStatusSchema,
  type AdminListing,
  type AdminListingDetail,
  type AdminListingList,
  type AdminLocation,
  type AdminReport,
  type AdminReportList,
  type AdminSummary,
  type AdminUser,
  type AdminUserDetail,
  type ChecklistItem,
  type ModerationNoteInput,
  type Paginated,
  type RemoveListingInput,
  type ResolveReportInput,
  type ReviewTab,
  type UserStatusInput,
} from '@urcst/shared';
import { Router, type Request, type Response } from 'express';
import { prisma } from '../db';
import { AppError, isUniqueViolation } from '../lib/errors';
import { notifyUsers } from '../lib/notify';
import { DETAIL_INCLUDE, toDetail } from '../lib/propertyDto';
import { requireAuth, requireRole } from '../middleware/auth';
import { parseQuery, validate } from '../middleware/validate';

type Tx = Prisma.TransactionClient;

/** Listings an administrator works with: submitted at least once and not deleted by the landlord. */
const REVIEWABLE = {
  deletedAt: null,
  reviewStatus: { not: 'DRAFT' },
} satisfies Prisma.PropertyWhereInput;

/** Listings that count as using a location. */
const IN_USE = {
  deletedAt: null,
  reviewStatus: { not: 'REMOVED' },
} satisfies Prisma.PropertyWhereInput;

const MIN_REALISTIC_RENT = 10_000;
const MAX_REALISTIC_RENT = 400_000;
const MIN_PHOTOS = 3;
const MIN_DESCRIPTION = 60;
const ACTIVITY_COUNT = 7;
const ATTENTION_COUNT = 5;

const notFound = (what: string) =>
  new AppError(404, 'NOT_FOUND', `This ${what} could not be found.`);

const idOf = (req: Request) => req.params.id as string;

const iso = (date: Date | null) => date?.toISOString() ?? null;

function log(
  tx: Tx,
  req: Request,
  action: string,
  targetType: string,
  targetId: string,
  text: string,
) {
  return tx.activityLog.create({
    data: {
      actorId: req.user!.id,
      action,
      targetType,
      targetId,
      text: `${req.user!.fullName} ${text}`,
    },
  });
}

const LISTING_INCLUDE = {
  landlord: { select: { fullName: true } },
  location: { select: { name: true } },
  photos: {
    where: { pendingAdd: false },
    orderBy: [{ isCover: 'desc' }, { position: 'asc' }],
    select: { url: true },
  },
} satisfies Prisma.PropertyInclude;

type ListingRow = Prisma.PropertyGetPayload<{ include: typeof LISTING_INCLUDE }>;

function toListing(row: ListingRow): AdminListing {
  return {
    id: row.id,
    title: row.title,
    landlord: row.landlord.fullName,
    rentRwf: row.rentRwf,
    area: row.location?.name ?? '-',
    submittedAt: iso(row.submittedAt),
    photoCount: row.photos.length,
    photoUrls: row.photos.slice(0, 2).map(({ url }) => url),
    reviewStatus: row.reviewStatus,
    availability: row.availability,
    reviewNote: row.reviewNote,
  };
}

function checklist(row: {
  rentRwf: number;
  description: string;
  distanceKm: Prisma.Decimal | null;
  locationId: string | null;
  photos: unknown[];
}): ChecklistItem[] {
  const km = row.distanceKm?.toNumber();
  return [
    {
      key: 'rent',
      label: 'Rent is in a realistic range for student housing',
      ok: row.rentRwf >= MIN_REALISTIC_RENT && row.rentRwf <= MAX_REALISTIC_RENT,
    },
    {
      key: 'photos',
      label: `At least ${MIN_PHOTOS} photos (${row.photos.length})`,
      ok: row.photos.length >= MIN_PHOTOS,
    },
    {
      key: 'area',
      label: 'Location is inside the UR-CST pilot area',
      ok: row.locationId !== null && km !== undefined && km <= 5,
    },
    {
      key: 'description',
      label: 'Description explains what is included',
      ok: row.description.trim().length >= MIN_DESCRIPTION,
    },
  ];
}

async function findListing(id: string) {
  const row = await prisma.property.findFirst({
    where: { id, ...REVIEWABLE },
    include: LISTING_INCLUDE,
  });
  if (!row) throw notFound('listing');
  return row;
}

function wrongState(message: string) {
  return new AppError(409, 'WRONG_STATUS', message);
}

const REVIEWABLE_NOW: ReviewStatus[] = ['PENDING', 'CHANGES_REQUESTED'];

const ADMIN_USER_SELECT = {
  id: true,
  fullName: true,
  email: true,
  role: true,
  status: true,
  createdAt: true,
} satisfies Prisma.UserSelect;

function toUser(row: Prisma.UserGetPayload<{ select: typeof ADMIN_USER_SELECT }>): AdminUser {
  return {
    id: row.id,
    fullName: row.fullName,
    email: row.email,
    role: row.role as AdminUser['role'],
    status: row.status,
    createdAt: row.createdAt.toISOString(),
  };
}

const REPORT_INCLUDE = {
  reporter: { select: { fullName: true } },
  property: {
    select: {
      id: true,
      title: true,
      reviewStatus: true,
      rentRwf: true,
      water: true,
      electricity: true,
      _count: { select: { photos: { where: { pendingAdd: false } } } },
    },
  },
} satisfies Prisma.ReportInclude;

function toReport(row: Prisma.ReportGetPayload<{ include: typeof REPORT_INCLUDE }>): AdminReport {
  const { property } = row;
  return {
    id: row.id,
    property: {
      id: property.id,
      title: property.title,
      reviewStatus: property.reviewStatus,
      rentRwf: property.rentRwf,
      photoCount: property._count.photos,
      water: property.water,
      electricity: property.electricity,
    },
    reason: row.reason,
    details: row.details,
    reporter: row.reporter?.fullName ?? 'A guest',
    status: row.status,
    resolutionNote: row.resolutionNote,
    createdAt: row.createdAt.toISOString(),
    resolvedAt: iso(row.resolvedAt),
  };
}

const NOT_ADMIN = { role: { not: 'ADMIN' } } satisfies Prisma.UserWhereInput;

async function toLocation(row: {
  id: string;
  name: string;
  distanceKm: Prisma.Decimal;
  angleDeg: number;
}): Promise<AdminLocation> {
  const listings = await prisma.property.count({ where: { locationId: row.id, ...IN_USE } });
  return {
    id: row.id,
    name: row.name,
    distanceKm: row.distanceKm.toNumber(),
    angleDeg: row.angleDeg,
    listings,
  };
}

const nameTaken = () =>
  new AppError(400, 'VALIDATION_ERROR', 'Please check the highlighted fields.', {
    name: 'This location already exists.',
  });

async function assertNameFree(name: string, exceptId?: string) {
  const clash = await prisma.location.findFirst({
    where: {
      name: { equals: name, mode: 'insensitive' },
      ...(exceptId && { id: { not: exceptId } }),
    },
  });
  if (clash) throw nameTaken();
}

export function adminRouter() {
  const router = Router();
  router.use(requireAuth, requireRole('ADMIN'));

  router.get('/summary', async (_req, res) => {
    const [students, landlords, listings, pending, openReports, pendingRows, reportRows, activity] =
      await Promise.all([
        prisma.user.count({ where: { role: 'STUDENT' } }),
        prisma.user.count({ where: { role: 'LANDLORD' } }),
        prisma.property.count({ where: REVIEWABLE }),
        prisma.property.count({ where: { ...REVIEWABLE, reviewStatus: 'PENDING' } }),
        prisma.report.count({ where: { status: 'OPEN' } }),
        prisma.property.findMany({
          where: { ...REVIEWABLE, reviewStatus: 'PENDING' },
          include: LISTING_INCLUDE,
          orderBy: { submittedAt: 'asc' },
          take: ATTENTION_COUNT,
        }),
        prisma.report.findMany({
          where: { status: 'OPEN' },
          include: { property: { select: { id: true, title: true } } },
          orderBy: { createdAt: 'desc' },
          take: ATTENTION_COUNT,
        }),
        prisma.activityLog.findMany({
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          take: ACTIVITY_COUNT,
        }),
      ]);

    const body: AdminSummary = {
      counts: { students, landlords, listings, pending, openReports },
      pending: pendingRows.map((row) => ({
        id: row.id,
        title: row.title,
        landlord: row.landlord.fullName,
        submittedAt: iso(row.submittedAt),
        coverUrl: row.photos[0]?.url ?? null,
      })),
      reports: reportRows.map((row) => ({
        id: row.id,
        propertyId: row.property.id,
        title: row.property.title,
        reason: REPORT_REASON_LABELS[row.reason],
        createdAt: row.createdAt.toISOString(),
      })),
      activity: activity.map(({ id, action, text, createdAt }) => ({
        id,
        action,
        text,
        createdAt: createdAt.toISOString(),
      })),
    };
    res.json(body);
  });

  // ----- Listing review -----

  router.get('/listings', async (req, res) => {
    const { status, page, pageSize } = parseQuery(adminListingsQuerySchema, req.query);
    const where = { ...REVIEWABLE, reviewStatus: status };

    const [rows, total, grouped] = await Promise.all([
      prisma.property.findMany({
        where,
        include: LISTING_INCLUDE,
        orderBy: [{ submittedAt: 'desc' }, { id: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.property.count({ where }),
      prisma.property.groupBy({ by: ['reviewStatus'], where: REVIEWABLE, _count: true }),
    ]);

    const counts = Object.fromEntries(REVIEW_TABS.map((tab) => [tab, 0])) as Record<
      ReviewTab,
      number
    >;
    for (const { reviewStatus, _count } of grouped) {
      if (reviewStatus in counts) counts[reviewStatus as ReviewTab] = _count;
    }

    const body: AdminListingList = { items: rows.map(toListing), total, page, pageSize, counts };
    res.json(body);
  });

  router.get('/listings/:id', async (req, res) => {
    const row = await prisma.property.findFirst({
      where: { id: idOf(req), ...REVIEWABLE },
      include: DETAIL_INCLUDE,
    });
    if (!row) throw notFound('listing');
    // A removed listing can lose its neighbourhood when an administrator removes the location.
    if (!row.location || !row.type || !row.distanceKm) {
      throw new AppError(
        409,
        'INCOMPLETE',
        'This listing has no neighbourhood any more, so it cannot be shown.',
      );
    }

    const body: AdminListingDetail = {
      listing: toDetail(row),
      landlord: {
        id: row.landlord.id,
        name: row.landlord.fullName,
        email: row.landlord.email,
        phone: row.landlord.phone,
      },
      reviewNote: row.reviewNote,
      submittedAt: iso(row.submittedAt),
      reviewedAt: iso(row.reviewedAt),
      checklist: checklist(row),
    };
    res.json(body);
  });

  /** Approve, request changes or reject: the three answers to a submission. */
  function decide(
    to: 'APPROVED' | 'CHANGES_REQUESTED' | 'REJECTED',
    word: string,
    message: (title: string, note: string) => string,
  ) {
    return async (req: Request, res: Response) => {
      const row = await findListing(idOf(req));
      if (!REVIEWABLE_NOW.includes(row.reviewStatus)) {
        throw wrongState('This listing is not waiting for review, so it cannot be changed here.');
      }
      const note = to === 'APPROVED' ? null : (req.body as ModerationNoteInput).note;

      const updated = await prisma.$transaction(async (tx) => {
        const saved = await tx.property.update({
          where: { id: row.id },
          data: {
            reviewStatus: to,
            reviewNote: note,
            reviewedAt: new Date(),
            reviewedById: req.user!.id,
          },
          include: LISTING_INCLUDE,
        });
        await notifyUsers(tx, [row.landlordId], {
          type: `LISTING_${to}`,
          text: message(row.title, note ?? ''),
          link: '/landlord/properties',
        });
        await log(tx, req, `LISTING_${to}`, 'Property', row.id, `${word} ${row.title}`);
        return saved;
      });
      res.json(toListing(updated));
    };
  }

  router.post(
    '/listings/:id/approve',
    decide(
      'APPROVED',
      'approved',
      (title) => `Listing approved: ${title} is now visible to students.`,
    ),
  );
  router.post(
    '/listings/:id/request-changes',
    validate(moderationNoteSchema),
    decide(
      'CHANGES_REQUESTED',
      'returned for changes',
      (title, note) => `Changes requested on ${title}. Note: ${note}`,
    ),
  );
  router.post(
    '/listings/:id/reject',
    validate(moderationNoteSchema),
    decide('REJECTED', 'rejected', (title, note) => `Listing rejected: ${title}. Reason: ${note}`),
  );

  router.post('/listings/:id/remove', validate(removeListingSchema), async (req, res) => {
    const row = await findListing(idOf(req));
    if (row.reviewStatus !== 'APPROVED') {
      throw wrongState('Only an approved listing can be removed.');
    }
    const { note, reportId } = req.body as RemoveListingInput;
    if (reportId) {
      const report = await prisma.report.findFirst({
        where: { id: reportId, propertyId: row.id, status: 'OPEN' },
      });
      if (!report) throw notFound('report');
    }

    const updated = await prisma.$transaction(async (tx) => {
      const saved = await tx.property.update({
        where: { id: row.id },
        data: {
          reviewStatus: 'REMOVED',
          reviewNote: note,
          reviewedAt: new Date(),
          reviewedById: req.user!.id,
        },
        include: LISTING_INCLUDE,
      });
      // Students only ever see approved listings, so it leaves their saved lists too.
      await tx.savedProperty.deleteMany({ where: { propertyId: row.id } });
      if (reportId) {
        await tx.report.update({
          where: { id: reportId },
          data: {
            status: 'RESOLVED',
            resolutionNote: `Listing removed. ${note}`,
            resolvedAt: new Date(),
            resolvedById: req.user!.id,
          },
        });
      }
      await notifyUsers(tx, [row.landlordId], {
        type: 'LISTING_REMOVED',
        text: `Listing removed by admin: ${row.title}. Reason: ${note}`,
        link: '/landlord/properties',
      });
      await log(tx, req, 'LISTING_REMOVED', 'Property', row.id, `removed ${row.title}`);
      return saved;
    });
    res.json(toListing(updated));
  });

  // ----- Users -----

  router.get('/users', async (req, res) => {
    const { role, q, page, pageSize } = parseQuery(adminUsersQuerySchema, req.query);
    const where: Prisma.UserWhereInput = {
      role: role === 'all' ? { not: 'ADMIN' } : role === 'student' ? 'STUDENT' : 'LANDLORD',
      ...(q && {
        OR: [
          { fullName: { contains: q, mode: 'insensitive' } },
          { email: { contains: q, mode: 'insensitive' } },
        ],
      }),
    };
    const [rows, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: ADMIN_USER_SELECT,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.user.count({ where }),
    ]);
    const body: Paginated<AdminUser> = { items: rows.map(toUser), total, page, pageSize };
    res.json(body);
  });

  async function findUser(id: string) {
    const row = await prisma.user.findFirst({
      where: { id, ...NOT_ADMIN },
      select: { ...ADMIN_USER_SELECT, phone: true },
    });
    if (!row) throw notFound('account');
    return row;
  }

  router.get('/users/:id', async (req, res) => {
    const row = await findUser(idOf(req));
    const count =
      row.role === 'LANDLORD'
        ? await prisma.property.count({ where: { landlordId: row.id, deletedAt: null } })
        : await prisma.inquiry.count({ where: { studentId: row.id } });
    const body: AdminUserDetail = { ...toUser(row), phone: row.phone, count };
    res.json(body);
  });

  router.patch('/users/:id/status', validate(userStatusSchema), async (req, res) => {
    // Administrators are not listed, so this also stops anyone suspending themselves.
    if (idOf(req) === req.user!.id) {
      throw new AppError(403, 'FORBIDDEN', 'You cannot change your own account here.');
    }
    const row = await findUser(idOf(req));
    const { status } = req.body as UserStatusInput;

    const updated = await prisma.$transaction(async (tx) => {
      const saved = await tx.user.update({
        where: { id: row.id },
        data: { status },
        select: ADMIN_USER_SELECT,
      });
      if (status !== row.status) {
        const word = status === 'SUSPENDED' ? 'suspended' : 'reactivated';
        await log(tx, req, `USER_${status}`, 'User', row.id, `${word} ${row.fullName}`);
      }
      return saved;
    });
    res.json(toUser(updated));
  });

  // ----- Reports -----

  router.get('/reports', async (req, res) => {
    const { status, page, pageSize } = parseQuery(adminReportsQuerySchema, req.query);
    const [rows, total, open, resolved] = await Promise.all([
      prisma.report.findMany({
        where: { status },
        include: REPORT_INCLUDE,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.report.count({ where: { status } }),
      prisma.report.count({ where: { status: 'OPEN' } }),
      prisma.report.count({ where: { status: 'RESOLVED' } }),
    ]);
    const body: AdminReportList = {
      items: rows.map(toReport),
      total,
      page,
      pageSize,
      counts: { OPEN: open, RESOLVED: resolved },
    };
    res.json(body);
  });

  router.post('/reports/:id/resolve', validate(resolveReportSchema), async (req, res) => {
    const report = await prisma.report.findUnique({
      where: { id: idOf(req) },
      include: { property: { select: { title: true } } },
    });
    if (!report) throw notFound('report');
    if (report.status !== 'OPEN') throw wrongState('This report is already resolved.');
    const { note } = req.body as ResolveReportInput;

    const updated = await prisma.$transaction(async (tx) => {
      const saved = await tx.report.update({
        where: { id: report.id },
        data: {
          status: 'RESOLVED',
          resolutionNote: note,
          resolvedAt: new Date(),
          resolvedById: req.user!.id,
        },
        include: REPORT_INCLUDE,
      });
      await log(
        tx,
        req,
        'REPORT_RESOLVED',
        'Report',
        report.id,
        `resolved a report on ${report.property.title}`,
      );
      return saved;
    });
    res.json(toReport(updated));
  });

  // ----- Locations -----

  router.get('/locations', async (req, res) => {
    const { q, page, pageSize } = parseQuery(adminLocationsQuerySchema, req.query);
    const where: Prisma.LocationWhereInput = q
      ? { name: { contains: q, mode: 'insensitive' } }
      : {};
    const [rows, total] = await Promise.all([
      prisma.location.findMany({
        where,
        orderBy: [{ distanceKm: 'asc' }, { name: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.location.count({ where }),
    ]);
    const body: Paginated<AdminLocation> = {
      items: await Promise.all(rows.map(toLocation)),
      total,
      page,
      pageSize,
    };
    res.json(body);
  });

  router.post('/locations', validate(locationInputSchema), async (req, res) => {
    const { name, distanceKm, angleDeg } = req.body as {
      name: string;
      distanceKm: number;
      angleDeg?: number;
    };
    await assertNameFree(name);
    try {
      const row = await prisma.$transaction(async (tx) => {
        const created = await tx.location.create({
          data: { name, distanceKm, angleDeg: angleDeg ?? Math.floor(Math.random() * 360) },
        });
        await log(tx, req, 'LOCATION_ADDED', 'Location', created.id, `added location ${name}`);
        return created;
      });
      res.status(201).json(await toLocation(row));
    } catch (error) {
      if (isUniqueViolation(error)) throw nameTaken();
      throw error;
    }
  });

  router.patch('/locations/:id', validate(locationInputSchema), async (req, res) => {
    const existing = await prisma.location.findUnique({ where: { id: idOf(req) } });
    if (!existing) throw notFound('location');
    const { name, distanceKm, angleDeg } = req.body as {
      name: string;
      distanceKm: number;
      angleDeg?: number;
    };
    await assertNameFree(name, existing.id);

    try {
      const row = await prisma.$transaction(async (tx) => {
        const saved = await tx.location.update({
          where: { id: existing.id },
          data: { name, distanceKm, ...(angleDeg !== undefined && { angleDeg }) },
        });
        await log(tx, req, 'LOCATION_EDITED', 'Location', existing.id, `edited location ${name}`);
        return saved;
      });
      res.json(await toLocation(row));
    } catch (error) {
      if (isUniqueViolation(error)) throw nameTaken();
      throw error;
    }
  });

  router.delete('/locations/:id', async (req, res) => {
    const existing = await prisma.location.findUnique({ where: { id: idOf(req) } });
    if (!existing) throw notFound('location');
    const listings = await prisma.property.count({ where: { locationId: existing.id, ...IN_USE } });
    if (listings > 0) {
      throw new AppError(
        409,
        'LOCATION_IN_USE',
        `${listings} ${listings === 1 ? 'listing uses' : 'listings use'} this location. Ask landlords to move ${listings === 1 ? 'it' : 'them'} to another neighbourhood first.`,
      );
    }

    await prisma.$transaction(async (tx) => {
      // Removed and deleted listings keep their history but lose the neighbourhood.
      await tx.property.updateMany({
        where: { locationId: existing.id },
        data: { locationId: null },
      });
      await tx.location.delete({ where: { id: existing.id } });
      await log(
        tx,
        req,
        'LOCATION_REMOVED',
        'Location',
        existing.id,
        `removed location ${existing.name}`,
      );
    });
    res.json({ ok: true });
  });

  return router;
}
