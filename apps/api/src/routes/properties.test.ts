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

const landlord = () => createUser({ email: 'landlord@example.com', role: 'LANDLORD' });

async function logIn(email: string) {
  const { app } = createTestApp();
  const agent = request.agent(app);
  await agent.post('/api/auth/login').send({ email, password: PASSWORD });
  return agent;
}

const titles = (res: request.Response) =>
  (res.body.items as { title: string }[]).map(({ title }) => title);

describe('GET /api/properties', () => {
  it('shows approved listings only, never soft-deleted ones', async () => {
    const owner = await landlord();
    await createListing(owner.id, { title: 'Approved' });
    await createListing(owner.id, { title: 'Pending', reviewStatus: 'PENDING' });
    await createListing(owner.id, { title: 'Draft', reviewStatus: 'DRAFT' });
    await createListing(owner.id, { title: 'Rejected', reviewStatus: 'REJECTED' });
    await createListing(owner.id, { title: 'Removed', reviewStatus: 'REMOVED' });
    await createListing(owner.id, { title: 'Deleted', deletedAt: new Date() });
    const { app } = createTestApp();

    const res = await request(app).get('/api/properties');

    expect(titles(res)).toEqual(['Approved']);
    expect(res.body).toMatchObject({ total: 1, page: 1, pageSize: 20 });
  });

  it('returns distance as a number and the cover photo', async () => {
    const owner = await landlord();
    await createListing(owner.id, { distanceKm: 1.2 });
    const { app } = createTestApp();

    const res = await request(app).get('/api/properties');

    expect(res.body.items[0].distanceKm).toBe(1.2);
    expect(res.body.items[0].coverUrl).toMatch(/^\/uploads\/demo\//);
    expect(res.body.items[0].area).toBe('Kiyovu');
  });

  it('pages through results and limits the page size', async () => {
    const owner = await landlord();
    for (const distanceKm of [1, 2, 3]) await createListing(owner.id, { distanceKm });
    const { app } = createTestApp();

    const page2 = await request(app).get('/api/properties?pageSize=2&page=2&sort=distance');
    const tooMany = await request(app).get('/api/properties?pageSize=51');

    expect(page2.body).toMatchObject({ total: 3, page: 2, pageSize: 2 });
    expect(page2.body.items).toHaveLength(1);
    expect(page2.body.items[0].distanceKm).toBe(3);
    expect(tooMany.status).toBe(400);
  });

  it('puts available rooms first, then the closest, for recommended', async () => {
    const owner = await landlord();
    await createListing(owner.id, { title: 'Far', distanceKm: 3 });
    await createListing(owner.id, { title: 'Near', distanceKm: 1 });
    await createListing(owner.id, {
      title: 'Occupied',
      distanceKm: 0.5,
      availability: 'OCCUPIED',
    });
    const { app } = createTestApp();

    expect(titles(await request(app).get('/api/properties'))).toEqual(['Near', 'Far', 'Occupied']);
  });

  it('sorts by price both ways', async () => {
    const owner = await landlord();
    await createListing(owner.id, { title: 'Cheap', rentRwf: 50000 });
    await createListing(owner.id, { title: 'Dear', rentRwf: 150000 });
    const { app } = createTestApp();

    expect(titles(await request(app).get('/api/properties?sort=price-asc'))).toEqual([
      'Cheap',
      'Dear',
    ]);
    expect(titles(await request(app).get('/api/properties?sort=price-desc'))).toEqual([
      'Dear',
      'Cheap',
    ]);
  });

  it('finds a word in the neighbourhood, title or landmark, in any case', async () => {
    const owner = await landlord();
    const muhima = await createLocation('Muhima', 1.2);
    await createListing(owner.id, { title: 'In the area', locationId: muhima.id });
    await createListing(owner.id, { title: 'Muhima Corner' });
    await createListing(owner.id, { title: 'By the landmark', landmark: 'Near Muhima hospital' });
    await createListing(owner.id, { title: 'Elsewhere' });
    const { app } = createTestApp();

    const res = await request(app).get('/api/properties?q=muHIMa&sort=price-asc');

    expect(res.body.total).toBe(3);
    expect(titles(res)).not.toContain('Elsewhere');
  });

  it('shows a listing dearer than the top of the slider when no budget is set', async () => {
    const owner = await landlord();
    await createListing(owner.id, { title: 'Dear', rentRwf: 900000 });
    await createListing(owner.id, { title: 'Cheap', rentRwf: 12000 });
    const { app } = createTestApp();

    expect((await request(app).get('/api/properties')).body.total).toBe(2);
  });

  it('can fetch named listings, without pending ones', async () => {
    const owner = await landlord();
    const one = await createListing(owner.id, { title: 'One' });
    const hidden = await createListing(owner.id, { title: 'Hidden', reviewStatus: 'PENDING' });
    await createListing(owner.id, { title: 'Other' });
    const { app } = createTestApp();

    const res = await request(app).get(`/api/properties?ids=${one.id},${hidden.id}`);

    expect(titles(res)).toEqual(['One']);
  });

  it('explains a bad filter', async () => {
    const { app } = createTestApp();

    const res = await request(app).get('/api/properties?maxRent=lots');

    expect(res.status).toBe(400);
    expect(res.body.error.fields.maxRent).toBe('Enter the maximum rent as a whole number.');
  });
});

describe('GET /api/properties/featured', () => {
  it('shows the three most recently approved available listings', async () => {
    const owner = await landlord();
    const day = (n: number) => new Date(2026, 9, n);
    await createListing(owner.id, { title: 'Oldest', reviewedAt: day(1) });
    await createListing(owner.id, { title: 'Second', reviewedAt: day(2) });
    await createListing(owner.id, { title: 'Third', reviewedAt: day(3) });
    await createListing(owner.id, { title: 'Newest', reviewedAt: day(4) });
    await createListing(owner.id, {
      title: 'Occupied',
      reviewedAt: day(5),
      availability: 'OCCUPIED',
    });
    await createListing(owner.id, {
      title: 'Pending',
      reviewedAt: day(6),
      reviewStatus: 'PENDING',
    });
    const { app } = createTestApp();

    const res = await request(app).get('/api/properties/featured');

    expect(titles(res)).toEqual(['Newest', 'Third', 'Second']);
  });
});

describe('GET /api/properties/:id', () => {
  it('shows the public an approved listing with its landlord', async () => {
    const owner = await landlord();
    await prisma.user.update({ where: { id: owner.id }, data: { phone: '0788 000 001' } });
    const listing = await createListing(owner.id);
    const { app } = createTestApp();

    const res = await request(app).get(`/api/properties/${listing.id}`);

    expect(res.status).toBe(200);
    expect(res.body.landlord).toEqual({
      name: 'Test Person',
      phone: '0788 000 001',
      whatsapp: '250788000001',
      inApp: true,
    });
    expect(res.body.reviewStatus).toBe('APPROVED');
  });

  it('only shows the contact methods the landlord turned on', async () => {
    const owner = await landlord();
    await prisma.user.update({ where: { id: owner.id }, data: { phone: '0788 000 001' } });
    await prisma.landlordProfile.update({
      where: { userId: owner.id },
      data: { allowPhone: false, allowWhatsapp: false },
    });
    const listing = await createListing(owner.id);
    const { app } = createTestApp();

    const res = await request(app).get(`/api/properties/${listing.id}`);

    expect(res.body.landlord).toMatchObject({ phone: null, whatsapp: null, inApp: true });
    expect(JSON.stringify(res.body)).not.toContain('0788');
    expect(JSON.stringify(res.body)).not.toContain('landlord@example.com');
  });

  it('hides a pending listing from the public and other landlords', async () => {
    const owner = await landlord();
    const listing = await createListing(owner.id, { reviewStatus: 'PENDING' });
    await createUser({ email: 'other@example.com', role: 'LANDLORD' });
    await createUser({ email: 'student@example.com' });
    const { app } = createTestApp();

    const guest = await request(app).get(`/api/properties/${listing.id}`);
    const other = await (await logIn('other@example.com')).get(`/api/properties/${listing.id}`);
    const student = await (await logIn('student@example.com')).get(`/api/properties/${listing.id}`);

    expect(guest.status).toBe(404);
    expect(other.status).toBe(404);
    expect(student.status).toBe(404);
  });

  it('lets the owner and an administrator see a pending listing', async () => {
    const owner = await landlord();
    await createUser({ email: 'admin@example.com', role: 'ADMIN' });
    const listing = await createListing(owner.id, { reviewStatus: 'PENDING' });

    const asOwner = await (await logIn(owner.email)).get(`/api/properties/${listing.id}`);
    const asAdmin = await (await logIn('admin@example.com')).get(`/api/properties/${listing.id}`);

    expect(asOwner.status).toBe(200);
    expect(asAdmin.status).toBe(200);
  });

  it('records a view for a student, once per listing', async () => {
    const owner = await landlord();
    const student = await createUser({ email: 'student@example.com' });
    const listing = await createListing(owner.id);
    const agent = await logIn(student.email);

    await agent.get(`/api/properties/${listing.id}`);
    await agent.get(`/api/properties/${listing.id}`);

    expect(await prisma.propertyView.count({ where: { userId: student.id } })).toBe(1);
  });

  it('records no view for a guest or landlord', async () => {
    const owner = await landlord();
    const listing = await createListing(owner.id);
    const { app } = createTestApp();

    await request(app).get(`/api/properties/${listing.id}`);
    await (await logIn(owner.email)).get(`/api/properties/${listing.id}`);

    expect(await prisma.propertyView.count()).toBe(0);
  });
});

describe('POST /api/properties/:id/reports', () => {
  it('lets a guest report a listing and tells the administrators', async () => {
    const owner = await landlord();
    const admin = await createUser({ email: 'admin@example.com', role: 'ADMIN' });
    const listing = await createListing(owner.id, { title: 'Bad Room' });
    const { app } = createTestApp();

    const res = await request(app)
      .post(`/api/properties/${listing.id}/reports`)
      .send({ reason: 'SUSPICIOUS', details: 'The photos look copied.' });

    expect(res.status).toBe(201);
    expect(await prisma.report.findFirst()).toMatchObject({
      reason: 'SUSPICIOUS',
      details: 'The photos look copied.',
      reporterId: null,
      status: 'OPEN',
    });
    expect(await prisma.notification.findFirst({ where: { userId: admin.id } })).toMatchObject({
      text: 'New report on Bad Room: suspicious or fake listing.',
      link: '/admin/reports',
    });
    expect(await prisma.activityLog.count({ where: { action: 'REPORT_RECEIVED' } })).toBe(1);
  });

  it('records who reported when logged in', async () => {
    const owner = await landlord();
    const student = await createUser({ email: 'student@example.com' });
    const listing = await createListing(owner.id);

    await (
      await logIn(student.email)
    )
      .post(`/api/properties/${listing.id}/reports`)
      .send({ reason: 'WRONG_INFORMATION' });

    expect((await prisma.report.findFirst())?.reporterId).toBe(student.id);
  });

  it('needs a reason from the list', async () => {
    const owner = await landlord();
    const listing = await createListing(owner.id);
    const { app } = createTestApp();

    const res = await request(app).post(`/api/properties/${listing.id}/reports`).send({});

    expect(res.status).toBe(400);
    expect(res.body.error.fields.reason).toBe('Please choose what is wrong.');
  });

  it('cannot report a listing students cannot see', async () => {
    const owner = await landlord();
    const listing = await createListing(owner.id, { reviewStatus: 'PENDING' });
    const { app } = createTestApp();

    const res = await request(app)
      .post(`/api/properties/${listing.id}/reports`)
      .send({ reason: 'SUSPICIOUS' });

    expect(res.status).toBe(404);
  });

  it('stops after 5 reports in 15 minutes', async () => {
    const owner = await landlord();
    const listing = await createListing(owner.id);
    const { app } = createTestApp();
    const send = () =>
      request(app).post(`/api/properties/${listing.id}/reports`).send({ reason: 'SUSPICIOUS' });

    for (let count = 0; count < 5; count++) expect((await send()).status).toBe(201);

    expect((await send()).status).toBe(429);
  });
});

describe('POST /api/properties/:id/inquiries', () => {
  const message = 'Hello, is this room still available?';

  it('needs a student account', async () => {
    const owner = await landlord();
    const listing = await createListing(owner.id);
    const { app } = createTestApp();

    const guest = await request(app)
      .post(`/api/properties/${listing.id}/inquiries`)
      .send({ message });
    const asLandlord = await (
      await logIn(owner.email)
    )
      .post(`/api/properties/${listing.id}/inquiries`)
      .send({ message });

    expect(guest.status).toBe(401);
    expect(asLandlord.status).toBe(403);
  });

  it('creates the inquiry and first message, and tells the landlord', async () => {
    const owner = await landlord();
    const student = await createUser({ email: 'student@example.com' });
    const listing = await createListing(owner.id, { title: 'Nice Room' });

    const res = await (
      await logIn(student.email)
    )
      .post(`/api/properties/${listing.id}/inquiries`)
      .send({ message });

    expect(res.status).toBe(201);
    expect(await prisma.inquiry.findFirst({ include: { messages: true } })).toMatchObject({
      studentId: student.id,
      status: 'NEW',
      messages: [{ senderId: student.id, body: message }],
    });
    expect(await prisma.notification.findFirst({ where: { userId: owner.id } })).toMatchObject({
      type: 'INQUIRY_RECEIVED',
      text: 'Test Person sent an inquiry about Nice Room.',
    });
  });

  it('accepts a question about an occupied room', async () => {
    const owner = await landlord();
    const student = await createUser({ email: 'student@example.com' });
    const listing = await createListing(owner.id, { availability: 'OCCUPIED' });

    const res = await (
      await logIn(student.email)
    )
      .post(`/api/properties/${listing.id}/inquiries`)
      .send({ message });

    expect(res.status).toBe(201);
  });

  it('needs at least 10 characters', async () => {
    const owner = await landlord();
    const student = await createUser({ email: 'student@example.com' });
    const listing = await createListing(owner.id);

    const res = await (
      await logIn(student.email)
    )
      .post(`/api/properties/${listing.id}/inquiries`)
      .send({ message: 'Hi' });

    expect(res.status).toBe(400);
    expect(await prisma.inquiry.count()).toBe(0);
  });

  it('respects a landlord who turned in-app messages off', async () => {
    const owner = await landlord();
    const student = await createUser({ email: 'student@example.com' });
    await prisma.landlordProfile.update({
      where: { userId: owner.id },
      data: { allowInApp: false },
    });
    const listing = await createListing(owner.id);

    const res = await (
      await logIn(student.email)
    )
      .post(`/api/properties/${listing.id}/inquiries`)
      .send({ message });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('IN_APP_OFF');
  });

  it('cannot message about a listing students cannot see', async () => {
    const owner = await landlord();
    const student = await createUser({ email: 'student@example.com' });
    const listing = await createListing(owner.id, { reviewStatus: 'PENDING' });

    const res = await (
      await logIn(student.email)
    )
      .post(`/api/properties/${listing.id}/inquiries`)
      .send({ message });

    expect(res.status).toBe(404);
  });
});

describe('GET /api/locations', () => {
  it('lists neighbourhoods, closest first', async () => {
    await createLocation('Far', 3.2);
    await createLocation('Near', 0.8);
    const { app } = createTestApp();

    const res = await request(app).get('/api/locations');

    expect(res.body.items.map(({ name }: { name: string }) => name)).toEqual(['Near', 'Far']);
    expect(res.body.items[0].distanceKm).toBe(0.8);
  });
});

describe('POST /api/search/parse', () => {
  it('uses the neighbourhoods in the database', async () => {
    await createLocation('Kiyovu');
    const { app } = createTestApp();

    const res = await request(app)
      .post('/api/search/parse')
      .send({ text: 'kiyovu single room under 100,000' });

    expect(res.body.filters).toMatchObject({ q: 'Kiyovu', types: ['SINGLE'], maxRent: 100000 });
  });
});

describe('/uploads', () => {
  it('answers 404 for anything that is not a file there', async () => {
    const { app } = createTestApp();

    const missing = await request(app).get('/uploads/demo/nothing.svg');
    const escape = await request(app).get('/uploads/..%2F.env');

    expect(missing.status).toBe(404);
    expect(escape.status).toBe(404);
  });
});
