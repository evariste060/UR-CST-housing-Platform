import { Prisma } from '@prisma/client';
import {
  availabilityInputSchema,
  EMPTY_DRAFT,
  inquiryStatusInputSchema,
  landlordInquiriesQuerySchema,
  landlordPropertiesQuerySchema,
  listingDraftSchema,
  listingErrors,
  listingPatchSchema,
  MAX_PHOTOS,
  photoArrangementSchema,
  replySchema,
  type AvailabilityResult,
  type InquiryFilter,
  type InquiryStatus,
  type InquiryThread,
  type LandlordFilter,
  type LandlordInquiry,
  type LandlordInquiryList,
  type LandlordProperty,
  type LandlordPropertyList,
  type LandlordSummary,
  type ListingDraft,
  type ListingForm,
  type ListingPatch,
  type PhotoArrangement,
  type ReplyInput,
} from '@urcst/shared';
import { Router, type Request } from 'express';
import { prisma } from '../db';
import { AppError } from '../lib/errors';
import type { Storage } from '../lib/storage';
import { requireAuth, requireRole } from '../middleware/auth';
import { photoError, photoExtension, uploadPhotos } from '../middleware/upload';
import { parseQuery, validate } from '../middleware/validate';

const PROPERTY_INCLUDE = {
  location: true,
  photos: { orderBy: [{ isCover: 'desc' }, { position: 'asc' }] },
} satisfies Prisma.PropertyInclude;

type PropertyRow = Prisma.PropertyGetPayload<{ include: typeof PROPERTY_INCLUDE }>;

const INQUIRY_INCLUDE = {
  student: { select: { fullName: true } },
  property: { select: { id: true, title: true, landlordId: true, draft: true } },
  messages: { orderBy: { createdAt: 'asc' } },
} satisfies Prisma.InquiryInclude;

type InquiryRow = Prisma.InquiryGetPayload<{ include: typeof INQUIRY_INCLUDE }>;

const NEWEST_FIRST = [
  { createdAt: 'desc' },
  { id: 'asc' },
] satisfies Prisma.PropertyOrderByWithRelationInput[];

const SUMMARY_INQUIRIES = 3;
const SUMMARY_PROPERTIES = 4;

const listingNotFound = () =>
  new AppError(404, 'LISTING_NOT_FOUND', 'Listing not found. It may have been deleted.');

const inquiryNotFound = () =>
  new AppError(404, 'INQUIRY_NOT_FOUND', 'This inquiry could not be found.');

/** Saved answers, plus where the photos should end up once the listing is submitted. */
interface StoredDraft extends Partial<ListingDraft> {
  photos?: PhotoArrangement;
}

const storedDraft = (row: { draft: Prisma.JsonValue }) => (row.draft ?? {}) as StoredDraft;

function liveValues(row: PropertyRow): ListingDraft {
  if (row.reviewStatus === 'DRAFT' && row.locationId === null) return EMPTY_DRAFT;

  return {
    title: row.title,
    type: row.type,
    rooms: row.rooms,
    description: row.description,
    locationId: row.locationId,
    landmark: row.landmark,
    address: row.address ?? '',
    pin: row.pinX !== null && row.pinY !== null ? { x: row.pinX, y: row.pinY } : null,
    rentRwf: row.rentRwf,
    availability: row.availability,
    water: row.water,
    electricity: row.electricity,
    security: row.security,
    bathroom: row.bathroom,
    selfContained: row.selfContained,
  };
}

/** Saved answers on top of the live listing. */
function formValues(row: PropertyRow): ListingDraft {
  const values: ListingDraft = { ...liveValues(row) };
  const parsed = listingDraftSchema.partial().parse(storedDraft(row));
  return { ...values, ...parsed };
}

/** The photos as the wizard should show them, in their new order. */
function arrangedPhotos(row: PropertyRow) {
  const { photos: arrangement } = storedDraft(row);
  const order = arrangement?.order ?? [];
  const rank = (id: string) => {
    const index = order.indexOf(id);
    return index === -1 ? order.length : index;
  };
  const photos = row.photos
    .filter(({ pendingRemove }) => !pendingRemove)
    .sort((a, b) => rank(a.id) - rank(b.id) || a.position - b.position);

  const chosen = photos.find(({ id }) => id === arrangement?.coverId);
  const cover = chosen ?? photos.find(({ isCover }) => isCover) ?? photos[0];
  return { photos, coverId: cover?.id ?? null };
}

function toForm(row: PropertyRow): ListingForm {
  const { photos, coverId } = arrangedPhotos(row);

  return {
    id: row.id,
    reviewStatus: row.reviewStatus,
    values: formValues(row),
    photos: photos.map(({ id, url }) => ({ id, url })),
    coverId,
    savedAt: row.updatedAt.toISOString(),
  };
}

function toListItem(row: PropertyRow): LandlordProperty {
  const live = row.locationId !== null;
  const answers = storedDraft(row);
  const { photos, coverId } = arrangedPhotos(row);
  const cover = live
    ? (row.photos.find(({ isCover }) => isCover) ?? row.photos[0])
    : photos.find(({ id }) => id === coverId);

  return {
    id: row.id,
    title: live ? row.title : (answers.title ?? ''),
    area: row.location?.name ?? null,
    distanceKm: row.distanceKm?.toNumber() ?? null,
    rentRwf: live ? row.rentRwf : (answers.rentRwf ?? null),
    availability: row.availability,
    reviewStatus: row.reviewStatus,
    reviewNote: row.reviewNote,
    coverUrl: cover?.url ?? null,
    hasUnsubmittedChanges: row.draft !== null,
  };
}

function toInquiry(row: InquiryRow): LandlordInquiry {
  const last = row.messages.at(-1);

  return {
    id: row.id,
    student: row.student.fullName,
    property: { id: row.property.id, title: row.property.title },
    status: row.status,
    lastMessage: {
      body: last?.body ?? '',
      fromLandlord: last?.senderId === row.property.landlordId,
    },
    createdAt: row.createdAt.toISOString(),
  };
}

function toThread(row: InquiryRow): InquiryThread {
  return {
    ...toInquiry(row),
    messages: row.messages.map(({ id, body, senderId, createdAt }) => ({
      id,
      body,
      fromLandlord: senderId === row.property.landlordId,
      createdAt: createdAt.toISOString(),
    })),
  };
}

function filterWhere(filter: LandlordFilter): Prisma.PropertyWhereInput {
  if (filter === 'pending') return { reviewStatus: 'PENDING' };
  if (filter === 'all') return {};
  const availability = filter === 'available' ? 'AVAILABLE' : 'OCCUPIED';
  return { availability, reviewStatus: { not: 'DRAFT' } };
}

const INQUIRY_STATUS: Record<Exclude<InquiryFilter, 'all'>, InquiryStatus> = {
  new: 'NEW',
  handled: 'HANDLED',
};

function ownedProperty(req: Request) {
  return { id: req.params.id as string, landlordId: req.user!.id, deletedAt: null };
}

async function findOwned(req: Request) {
  const row = await prisma.property.findFirst({
    where: ownedProperty(req),
    include: PROPERTY_INCLUDE,
  });
  if (!row) throw listingNotFound();
  return row;
}

async function findInquiry(req: Request) {
  const row = await prisma.inquiry.findFirst({
    where: { id: req.params.id as string, property: { landlordId: req.user!.id } },
    include: INQUIRY_INCLUDE,
  });
  if (!row) throw inquiryNotFound();
  return row;
}

function propertyCounts(landlordId: string) {
  const where = { landlordId, deletedAt: null };
  return Promise.all(
    (['all', 'available', 'occupied', 'pending'] as const).map((filter) =>
      prisma.property.count({ where: { ...where, ...filterWhere(filter) } }),
    ),
  );
}

// Created per app, so tests can keep uploaded files in memory.
export function landlordRouter(storage: Storage) {
  const router = Router();

  router.use(requireAuth, requireRole('LANDLORD'));

  router.get('/summary', async (req, res) => {
    const landlordId = req.user!.id;
    const [[total, available, occupied, pending], newInquiries, inquiries, properties] =
      await Promise.all([
        propertyCounts(landlordId),
        prisma.inquiry.count({ where: { property: { landlordId }, status: 'NEW' } }),
        prisma.inquiry.findMany({
          where: { property: { landlordId } },
          include: INQUIRY_INCLUDE,
          orderBy: { createdAt: 'desc' },
          take: SUMMARY_INQUIRIES,
        }),
        prisma.property.findMany({
          where: { landlordId, deletedAt: null },
          include: PROPERTY_INCLUDE,
          orderBy: NEWEST_FIRST,
          take: SUMMARY_PROPERTIES,
        }),
      ]);

    const body: LandlordSummary = {
      total: total as number,
      available: available as number,
      occupied: occupied as number,
      pending: pending as number,
      newInquiries,
      recentInquiries: inquiries.map(toInquiry),
      properties: properties.map(toListItem),
    };
    res.json(body);
  });

  router.get('/properties', async (req, res) => {
    const { page, pageSize, filter } = parseQuery(landlordPropertiesQuerySchema, req.query);
    const landlordId = req.user!.id;
    const where = { landlordId, deletedAt: null, ...filterWhere(filter) };

    const [rows, total, [all, available, occupied, pending]] = await Promise.all([
      prisma.property.findMany({
        where,
        include: PROPERTY_INCLUDE,
        orderBy: NEWEST_FIRST,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.property.count({ where }),
      propertyCounts(landlordId),
    ]);

    const body: LandlordPropertyList = {
      items: rows.map(toListItem),
      total,
      page,
      pageSize,
      counts: {
        all: all as number,
        available: available as number,
        occupied: occupied as number,
        pending: pending as number,
      },
    };
    res.json(body);
  });

  router.post('/properties', validate(listingPatchSchema), async (req, res) => {
    const row = await prisma.property.create({
      data: {
        landlordId: req.user!.id,
        title: '',
        description: '',
        landmark: '',
        rentRwf: 0,
        water: EMPTY_DRAFT.water,
        electricity: EMPTY_DRAFT.electricity,
        security: EMPTY_DRAFT.security,
        bathroom: EMPTY_DRAFT.bathroom,
        selfContained: EMPTY_DRAFT.selfContained,
        draft: req.body as ListingPatch as Prisma.InputJsonObject,
      },
      include: PROPERTY_INCLUDE,
    });
    res.status(201).json(toForm(row));
  });

  router.get('/properties/:id', async (req, res) => {
    res.json(toForm(await findOwned(req)));
  });

  router.patch('/properties/:id', validate(listingPatchSchema), async (req, res) => {
    const row = await findOwned(req);
    const draft = { ...storedDraft(row), ...(req.body as ListingPatch) };
    const updated = await prisma.property.update({
      where: { id: row.id },
      data: { draft: draft as Prisma.InputJsonObject },
      include: PROPERTY_INCLUDE,
    });
    res.json(toForm(updated));
  });

  router.post('/properties/:id/photos', uploadPhotos, async (req, res) => {
    const row = await findOwned(req);
    const files = (req.files ?? []) as Express.Multer.File[];
    if (files.length === 0) throw photoError('Choose at least one photo to add.');

    const { photos } = arrangedPhotos(row);
    if (photos.length + files.length > MAX_PHOTOS) {
      throw photoError(`You can add up to ${MAX_PHOTOS} photos.`);
    }

    // Every file is checked first, so one bad file does not leave the others half added.
    const checked = files.map(({ buffer }) => {
      const extension = photoExtension(buffer);
      if (!extension) throw photoError('Use JPG, PNG or WebP photos.');
      return { buffer, extension };
    });

    const highest = Math.max(-1, ...row.photos.map(({ position }) => position));
    for (const [index, { buffer, extension }] of checked.entries()) {
      const url = await storage.save(buffer, extension);
      await prisma.propertyPhoto.create({
        data: { propertyId: row.id, url, position: highest + index + 1, pendingAdd: true },
      });
    }
    const draft = storedDraft(row) as Prisma.InputJsonObject;
    await prisma.property.update({ where: { id: row.id }, data: { draft } });
    res.status(201).json(toForm(await findOwned(req)));
  });

  router.patch('/properties/:id/photos', validate(photoArrangementSchema), async (req, res) => {
    const row = await findOwned(req);
    const arrangement = req.body as PhotoArrangement;
    const { photos } = arrangedPhotos(row);
    const known = new Set(photos.map(({ id }) => id));

    if (!known.has(arrangement.coverId) || arrangement.order.some((id) => !known.has(id))) {
      throw photoError('One of these photos has been removed. Refresh the page and try again.');
    }

    const draft = { ...storedDraft(row), photos: arrangement };
    const updated = await prisma.property.update({
      where: { id: row.id },
      data: { draft: draft as unknown as Prisma.InputJsonObject },
      include: PROPERTY_INCLUDE,
    });
    res.json(toForm(updated));
  });

  async function setPhotoRemoved(req: Request, pendingRemove: boolean) {
    const row = await findOwned(req);
    const photo = row.photos.find(({ id }) => id === req.params.photoId);
    if (!photo) throw new AppError(404, 'PHOTO_NOT_FOUND', 'This photo could not be found.');

    await prisma.propertyPhoto.update({ where: { id: photo.id }, data: { pendingRemove } });
    // Touches updatedAt, so a removed photo also counts as a change to submit.
    const draft = storedDraft(row) as Prisma.InputJsonObject;
    await prisma.property.update({ where: { id: row.id }, data: { draft } });
    return toForm(await findOwned(req));
  }

  router.delete('/properties/:id/photos/:photoId', async (req, res) => {
    res.json(await setPhotoRemoved(req, true));
  });

  router.post('/properties/:id/photos/:photoId/restore', async (req, res) => {
    res.json(await setPhotoRemoved(req, false));
  });

  router.post('/properties/:id/submit', async (req, res) => {
    const row = await findOwned(req);
    if (row.reviewStatus === 'REMOVED') {
      throw new AppError(
        409,
        'LISTING_REMOVED',
        'An administrator removed this listing, so it cannot be submitted again.',
      );
    }

    const values = formValues(row);
    const { photos, coverId } = arrangedPhotos(row);
    const errors = listingErrors(values, photos.length);
    if (Object.keys(errors).length > 0) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Please check the highlighted fields.', errors);
    }

    const location = await prisma.location.findUnique({ where: { id: values.locationId! } });
    if (!location) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Please check the highlighted fields.', {
        locationId: 'Please choose the neighbourhood.',
      });
    }

    const removed = row.photos.filter(({ pendingRemove }) => pendingRemove);
    const moved = location.id !== row.locationId || row.distanceKm === null;

    const updated = await prisma.$transaction(async (tx) => {
      await tx.propertyPhoto.deleteMany({ where: { propertyId: row.id, pendingRemove: true } });
      for (const [position, { id }] of photos.entries()) {
        await tx.propertyPhoto.update({
          where: { id },
          data: { position, isCover: id === coverId, pendingAdd: false },
        });
      }
      await tx.activityLog.create({
        data: {
          actorId: req.user!.id,
          action: 'LISTING_SUBMITTED',
          targetType: 'Property',
          targetId: row.id,
          text: `${req.user!.fullName} submitted ${values.title.trim()}`,
        },
      });
      return tx.property.update({
        where: { id: row.id },
        data: {
          title: values.title.trim(),
          type: values.type,
          rooms: values.rooms,
          description: values.description.trim(),
          locationId: location.id,
          distanceKm: moved ? location.distanceKm : row.distanceKm,
          landmark: values.landmark.trim(),
          address: values.address.trim() || null,
          pinX: values.pin?.x ?? null,
          pinY: values.pin?.y ?? null,
          rentRwf: values.rentRwf!,
          availability: values.availability,
          water: values.water,
          electricity: values.electricity,
          security: values.security,
          bathroom: values.bathroom,
          selfContained: values.selfContained,
          reviewStatus: 'PENDING',
          reviewNote: null,
          submittedAt: new Date(),
          draft: Prisma.DbNull,
        },
        include: PROPERTY_INCLUDE,
      });
    });

    await Promise.all(removed.map(({ url }) => storage.remove(url)));
    res.json(toListItem(updated));
  });

  router.patch(
    '/properties/:id/availability',
    validate(availabilityInputSchema),
    async (req, res) => {
      const row = await findOwned(req);
      if (row.locationId === null) {
        throw new AppError(
          409,
          'NOT_SUBMITTED',
          'Finish and submit this listing before changing its availability.',
        );
      }

      const { availability } = req.body as { availability: ListingDraft['availability'] };
      // An open wizard must not put the old value back on submit.
      const draft = row.draft === null ? undefined : { ...storedDraft(row), availability };
      await prisma.property.update({
        where: { id: row.id },
        data: { availability, draft: draft as Prisma.InputJsonObject | undefined },
      });

      const body: AvailabilityResult = { availability, previous: row.availability };
      res.json(body);
    },
  );

  router.delete('/properties/:id', async (req, res) => {
    const row = await findOwned(req);
    await prisma.property.update({ where: { id: row.id }, data: { deletedAt: new Date() } });
    res.json({ ok: true });
  });

  router.post('/properties/:id/restore', async (req, res) => {
    const { count } = await prisma.property.updateMany({
      where: { id: req.params.id, landlordId: req.user!.id, deletedAt: { not: null } },
      data: { deletedAt: null },
    });
    if (count === 0) throw listingNotFound();
    res.json({ ok: true });
  });

  router.get('/inquiries', async (req, res) => {
    const { page, pageSize, status } = parseQuery(landlordInquiriesQuerySchema, req.query);
    const owned = { property: { landlordId: req.user!.id } };
    const where = status === 'all' ? owned : { ...owned, status: INQUIRY_STATUS[status] };

    const [rows, total, fresh, handled] = await Promise.all([
      prisma.inquiry.findMany({
        where,
        include: INQUIRY_INCLUDE,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.inquiry.count({ where }),
      prisma.inquiry.count({ where: { ...owned, status: 'NEW' } }),
      prisma.inquiry.count({ where: { ...owned, status: 'HANDLED' } }),
    ]);

    const body: LandlordInquiryList = {
      items: rows.map(toInquiry),
      total,
      page,
      pageSize,
      counts: { all: fresh + handled, new: fresh, handled },
    };
    res.json(body);
  });

  router.get('/inquiries/:id', async (req, res) => {
    res.json(toThread(await findInquiry(req)));
  });

  router.post('/inquiries/:id/messages', validate(replySchema), async (req, res) => {
    const inquiry = await findInquiry(req);
    const { message } = req.body as ReplyInput;

    await prisma.$transaction([
      prisma.inquiryMessage.create({
        data: { inquiryId: inquiry.id, senderId: req.user!.id, body: message },
      }),
      prisma.inquiry.update({ where: { id: inquiry.id }, data: { status: 'HANDLED' } }),
    ]);
    res.status(201).json(toThread(await findInquiry(req)));
  });

  router.patch('/inquiries/:id', validate(inquiryStatusInputSchema), async (req, res) => {
    const inquiry = await findInquiry(req);
    const { status } = req.body as { status: InquiryStatus };

    await prisma.inquiry.update({ where: { id: inquiry.id }, data: { status } });
    res.json(toThread(await findInquiry(req)));
  });

  return router;
}
