import type { HistoryResponse } from '@urcst/shared';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../db';
import { clearDatabase, createListing, createTestApp, createUser, PASSWORD } from '../test/helpers';

beforeEach(clearDatabase);

async function setUp() {
  const { app } = createTestApp();
  const owner = await createUser({ email: 'landlord@example.com', role: 'LANDLORD' });
  const student = await createUser({ email: 'student@example.com' });
  const agent = request.agent(app);
  await agent.post('/api/auth/login').send({ email: student.email, password: PASSWORD });
  return { app, owner, student, agent };
}

describe('student routes', () => {
  it.each([
    ['get', '/api/me/saved'],
    ['get', '/api/me/saved/ids'],
    ['post', '/api/me/saved/p1'],
    ['delete', '/api/me/saved/p1'],
    ['post', '/api/me/saved/merge'],
    ['get', '/api/me/history'],
    ['delete', '/api/me/history'],
    ['post', '/api/me/history/restore'],
    ['post', '/api/me/searches'],
    ['get', '/api/me/inquiries'],
    ['get', '/api/me/inquiries/some-id'],
    ['post', '/api/me/inquiries/some-id/messages'],
  ] as const)('%s %s needs a login', async (method, path) => {
    const { app } = createTestApp();

    expect((await request(app)[method](path).send({})).status).toBe(401);
  });

  it('are closed to landlords', async () => {
    const { app, owner } = await setUp();
    const agent = request.agent(app);
    await agent.post('/api/auth/login').send({ email: owner.email, password: PASSWORD });

    expect((await agent.get('/api/me/saved')).status).toBe(403);
  });

  it('leave the account routes working', async () => {
    const { agent } = await setUp();

    expect((await agent.patch('/api/me').send({ fullName: 'New' })).status).toBe(200);
  });
});

describe('saved properties', () => {
  it('saves once however many times it is asked', async () => {
    const { agent, owner, student } = await setUp();
    const listing = await createListing(owner.id);

    expect((await agent.post(`/api/me/saved/${listing.id}`)).status).toBe(201);
    expect((await agent.post(`/api/me/saved/${listing.id}`)).status).toBe(201);

    expect(await prisma.savedProperty.count({ where: { userId: student.id } })).toBe(1);
  });

  it('lists saved rooms, with their ids', async () => {
    const { agent, owner } = await setUp();
    const listing = await createListing(owner.id, { title: 'Saved Room' });
    await agent.post(`/api/me/saved/${listing.id}`);

    const list = await agent.get('/api/me/saved');
    const ids = await agent.get('/api/me/saved/ids');

    expect(list.body).toMatchObject({ total: 1, page: 1, pageSize: 20 });
    expect(list.body.items[0].title).toBe('Saved Room');
    expect(ids.body.ids).toEqual([listing.id]);
  });

  it('removes a saved room, and does not mind if it is already gone', async () => {
    const { agent, owner } = await setUp();
    const listing = await createListing(owner.id);
    await agent.post(`/api/me/saved/${listing.id}`);

    await agent.delete(`/api/me/saved/${listing.id}`);
    const again = await agent.delete(`/api/me/saved/${listing.id}`);

    expect(again.status).toBe(200);
    expect((await agent.get('/api/me/saved/ids')).body.ids).toEqual([]);
  });

  it('cannot save a listing students cannot see', async () => {
    const { agent, owner } = await setUp();
    const listing = await createListing(owner.id, { reviewStatus: 'PENDING' });

    expect((await agent.post(`/api/me/saved/${listing.id}`)).status).toBe(404);
  });

  it('hides a saved room once it is no longer approved', async () => {
    const { agent, owner } = await setUp();
    const listing = await createListing(owner.id);
    await agent.post(`/api/me/saved/${listing.id}`);

    await prisma.property.update({
      where: { id: listing.id },
      data: { reviewStatus: 'PENDING' },
    });

    expect((await agent.get('/api/me/saved')).body.total).toBe(0);
    expect((await agent.get('/api/me/saved/ids')).body.ids).toEqual([]);
  });

  it("keeps one student's list apart from another's", async () => {
    const { app, agent, owner } = await setUp();
    const listing = await createListing(owner.id);
    await agent.post(`/api/me/saved/${listing.id}`);
    const other = await createUser({ email: 'other@example.com' });
    const otherAgent = request.agent(app);
    await otherAgent.post('/api/auth/login').send({ email: other.email, password: PASSWORD });

    expect((await otherAgent.get('/api/me/saved')).body.total).toBe(0);
  });

  it('merges a guest list, skipping duplicates and hidden listings', async () => {
    const { agent, owner, student } = await setUp();
    const one = await createListing(owner.id);
    const two = await createListing(owner.id);
    const hidden = await createListing(owner.id, { reviewStatus: 'PENDING' });
    await agent.post(`/api/me/saved/${one.id}`);

    const res = await agent
      .post('/api/me/saved/merge')
      .send({ propertyIds: [one.id, two.id, hidden.id, 'no-such-id'] });

    expect(res.status).toBe(200);
    expect(await prisma.savedProperty.count({ where: { userId: student.id } })).toBe(2);
  });
});

describe('history', () => {
  it('shows the latest views and searches, newest first', async () => {
    const { agent, owner, student } = await setUp();
    const older = await createListing(owner.id, { title: 'Older' });
    const newer = await createListing(owner.id, { title: 'Newer' });
    await prisma.propertyView.createMany({
      data: [
        { userId: student.id, propertyId: older.id, viewedAt: new Date(2026, 9, 1) },
        { userId: student.id, propertyId: newer.id, viewedAt: new Date(2026, 9, 2) },
      ],
    });
    await agent.post('/api/me/searches').send({ label: 'Kiyovu', filters: { q: 'Kiyovu' } });

    const { body } = await agent.get('/api/me/history');

    expect((body as HistoryResponse).views.map(({ property }) => property.title)).toEqual([
      'Newer',
      'Older',
    ]);
    expect(body.searches[0]).toMatchObject({
      label: 'Kiyovu',
      filters: { q: 'Kiyovu', rooms: 'any' },
    });
  });

  it('leaves out rooms that are no longer approved', async () => {
    const { agent, owner, student } = await setUp();
    const listing = await createListing(owner.id, { reviewStatus: 'REMOVED' });
    await prisma.propertyView.create({ data: { userId: student.id, propertyId: listing.id } });

    expect((await agent.get('/api/me/history')).body.views).toEqual([]);
  });

  it('keeps one entry when the same search runs twice in a row', async () => {
    const { agent, student } = await setUp();

    await agent.post('/api/me/searches').send({ label: 'Kiyovu', filters: {} });
    await agent.post('/api/me/searches').send({ label: 'Kiyovu', filters: {} });

    expect(await prisma.searchHistory.count({ where: { userId: student.id } })).toBe(1);
  });

  it('keeps the latest 8 searches', async () => {
    const { agent, student } = await setUp();

    for (let number = 1; number <= 10; number++) {
      await agent.post('/api/me/searches').send({ label: `Search ${number}`, filters: {} });
    }

    expect(await prisma.searchHistory.count({ where: { userId: student.id } })).toBe(8);
  });

  it('rejects a search with bad filters', async () => {
    const { agent } = await setUp();

    const res = await agent
      .post('/api/me/searches')
      .send({ label: 'Bad', filters: { types: ['CASTLE'] } });

    expect(res.status).toBe(400);
  });

  it('clears views and searches but keeps saved rooms, and Undo restores them', async () => {
    const { agent, owner, student } = await setUp();
    const listing = await createListing(owner.id);
    await agent.get(`/api/properties/${listing.id}`);
    await agent.post(`/api/me/saved/${listing.id}`);
    await agent.post('/api/me/searches').send({ label: 'Kiyovu', filters: { q: 'Kiyovu' } });
    const { body: before } = (await agent.get('/api/me/history')) as { body: HistoryResponse };

    await agent.delete('/api/me/history');

    expect((await agent.get('/api/me/history')).body).toEqual({ views: [], searches: [] });
    expect(await prisma.savedProperty.count({ where: { userId: student.id } })).toBe(1);

    const res = await agent.post('/api/me/history/restore').send({
      views: before.views.map(({ property, viewedAt }) => ({
        propertyId: property.id,
        viewedAt,
      })),
      searches: before.searches.map(({ label, filters, createdAt }) => ({
        label,
        filters,
        createdAt,
      })),
    });

    expect(res.status).toBe(200);
    const after = (await agent.get('/api/me/history')).body as HistoryResponse;
    expect(after.views).toHaveLength(1);
    expect(after.searches[0]?.label).toBe('Kiyovu');
  });

  it('only clears the history of the person asking', async () => {
    const { agent, owner } = await setUp();
    const other = await createUser({ email: 'other@example.com' });
    const listing = await createListing(owner.id);
    await prisma.propertyView.create({ data: { userId: other.id, propertyId: listing.id } });

    await agent.delete('/api/me/history');

    expect(await prisma.propertyView.count({ where: { userId: other.id } })).toBe(1);
  });
});

describe('GET /api/me/inquiries', () => {
  it('shows only your own, with the last message and whether it was answered', async () => {
    const { agent, owner, student } = await setUp();
    const other = await createUser({ email: 'other@example.com' });
    const listing = await createListing(owner.id, { title: 'Nice Room' });
    await prisma.inquiry.create({
      data: {
        propertyId: listing.id,
        studentId: other.id,
        messages: { create: { senderId: other.id, body: 'Not yours to see.' } },
      },
    });
    const inquiry = await prisma.inquiry.create({
      data: {
        propertyId: listing.id,
        studentId: student.id,
        messages: { create: { senderId: student.id, body: 'Is it available?' } },
      },
    });

    const waiting = await agent.get('/api/me/inquiries');

    expect(waiting.body.total).toBe(1);
    expect(waiting.body.items[0]).toMatchObject({
      replied: false,
      lastMessage: { body: 'Is it available?', fromLandlord: false },
    });

    await prisma.inquiryMessage.create({
      data: { inquiryId: inquiry.id, senderId: owner.id, body: 'Yes, come and visit.' },
    });
    const answered = await agent.get('/api/me/inquiries');

    expect(answered.body.items[0]).toMatchObject({
      replied: true,
      lastMessage: { body: 'Yes, come and visit.', fromLandlord: true },
    });
  });
});

describe('GET /api/me/inquiries/:id', () => {
  it('shows the whole conversation in order, with the landlord named', async () => {
    const { agent, owner, student } = await setUp();
    const listing = await createListing(owner.id, { title: 'Nice Room' });
    const inquiry = await prisma.inquiry.create({
      data: {
        propertyId: listing.id,
        studentId: student.id,
        messages: { create: { senderId: student.id, body: 'Is it available?' } },
      },
    });
    await prisma.inquiryMessage.create({
      data: { inquiryId: inquiry.id, senderId: owner.id, body: 'Yes, come and visit.' },
    });

    const { status, body } = await agent.get(`/api/me/inquiries/${inquiry.id}`);

    expect(status).toBe(200);
    expect(body).toMatchObject({
      landlord: owner.fullName,
      replied: true,
      property: { id: listing.id, title: 'Nice Room' },
      messages: [
        { body: 'Is it available?', fromLandlord: false },
        { body: 'Yes, come and visit.', fromLandlord: true },
      ],
    });
  });

  it("does not show another student's conversation", async () => {
    const { agent, owner } = await setUp();
    const other = await createUser({ email: 'other@example.com' });
    const listing = await createListing(owner.id);
    const inquiry = await prisma.inquiry.create({
      data: {
        propertyId: listing.id,
        studentId: other.id,
        messages: { create: { senderId: other.id, body: 'Not yours to see.' } },
      },
    });

    const { status, body } = await agent.get(`/api/me/inquiries/${inquiry.id}`);

    expect(status).toBe(404);
    expect(JSON.stringify(body)).not.toContain('Not yours to see.');
  });
});

describe('POST /api/me/inquiries/:id/messages', () => {
  async function conversation() {
    const setup = await setUp();
    const listing = await createListing(setup.owner.id, { title: 'Nice Room' });
    const inquiry = await prisma.inquiry.create({
      data: {
        propertyId: listing.id,
        studentId: setup.student.id,
        status: 'HANDLED',
        messages: { create: { senderId: setup.student.id, body: 'Is it available?' } },
      },
    });
    return { ...setup, listing, inquiry };
  }

  it('adds the message, marks the inquiry new again and tells the landlord', async () => {
    const { agent, owner, inquiry } = await conversation();

    const { status, body } = await agent
      .post(`/api/me/inquiries/${inquiry.id}/messages`)
      .send({ message: '  Can I visit on Saturday?  ' });

    expect(status).toBe(201);
    expect(body.messages.at(-1)).toMatchObject({
      body: 'Can I visit on Saturday?',
      fromLandlord: false,
    });
    expect((await prisma.inquiry.findUniqueOrThrow({ where: { id: inquiry.id } })).status).toBe(
      'NEW',
    );
    const note = await prisma.notification.findFirstOrThrow({ where: { userId: owner.id } });
    expect(note).toMatchObject({
      type: 'INQUIRY_RECEIVED',
      link: `/landlord/inquiries?open=${inquiry.id}`,
    });
    expect(note.text).toContain('sent a new message about Nice Room.');
  });

  it('refuses an empty message', async () => {
    const { agent, inquiry } = await conversation();

    const { status } = await agent
      .post(`/api/me/inquiries/${inquiry.id}/messages`)
      .send({ message: '   ' });

    expect(status).toBe(400);
  });

  it("does not let a student write in another student's conversation", async () => {
    const { app, inquiry } = await conversation();
    const other = await createUser({ email: 'other@example.com' });
    const agent = request.agent(app);
    await agent.post('/api/auth/login').send({ email: other.email, password: PASSWORD });

    const { status } = await agent
      .post(`/api/me/inquiries/${inquiry.id}/messages`)
      .send({ message: 'Hello there' });

    expect(status).toBe(404);
    expect(await prisma.inquiryMessage.count()).toBe(1);
  });

  it('refuses new messages once the listing is removed', async () => {
    const { agent, listing, inquiry } = await conversation();
    await prisma.property.update({ where: { id: listing.id }, data: { deletedAt: new Date() } });

    const { status, body } = await agent
      .post(`/api/me/inquiries/${inquiry.id}/messages`)
      .send({ message: 'Still there?' });

    expect(status).toBe(409);
    expect(body.error.code).toBe('LISTING_REMOVED');
  });
});
