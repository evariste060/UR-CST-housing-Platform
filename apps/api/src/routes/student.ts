import {
  mergeSavedSchema,
  paginationSchema,
  recordSearchSchema,
  replySchema,
  restoreHistorySchema,
  searchFiltersSchema,
  type HistoryResponse,
  type MergeSavedInput,
  type Paginated,
  type PropertySummary,
  type RecentSearch,
  type ReplyInput,
  type StudentInquiry,
  type StudentInquiryThread,
} from '@urcst/shared';
import type { Prisma } from '@prisma/client';
import { Router } from 'express';
import type { z } from 'zod';
import { prisma } from '../db';
import { AppError } from '../lib/errors';
import { notifyUsers } from '../lib/notify';
import { PUBLIC_LISTING, SUMMARY_INCLUDE, toSummary } from '../lib/propertyDto';
import { requireAuth, requireRole } from '../middleware/auth';
import { parseQuery, validate } from '../middleware/validate';

const HISTORY_LENGTH = 8;

// Saved rooms that have since been removed or sent back for review stay out of sight.
const VISIBLE_SAVE = { property: PUBLIC_LISTING };

const INQUIRY_INCLUDE = {
  property: { include: { ...SUMMARY_INCLUDE, landlord: { select: { fullName: true } } } },
  messages: { orderBy: { createdAt: 'asc' } },
} satisfies Prisma.InquiryInclude;

type InquiryRow = Prisma.InquiryGetPayload<{ include: typeof INQUIRY_INCLUDE }>;

function toInquiry(row: InquiryRow, studentId: string): StudentInquiry | null {
  const last = row.messages.at(-1);
  if (!last) return null;

  return {
    id: row.id,
    property: toSummary(row.property),
    lastMessage: {
      body: last.body,
      fromLandlord: last.senderId !== studentId,
      createdAt: last.createdAt.toISOString(),
    },
    replied: row.messages.some(({ senderId }) => senderId !== studentId),
    createdAt: row.createdAt.toISOString(),
  };
}

export const studentRouter = Router();

studentRouter.use(requireAuth, requireRole('STUDENT'));

studentRouter.get('/saved', async (req, res) => {
  const { page, pageSize } = parseQuery(paginationSchema, req.query);
  const where = { userId: req.user!.id, ...VISIBLE_SAVE };

  const [rows, total] = await prisma.$transaction([
    prisma.savedProperty.findMany({
      where,
      include: { property: { include: SUMMARY_INCLUDE } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.savedProperty.count({ where }),
  ]);

  const body: Paginated<PropertySummary> = {
    items: rows.map(({ property }) => toSummary(property)),
    total,
    page,
    pageSize,
  };
  res.json(body);
});

// Every id at once, so each heart on the page can show whether it is saved.
studentRouter.get('/saved/ids', async (req, res) => {
  const rows = await prisma.savedProperty.findMany({
    where: { userId: req.user!.id, ...VISIBLE_SAVE },
    select: { propertyId: true },
  });
  res.json({ ids: rows.map(({ propertyId }) => propertyId) });
});

// Comes before /saved/:propertyId, which would otherwise treat "merge" as an id.
studentRouter.post('/saved/merge', validate(mergeSavedSchema), async (req, res) => {
  const { propertyIds } = req.body as MergeSavedInput;
  const userId = req.user!.id;
  const listings = await prisma.property.findMany({
    where: { id: { in: propertyIds }, ...PUBLIC_LISTING },
    select: { id: true },
  });

  await prisma.savedProperty.createMany({
    data: listings.map(({ id }) => ({ userId, propertyId: id })),
    skipDuplicates: true,
  });
  res.json({ merged: listings.length });
});

studentRouter.post('/saved/:propertyId', async (req, res) => {
  const propertyId = req.params.propertyId as string;
  const userId = req.user!.id;
  const listing = await prisma.property.findFirst({
    where: { id: propertyId, ...PUBLIC_LISTING },
    select: { id: true },
  });
  if (!listing) {
    throw new AppError(404, 'LISTING_NOT_FOUND', 'This listing is no longer available to save.');
  }

  await prisma.savedProperty.upsert({
    where: { userId_propertyId: { userId, propertyId } },
    create: { userId, propertyId },
    update: {},
  });
  res.status(201).json({ ok: true });
});

studentRouter.delete('/saved/:propertyId', async (req, res) => {
  await prisma.savedProperty.deleteMany({
    where: { userId: req.user!.id, propertyId: req.params.propertyId as string },
  });
  res.json({ ok: true });
});

studentRouter.get('/history', async (req, res) => {
  const userId = req.user!.id;
  const [views, searches] = await Promise.all([
    prisma.propertyView.findMany({
      where: { userId, property: PUBLIC_LISTING },
      include: { property: { include: SUMMARY_INCLUDE } },
      orderBy: { viewedAt: 'desc' },
      take: HISTORY_LENGTH,
    }),
    prisma.searchHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: HISTORY_LENGTH,
    }),
  ]);

  const body: HistoryResponse = {
    views: views.map(({ property, viewedAt }) => ({
      property: toSummary(property),
      viewedAt: viewedAt.toISOString(),
    })),
    searches: searches.map(({ id, label, filters, createdAt }) => ({
      id,
      label,
      filters: searchFiltersSchema.parse(filters),
      createdAt: createdAt.toISOString(),
    })),
  };
  res.json(body);
});

studentRouter.delete('/history', async (req, res) => {
  const userId = req.user!.id;
  await prisma.$transaction([
    prisma.propertyView.deleteMany({ where: { userId } }),
    prisma.searchHistory.deleteMany({ where: { userId } }),
  ]);
  res.json({ ok: true });
});

studentRouter.post('/history/restore', validate(restoreHistorySchema), async (req, res) => {
  const { views, searches } = req.body as z.output<typeof restoreHistorySchema>;
  const userId = req.user!.id;
  const listings = await prisma.property.findMany({
    where: { id: { in: views.map(({ propertyId }) => propertyId) }, ...PUBLIC_LISTING },
    select: { id: true },
  });
  const visible = new Set(listings.map(({ id }) => id));

  await prisma.$transaction([
    prisma.propertyView.createMany({
      data: views
        .filter(({ propertyId }) => visible.has(propertyId))
        .map(({ propertyId, viewedAt }) => ({ userId, propertyId, viewedAt })),
      skipDuplicates: true,
    }),
    prisma.searchHistory.createMany({
      data: searches.map(({ label, filters, createdAt }) => ({
        userId,
        label,
        filters,
        createdAt,
      })),
    }),
  ]);
  res.json({ ok: true });
});

studentRouter.post('/searches', validate(recordSearchSchema), async (req, res) => {
  const { label, filters } = req.body as z.output<typeof recordSearchSchema>;
  const userId = req.user!.id;

  const latest = await prisma.searchHistory.findFirst({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
  // Running the same search twice in a row keeps one entry.
  if (latest?.label === label) {
    res.json({ ok: true });
    return;
  }

  const created = await prisma.searchHistory.create({ data: { userId, label, filters } });
  const expired = await prisma.searchHistory.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    skip: HISTORY_LENGTH,
    select: { id: true },
  });
  await prisma.searchHistory.deleteMany({ where: { id: { in: expired.map(({ id }) => id) } } });

  const body: RecentSearch = {
    id: created.id,
    label,
    filters,
    createdAt: created.createdAt.toISOString(),
  };
  res.status(201).json(body);
});

studentRouter.get('/inquiries', async (req, res) => {
  const { page, pageSize } = parseQuery(paginationSchema, req.query);
  const studentId = req.user!.id;
  const where = { studentId };

  const [rows, total] = await prisma.$transaction([
    prisma.inquiry.findMany({
      where,
      include: INQUIRY_INCLUDE,
      orderBy: { updatedAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.inquiry.count({ where }),
  ]);

  const items = rows.flatMap((row) => toInquiry(row, studentId) ?? []);

  const body: Paginated<StudentInquiry> = { items, total, page, pageSize };
  res.json(body);
});

function inquiryNotFound() {
  return new AppError(404, 'INQUIRY_NOT_FOUND', 'This conversation could not be found.');
}

async function findThread(id: string, studentId: string) {
  const row = await prisma.inquiry.findFirst({
    where: { id, studentId },
    include: INQUIRY_INCLUDE,
  });
  const inquiry = row && toInquiry(row, studentId);
  if (!row || !inquiry) throw inquiryNotFound();

  const body: StudentInquiryThread = {
    ...inquiry,
    landlord: row.property.landlord.fullName,
    messages: row.messages.map(({ id: messageId, body: text, senderId, createdAt }) => ({
      id: messageId,
      body: text,
      fromLandlord: senderId !== studentId,
      createdAt: createdAt.toISOString(),
    })),
  };
  return body;
}

studentRouter.get('/inquiries/:id', async (req, res) => {
  res.json(await findThread(req.params.id as string, req.user!.id));
});

/** The student writes again in a conversation they started. The landlord sees it as new. */
studentRouter.post('/inquiries/:id/messages', validate(replySchema), async (req, res) => {
  const student = req.user!;
  const { message } = req.body as ReplyInput;
  const inquiry = await prisma.inquiry.findFirst({
    where: { id: req.params.id as string, studentId: student.id },
    include: { property: { select: { title: true, landlordId: true, deletedAt: true } } },
  });
  if (!inquiry) throw inquiryNotFound();
  if (inquiry.property.deletedAt) {
    throw new AppError(
      409,
      'LISTING_REMOVED',
      'This listing was removed, so you cannot send new messages. You can still read the conversation.',
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.inquiryMessage.create({
      data: { inquiryId: inquiry.id, senderId: student.id, body: message },
    });
    await tx.inquiry.update({ where: { id: inquiry.id }, data: { status: 'NEW' } });
    await notifyUsers(tx, [inquiry.property.landlordId], {
      type: 'INQUIRY_RECEIVED',
      text: `${student.fullName} sent a new message about ${inquiry.property.title}.`,
      link: `/landlord/inquiries?open=${inquiry.id}`,
    });
  });
  res.status(201).json(await findThread(inquiry.id, student.id));
});
