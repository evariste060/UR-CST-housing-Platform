import type { ListingForm, ListingPatch } from '@urcst/shared';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../db';
import {
  clearDatabase,
  createListing,
  createLocation,
  createTestApp,
  createUser,
  PASSWORD,
} from '../test/helpers';

beforeEach(clearDatabase);

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);
const JPG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]);

const ANSWERS: ListingPatch = {
  title: 'Kiyovu Sunny Room',
  type: 'SINGLE',
  rooms: 1,
  description: 'A bright room in a quiet compound, with water included.',
  landmark: 'Near the roundabout',
  rentRwf: 80000,
  availability: 'AVAILABLE',
};

async function setUp() {
  const { app, files } = createTestApp();
  const owner = await createUser({ email: 'landlord@example.com', role: 'LANDLORD' });
  const agent = request.agent(app);
  await agent.post('/api/auth/login').send({ email: owner.email, password: PASSWORD });
  return { app, files, owner, agent };
}

type Agent = Awaited<ReturnType<typeof setUp>>['agent'];

async function startDraft(agent: Agent, answers: ListingPatch = {}) {
  const { body } = await agent.post('/api/landlord/properties').send(answers);
  return body as ListingForm;
}

function addPhotos(agent: Agent, id: string, ...files: Buffer[]) {
  const call = agent.post(`/api/landlord/properties/${id}/photos`);
  files.forEach((file, index) => call.attach('photos', file, `photo-${index}.png`));
  return call;
}

async function readyDraft(agent: Agent) {
  const location = await createLocation();
  const draft = await startDraft(agent, { ...ANSWERS, locationId: location.id });
  await addPhotos(agent, draft.id, PNG);
  return draft;
}

describe('landlord routes', () => {
  it.each([
    ['get', '/api/landlord/summary'],
    ['get', '/api/landlord/properties'],
    ['post', '/api/landlord/properties'],
    ['get', '/api/landlord/inquiries'],
  ] as const)('%s %s needs a login', async (method, path) => {
    const { app } = createTestApp();

    expect((await request(app)[method](path)).status).toBe(401);
  });

  it('are closed to students', async () => {
    const { app } = await setUp();
    const student = await createUser({ email: 'student@example.com' });
    const agent = request.agent(app);
    await agent.post('/api/auth/login').send({ email: student.email, password: PASSWORD });

    expect((await agent.get('/api/landlord/summary')).status).toBe(403);
  });

  it("never reach another landlord's listing or inquiry", async () => {
    const { agent } = await setUp();
    const other = await createUser({ email: 'other@example.com', role: 'LANDLORD' });
    const listing = await createListing(other.id);
    const student = await createUser({ email: 'student@example.com' });
    const inquiry = await prisma.inquiry.create({
      data: { propertyId: listing.id, studentId: student.id },
    });
    const path = `/api/landlord/properties/${listing.id}`;

    expect((await agent.get(path)).status).toBe(404);
    expect((await agent.patch(path).send({ title: 'Mine now' })).status).toBe(404);
    expect((await agent.delete(path)).status).toBe(404);
    expect((await agent.post(`${path}/submit`)).status).toBe(404);
    expect((await agent.post(`${path}/restore`)).status).toBe(404);
    expect(
      (await agent.patch(`${path}/availability`).send({ availability: 'OCCUPIED' })).status,
    ).toBe(404);
    expect((await agent.get(`/api/landlord/inquiries/${inquiry.id}`)).status).toBe(404);
    expect(
      (await agent.post(`/api/landlord/inquiries/${inquiry.id}/messages`).send({ message: 'Hi' }))
        .status,
    ).toBe(404);
  });
});

describe('drafts', () => {
  it('keeps half-finished answers and returns them', async () => {
    const { agent } = await setUp();
    const { id } = await startDraft(agent, { title: 'Ki' });

    await agent.patch(`/api/landlord/properties/${id}`).send({ rentRwf: 5 });
    const { body } = await agent.get(`/api/landlord/properties/${id}`);

    expect(body.values).toMatchObject({ title: 'Ki', rentRwf: 5, water: true });
    expect(body.reviewStatus).toBe('DRAFT');
  });

  it('never show to students', async () => {
    const { app, agent } = await setUp();
    const { id } = await startDraft(agent, ANSWERS);

    expect((await request(app).get(`/api/properties/${id}`)).status).toBe(404);
    expect((await request(app).get('/api/properties')).body.total).toBe(0);
  });

  it('do not change an approved listing until it is submitted', async () => {
    const { app, agent, owner } = await setUp();
    const listing = await createListing(owner.id);

    await agent.patch(`/api/landlord/properties/${listing.id}`).send({ title: 'A new title' });

    expect((await request(app).get(`/api/properties/${listing.id}`)).body.title).toBe(
      listing.title,
    );
    const { body } = await agent.get(`/api/landlord/properties/${listing.id}`);
    expect(body.values.title).toBe('A new title');
  });

  it('rejects answers of the wrong shape', async () => {
    const { agent } = await setUp();

    expect((await agent.post('/api/landlord/properties').send({ rooms: 99 })).status).toBe(400);
  });
});

describe('photos', () => {
  it('accepts real images and hides them from students until submit', async () => {
    const { app, agent, owner, files } = await setUp();
    const listing = await createListing(owner.id);

    const { body, status } = await addPhotos(agent, listing.id, PNG, JPG);

    expect(status).toBe(201);
    expect(body.photos).toHaveLength(3);
    expect(files.size).toBe(2);
    const { body: publicView } = await request(app).get(`/api/properties/${listing.id}`);
    expect(publicView.photos).toHaveLength(1);
  });

  it('refuses a file that only claims to be an image', async () => {
    const { agent, files } = await setUp();
    const { id } = await startDraft(agent);

    const { status, body } = await addPhotos(agent, id, PNG, Buffer.from('<svg></svg>'));

    expect(status).toBe(400);
    expect(body.error.fields.photos).toBe('Use JPG, PNG or WebP photos.');
    expect(files.size).toBe(0);
  });

  it('stops at ten photos', async () => {
    const { agent } = await setUp();
    const { id } = await startDraft(agent);
    await addPhotos(agent, id, ...Array<Buffer>(10).fill(PNG));

    const { status, body } = await addPhotos(agent, id, PNG);

    expect(status).toBe(400);
    expect(body.error.fields.photos).toBe('You can add up to 10 photos.');
  });

  it('refuses a photo over 5 MB', async () => {
    const { agent } = await setUp();
    const { id } = await startDraft(agent);

    const { status, body } = await addPhotos(agent, id, Buffer.alloc(5 * 1024 * 1024 + 1));

    expect(status).toBe(400);
    expect(body.error.fields.photos).toContain('5 MB');
  });

  it('reorders, sets the cover and puts a removed photo back on Undo', async () => {
    const { agent } = await setUp();
    const { id } = await startDraft(agent);
    const { body: added } = await addPhotos(agent, id, PNG, JPG);
    const [first, second] = added.photos as { id: string }[];
    const path = `/api/landlord/properties/${id}/photos`;

    const { body: arranged } = await agent
      .patch(path)
      .send({ order: [second!.id, first!.id], coverId: second!.id });
    expect(arranged.photos.map((photo: { id: string }) => photo.id)).toEqual([
      second!.id,
      first!.id,
    ]);
    expect(arranged.coverId).toBe(second!.id);

    const { body: removed } = await agent.delete(`${path}/${second!.id}`);
    expect(removed.photos).toHaveLength(1);
    expect(removed.coverId).toBe(first!.id);

    const { body: restored } = await agent.post(`${path}/${second!.id}/restore`);
    expect(restored.coverId).toBe(second!.id);
  });
});

describe('submitting', () => {
  it('names every problem instead of saving', async () => {
    const { agent } = await setUp();
    const { id } = await startDraft(agent, { title: 'Ab' });

    const { status, body } = await agent.post(`/api/landlord/properties/${id}/submit`);

    expect(status).toBe(400);
    expect(body.error.fields).toMatchObject({
      title: 'Use at least 5 characters so students can recognise it.',
      type: 'Please choose the accommodation type.',
      description: 'Please write at least 30 characters (now 0).',
      locationId: 'Please choose the neighbourhood.',
      rentRwf: 'Please enter the monthly rent in RWF.',
      photos: expect.stringContaining('at least one photo') as string,
    });
  });

  it('copies the answers to the listing and sets Pending', async () => {
    const { agent } = await setUp();
    const { id } = await readyDraft(agent);

    const { status, body } = await agent.post(`/api/landlord/properties/${id}/submit`);

    expect(status).toBe(200);
    expect(body).toMatchObject({
      title: ANSWERS.title,
      reviewStatus: 'PENDING',
      area: 'Kiyovu',
      distanceKm: 1,
      hasUnsubmittedChanges: false,
    });
    const photo = await prisma.propertyPhoto.findFirstOrThrow({ where: { propertyId: id } });
    expect(photo).toMatchObject({ pendingAdd: false, isCover: true });
  });

  it('sends an edited approved listing back to Pending and hides it from students', async () => {
    const { app, agent, owner } = await setUp();
    const listing = await createListing(owner.id, { reviewNote: 'An old note' });
    const path = `/api/landlord/properties/${listing.id}`;

    await agent.patch(path).send({ title: 'A better title' });
    const { body } = await agent.post(`${path}/submit`);

    expect(body).toMatchObject({
      title: 'A better title',
      reviewStatus: 'PENDING',
      reviewNote: null,
    });
    expect((await request(app).get(`/api/properties/${listing.id}`)).status).toBe(404);
  });

  it('deletes removed photos, but leaves the demo files alone', async () => {
    const { agent, owner, files } = await setUp();
    const listing = await createListing(owner.id);
    const { body } = await addPhotos(agent, listing.id, PNG);
    const [demo, upload] = body.photos as { id: string; url: string }[];
    const path = `/api/landlord/properties/${listing.id}`;

    await agent.delete(`${path}/photos/${demo!.id}`);
    await agent.post(`${path}/submit`);

    expect(await prisma.propertyPhoto.count({ where: { propertyId: listing.id } })).toBe(1);
    expect(files.has(upload!.url)).toBe(true);
  });

  it('refuses a listing an administrator removed', async () => {
    const { agent, owner } = await setUp();
    const listing = await createListing(owner.id, { reviewStatus: 'REMOVED' });

    const { status } = await agent.post(`/api/landlord/properties/${listing.id}/submit`);

    expect(status).toBe(409);
  });
});

describe('availability and deleting', () => {
  it('returns the previous value for Undo and leaves the review status alone', async () => {
    const { agent, owner } = await setUp();
    const listing = await createListing(owner.id);
    const path = `/api/landlord/properties/${listing.id}/availability`;

    const { body } = await agent.patch(path).send({ availability: 'OCCUPIED' });
    expect(body).toEqual({ availability: 'OCCUPIED', previous: 'AVAILABLE' });

    await agent.patch(path).send({ availability: body.previous as string });
    const row = await prisma.property.findUniqueOrThrow({ where: { id: listing.id } });
    expect(row).toMatchObject({ availability: 'AVAILABLE', reviewStatus: 'APPROVED' });
  });

  it('does not let an open wizard undo an availability change', async () => {
    const { agent, owner } = await setUp();
    const listing = await createListing(owner.id);
    const path = `/api/landlord/properties/${listing.id}`;

    await agent.patch(path).send({ title: 'A better title' });
    await agent.patch(`${path}/availability`).send({ availability: 'OCCUPIED' });
    await agent.post(`${path}/submit`);

    const row = await prisma.property.findUniqueOrThrow({ where: { id: listing.id } });
    expect(row.availability).toBe('OCCUPIED');
  });

  it('has no availability to change on an unsubmitted draft', async () => {
    const { agent } = await setUp();
    const { id } = await startDraft(agent);

    const { status } = await agent
      .patch(`/api/landlord/properties/${id}/availability`)
      .send({ availability: 'OCCUPIED' });

    expect(status).toBe(409);
  });

  it('hides a deleted listing, and Undo brings it back as it was', async () => {
    const { app, agent, owner } = await setUp();
    const listing = await createListing(owner.id);
    const path = `/api/landlord/properties/${listing.id}`;

    await agent.delete(path);
    expect((await request(app).get(`/api/properties/${listing.id}`)).status).toBe(404);
    expect((await agent.get('/api/landlord/properties')).body.total).toBe(0);

    await agent.post(`${path}/restore`);
    expect((await request(app).get(`/api/properties/${listing.id}`)).status).toBe(200);
  });
});

describe('lists', () => {
  it('counts each tab and filters by it', async () => {
    const { agent, owner } = await setUp();
    await createListing(owner.id);
    await createListing(owner.id, { availability: 'OCCUPIED' });
    await createListing(owner.id, { reviewStatus: 'PENDING' });
    await startDraft(agent, { title: 'A draft' });

    const { body } = await agent.get('/api/landlord/properties');
    expect(body.counts).toEqual({
      all: 4,
      available: 2,
      occupied: 1,
      pending: 1,
      changes: 0,
      drafts: 1,
    });

    const { body: pending } = await agent.get('/api/landlord/properties?filter=pending');
    expect(pending.items).toHaveLength(1);
  });

  it('shows a draft by the title typed so far', async () => {
    const { agent } = await setUp();
    await startDraft(agent, { title: 'A draft' });

    const { body } = await agent.get('/api/landlord/properties');

    expect(body.items[0]).toMatchObject({
      title: 'A draft',
      reviewStatus: 'DRAFT',
      area: null,
      hasUnsubmittedChanges: true,
    });
  });

  it('pages through properties', async () => {
    const { agent, owner } = await setUp();
    await createListing(owner.id);
    await createListing(owner.id);

    const { body } = await agent.get('/api/landlord/properties?page=2&pageSize=1');

    expect(body).toMatchObject({ total: 2, page: 2, pageSize: 1 });
    expect(body.items).toHaveLength(1);
  });

  it('summarises totals and recent inquiries', async () => {
    const { agent, owner } = await setUp();
    const listing = await createListing(owner.id);
    await createListing(owner.id, { availability: 'OCCUPIED' });
    const student = await createUser({ email: 'student@example.com' });
    await prisma.inquiry.create({
      data: {
        propertyId: listing.id,
        studentId: student.id,
        messages: { create: { senderId: student.id, body: 'Is it free?' } },
      },
    });

    const { body } = await agent.get('/api/landlord/summary');

    expect(body).toMatchObject({
      total: 2,
      available: 1,
      occupied: 1,
      pending: 0,
      changes: 0,
      drafts: 0,
      newInquiries: 1,
    });
    expect(body.properties[0].updatedAt).toEqual(expect.any(String));
    expect(body.recentInquiries[0]).toMatchObject({
      student: 'Test Person',
      status: 'NEW',
      lastMessage: { body: 'Is it free?', fromLandlord: false },
    });
  });
});

describe('GET /api/landlord/summary attention counts', () => {
  it('counts listings that need changes and unfinished drafts, and lists the latest update first', async () => {
    const { agent, owner } = await setUp();
    await createListing(owner.id, { reviewStatus: 'CHANGES_REQUESTED' });
    await createListing(owner.id, { reviewStatus: 'DRAFT' });
    const latest = await createListing(owner.id);
    await prisma.property.update({ where: { id: latest.id }, data: { rentRwf: 70000 } });

    const { body } = await agent.get('/api/landlord/summary');
    const changes = await agent.get('/api/landlord/properties?filter=changes');

    expect(body).toMatchObject({ changes: 1, drafts: 1 });
    expect(body.properties[0].id).toBe(latest.id);
    expect(changes.body.total).toBe(1);
    expect(changes.body.counts).toMatchObject({ changes: 1, drafts: 1 });
  });
});

describe('GET /api/landlord/properties search, filters, sort and pages', () => {
  it('combines search, availability, listing status and sort, and pages the result', async () => {
    const { agent, owner } = await setUp();
    const older = await createListing(owner.id, { title: 'Garden Room' });
    await createListing(owner.id, { title: 'Corner Room', availability: 'OCCUPIED' });
    await createListing(owner.id, { title: 'Muhima Studio', reviewStatus: 'PENDING' });
    const newer = await createListing(owner.id, { title: 'Hill Room' });
    await prisma.property.update({ where: { id: newer.id }, data: { rentRwf: 71000 } });

    const rooms = await agent.get('/api/landlord/properties?q=room');
    const available = await agent.get('/api/landlord/properties?q=ROOM&availability=available');
    const pending = await agent.get('/api/landlord/properties?status=PENDING');
    const oldest = await agent.get('/api/landlord/properties?q=room&sort=updated-asc&pageSize=1');
    const second = await agent.get('/api/landlord/properties?q=room&pageSize=2&page=2');

    expect(rooms.body.total).toBe(3);
    expect(rooms.body.items[0].id).toBe(newer.id);
    expect(available.body.total).toBe(2);
    expect(pending.body.items.map((item: { title: string }) => item.title)).toEqual([
      'Muhima Studio',
    ]);
    expect(oldest.body.items[0].id).toBe(older.id);
    expect(second.body).toMatchObject({ total: 3, page: 2 });
    expect(second.body.items).toHaveLength(1);
    expect(rooms.body.counts).toMatchObject({ all: 4, pending: 1 });
  });

  it('rejects an unknown listing status', async () => {
    const { agent } = await setUp();

    expect((await agent.get('/api/landlord/properties?status=VERIFIED')).status).toBe(400);
  });
});

describe('inquiries', () => {
  async function withInquiry() {
    const context = await setUp();
    const listing = await createListing(context.owner.id);
    const student = await createUser({ email: 'student@example.com' });
    const inquiry = await prisma.inquiry.create({
      data: {
        propertyId: listing.id,
        studentId: student.id,
        messages: { create: { senderId: student.id, body: 'Is it free?' } },
      },
    });
    return { ...context, inquiry };
  }
  it('searches by student name or property title and shows property details on the thread', async () => {
    const { agent, inquiry } = await withInquiry();

    const byName = await agent.get('/api/landlord/inquiries?q=test%20person');
    const none = await agent.get('/api/landlord/inquiries?q=nobody');
    const thread = await agent.get(`/api/landlord/inquiries/${inquiry.id}`);

    expect(byName.body.total).toBe(1);
    expect(byName.body.items[0].lastMessage.createdAt).toEqual(expect.any(String));
    expect(none.body.total).toBe(0);
    expect(thread.body.property).toMatchObject({
      reviewStatus: 'APPROVED',
      rentRwf: expect.any(Number),
    });
    expect(thread.body).not.toHaveProperty('studentEmail');
  });

  it('filters by status and counts each tab', async () => {
    const { agent } = await withInquiry();

    const { body } = await agent.get('/api/landlord/inquiries?status=handled');

    expect(body.items).toEqual([]);
    expect(body.counts).toEqual({ all: 1, new: 1, handled: 0 });
  });

  it('marks an inquiry handled when the landlord replies', async () => {
    const { agent, inquiry } = await withInquiry();

    const { status, body } = await agent
      .post(`/api/landlord/inquiries/${inquiry.id}/messages`)
      .send({ message: 'Yes, come on Saturday.' });

    expect(status).toBe(201);
    expect(body.status).toBe('HANDLED');
    expect(body.messages.at(-1)).toMatchObject({
      body: 'Yes, come on Saturday.',
      fromLandlord: true,
    });
  });

  it('asks for a reply when it is blank', async () => {
    const { agent, inquiry } = await withInquiry();

    const { status, body } = await agent
      .post(`/api/landlord/inquiries/${inquiry.id}/messages`)
      .send({ message: '   ' });

    expect(status).toBe(400);
    expect(body.error.fields.message).toBe('Please write a reply.');
  });

  it('can be marked new again', async () => {
    const { agent, inquiry } = await withInquiry();
    const path = `/api/landlord/inquiries/${inquiry.id}`;

    await agent.patch(path).send({ status: 'HANDLED' });
    const { body } = await agent.patch(path).send({ status: 'NEW' });

    expect(body.status).toBe('NEW');
  });
});

describe('contact preferences', () => {
  it('reads the choices the landlord saved', async () => {
    const { agent } = await setUp();
    await agent
      .patch('/api/me/contact-preferences')
      .send({ allowPhone: false, allowWhatsapp: true, allowInApp: true });

    const { body } = await agent.get('/api/me/contact-preferences');

    expect(body).toEqual({ allowPhone: false, allowWhatsapp: true, allowInApp: true });
  });
});
