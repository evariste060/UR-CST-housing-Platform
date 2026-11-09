import type { NotificationList } from '@urcst/shared';
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

async function logIn(app: ReturnType<typeof createTestApp>['app'], email: string) {
  const agent = request.agent(app);
  await agent.post('/api/auth/login').send({ email, password: PASSWORD });
  return agent;
}

async function setUp() {
  const { app } = createTestApp();
  const owner = await createUser({ email: 'landlord@example.com', role: 'LANDLORD' });
  const student = await createUser({ email: 'student@example.com' });
  return {
    app,
    owner,
    student,
    landlordAgent: await logIn(app, owner.email),
    studentAgent: await logIn(app, student.email),
  };
}

function texts(body: NotificationList) {
  return body.items.map(({ text }) => text);
}

describe('notification routes', () => {
  it.each([
    ['get', '/api/notifications'],
    ['post', '/api/notifications/read-all'],
    ['post', '/api/notifications/some-id/read'],
  ] as const)('%s %s needs a login', async (method, path) => {
    const { app } = createTestApp();

    expect((await request(app)[method](path).send({})).status).toBe(401);
  });

  it('lists only your own, newest first and paged, with the unread count', async () => {
    const { student, owner, studentAgent } = await setUp();
    const at = (minutes: number) => new Date(Date.UTC(2026, 10, 1, 9, minutes));
    await prisma.notification.createMany({
      data: [
        { userId: student.id, type: 'X', text: 'Old', link: '/a', createdAt: at(0), readAt: at(1) },
        { userId: student.id, type: 'X', text: 'Middle', link: '/b', createdAt: at(5) },
        { userId: student.id, type: 'X', text: 'New', link: '/c', createdAt: at(9) },
        { userId: owner.id, type: 'X', text: 'Not yours', link: '/d', createdAt: at(9) },
      ],
    });

    const { body } = await studentAgent.get('/api/notifications?pageSize=2');

    expect(texts(body)).toEqual(['New', 'Middle']);
    expect(body).toMatchObject({ total: 3, page: 1, pageSize: 2, unreadCount: 2 });
    expect(body.items[0]).toEqual({
      id: expect.any(String),
      type: 'X',
      text: 'New',
      link: '/c',
      read: false,
      createdAt: at(9).toISOString(),
    });
    expect((await studentAgent.get('/api/notifications?pageSize=51')).status).toBe(400);
  });

  it('marks one or all as read, but never someone else’s', async () => {
    const { student, owner, studentAgent } = await setUp();
    const [first, second] = await Promise.all(
      ['First', 'Second'].map((text) =>
        prisma.notification.create({ data: { userId: student.id, type: 'X', text, link: '/' } }),
      ),
    );
    const theirs = await prisma.notification.create({
      data: { userId: owner.id, type: 'X', text: 'Theirs', link: '/' },
    });

    const one = await studentAgent.post(`/api/notifications/${first!.id}/read`);
    expect(one.body).toEqual({ unreadCount: 1 });
    expect((await studentAgent.post(`/api/notifications/${theirs.id}/read`)).status).toBe(404);

    const all = await studentAgent.post('/api/notifications/read-all');
    expect(all.body).toEqual({ unreadCount: 0 });
    expect(
      await prisma.notification.findUniqueOrThrow({ where: { id: second!.id } }),
    ).toMatchObject({ readAt: expect.any(Date) });
    expect(await prisma.notification.findUniqueOrThrow({ where: { id: theirs.id } })).toMatchObject(
      { readAt: null },
    );
  });
});

describe('notification events', () => {
  it('tells the student when the landlord replies', async () => {
    const { owner, student, landlordAgent, studentAgent } = await setUp();
    const listing = await createListing(owner.id, { title: 'Nice Room' });
    const inquiry = await prisma.inquiry.create({
      data: {
        propertyId: listing.id,
        studentId: student.id,
        messages: { create: { senderId: student.id, body: 'Is it free?' } },
      },
    });

    await landlordAgent
      .post(`/api/landlord/inquiries/${inquiry.id}/messages`)
      .send({ message: 'Yes, come on Saturday.' });

    const { body } = await studentAgent.get('/api/notifications');
    expect(body.items).toEqual([
      expect.objectContaining({
        type: 'INQUIRY_REPLIED',
        text: 'Test Person replied to your inquiry about Nice Room.',
        link: `/student/inquiries?open=${inquiry.id}`,
        read: false,
      }),
    ]);
  });

  it('tells the landlord and every active administrator about a submitted listing', async () => {
    const { app, owner, landlordAgent } = await setUp();
    await createUser({ email: 'admin@example.com', role: 'ADMIN' });
    await createUser({ email: 'old-admin@example.com', role: 'ADMIN', status: 'SUSPENDED' });
    const location = await createLocation();
    const { body: draft } = await landlordAgent.post('/api/landlord/properties').send({
      title: 'Kiyovu Sunny Room',
      type: 'SINGLE',
      rooms: 1,
      description: 'A bright room in a quiet compound, with water included.',
      landmark: 'Near the roundabout',
      rentRwf: 80000,
      availability: 'AVAILABLE',
      locationId: location.id,
    });
    await landlordAgent
      .post(`/api/landlord/properties/${draft.id as string}/photos`)
      .attach('photos', PNG, 'photo.png');

    expect((await landlordAgent.post(`/api/landlord/properties/${draft.id}/submit`)).status).toBe(
      200,
    );

    const mine = await landlordAgent.get('/api/notifications');
    expect(texts(mine.body)).toEqual(['Listing submitted for review: Kiyovu Sunny Room.']);
    const admin = await logIn(app, 'admin@example.com');
    const theirs = await admin.get('/api/notifications');
    expect(theirs.body.items).toEqual([
      expect.objectContaining({
        type: 'LISTING_TO_REVIEW',
        text: `New listing to review: Kiyovu Sunny Room (${owner.fullName}).`,
        link: '/admin/review',
      }),
    ]);
    expect(await prisma.notification.count()).toBe(2);
  });

  it('tells students who saved an approved listing that its availability changed', async () => {
    const { owner, student, landlordAgent, studentAgent } = await setUp();
    const listing = await createListing(owner.id, { title: 'Nice Room' });
    const other = await createUser({ email: 'other@example.com' });
    await prisma.savedProperty.create({ data: { userId: student.id, propertyId: listing.id } });

    await landlordAgent
      .patch(`/api/landlord/properties/${listing.id}/availability`)
      .send({ availability: 'OCCUPIED' });

    const { body } = await studentAgent.get('/api/notifications');
    expect(body.items).toEqual([
      expect.objectContaining({
        type: 'AVAILABILITY_CHANGED',
        text: 'Availability changed: Nice Room is now occupied.',
        link: `/properties/${listing.id}`,
      }),
    ]);
    expect(await prisma.notification.count({ where: { userId: other.id } })).toBe(0);
  });

  it('takes the notice back when the landlord presses Undo', async () => {
    const { owner, student, landlordAgent } = await setUp();
    const listing = await createListing(owner.id);
    await prisma.savedProperty.create({ data: { userId: student.id, propertyId: listing.id } });
    const path = `/api/landlord/properties/${listing.id}/availability`;

    await landlordAgent.patch(path).send({ availability: 'OCCUPIED' });
    await landlordAgent.patch(path).send({ availability: 'AVAILABLE' });

    expect(await prisma.notification.count()).toBe(0);
  });

  it('says nothing when the value stays the same or the listing is not approved', async () => {
    const { owner, student, landlordAgent } = await setUp();
    const approved = await createListing(owner.id);
    const pending = await createListing(owner.id, { reviewStatus: 'PENDING' });
    await prisma.savedProperty.createMany({
      data: [approved, pending].map(({ id }) => ({ userId: student.id, propertyId: id })),
    });

    await landlordAgent
      .patch(`/api/landlord/properties/${approved.id}/availability`)
      .send({ availability: 'AVAILABLE' });
    await landlordAgent
      .patch(`/api/landlord/properties/${pending.id}/availability`)
      .send({ availability: 'OCCUPIED' });

    expect(await prisma.notification.count()).toBe(0);
  });
});
