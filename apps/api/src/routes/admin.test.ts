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

type App = ReturnType<typeof createTestApp>['app'];

async function logIn(app: App, email: string) {
  const agent = request.agent(app);
  await agent.post('/api/auth/login').send({ email, password: PASSWORD });
  return agent;
}

async function setUp() {
  const { app } = createTestApp();
  const admin = await createUser({ email: 'admin@example.com', role: 'ADMIN' });
  const owner = await createUser({ email: 'landlord@example.com', role: 'LANDLORD' });
  const student = await createUser({ email: 'student@example.com' });
  return { app, admin, owner, student, agent: await logIn(app, admin.email) };
}

const pending = (landlordId: string, title = 'Pending Room') =>
  createListing(landlordId, { title, reviewStatus: 'PENDING', submittedAt: new Date() });

async function publicIds(app: App) {
  const { body } = await request(app).get('/api/properties');
  return (body.items as { id: string }[]).map(({ id }) => id);
}

describe('admin routes', () => {
  it.each([
    ['get', '/api/admin/summary'],
    ['get', '/api/admin/listings'],
    ['post', '/api/admin/listings/x/approve'],
    ['get', '/api/admin/users'],
    ['get', '/api/admin/reports'],
    ['get', '/api/admin/locations'],
  ] as const)('%s %s needs an administrator', async (method, path) => {
    const { app } = await setUp();
    const landlord = await logIn(app, 'landlord@example.com');

    expect((await request(app)[method](path).send({})).status).toBe(401);
    expect((await landlord[method](path).send({})).status).toBe(403);
  });

  it('summarises accounts, listings, reports and recent activity', async () => {
    const { agent, owner, student } = await setUp();
    const waiting = await pending(owner.id);
    const live = await createListing(owner.id);
    await createListing(owner.id, { reviewStatus: 'DRAFT' });
    await createListing(owner.id, { deletedAt: new Date() });
    await prisma.report.create({
      data: { propertyId: live.id, reporterId: student.id, reason: 'WRONG_INFORMATION' },
    });
    await prisma.activityLog.create({
      data: { action: 'X', targetType: 'Property', targetId: live.id, text: 'Something happened' },
    });

    const { body } = await agent.get('/api/admin/summary');

    expect(body.counts).toEqual({
      students: 1,
      landlords: 1,
      listings: 2,
      pending: 1,
      openReports: 1,
    });
    expect(body.pending).toEqual([
      expect.objectContaining({ id: waiting.id, landlord: 'Test Person' }),
    ]);
    expect(body.reports).toEqual([
      expect.objectContaining({ propertyId: live.id, reason: 'Information is wrong' }),
    ]);
    expect(body.activity[0]).toMatchObject({ text: 'Something happened' });
  });
});

describe('listing review', () => {
  it('lists one tab at a time and counts every tab', async () => {
    const { agent, owner } = await setUp();
    const waiting = await pending(owner.id);
    await createListing(owner.id);
    await createListing(owner.id, { reviewStatus: 'REJECTED' });
    await createListing(owner.id, { reviewStatus: 'DRAFT' });

    const { body } = await agent.get('/api/admin/listings');

    expect(body.items.map(({ id }: { id: string }) => id)).toEqual([waiting.id]);
    expect(body.items[0]).toMatchObject({ landlord: 'Test Person', area: 'Kiyovu', photoCount: 1 });
    expect(body.counts).toEqual({
      PENDING: 1,
      CHANGES_REQUESTED: 0,
      APPROVED: 1,
      REJECTED: 1,
      REMOVED: 0,
    });
    expect((await agent.get('/api/admin/listings?status=APPROVED')).body.total).toBe(1);
    expect((await agent.get('/api/admin/listings?status=DRAFT')).status).toBe(400);
  });

  it('shows the listing with the review checklist', async () => {
    const { agent, owner } = await setUp();
    const listing = await createListing(owner.id, {
      reviewStatus: 'PENDING',
      rentRwf: 500000,
      description: 'Short.',
    });

    const { body } = await agent.get(`/api/admin/listings/${listing.id}`);

    expect(body.listing).toMatchObject({ id: listing.id, reviewStatus: 'PENDING' });
    expect(body.landlord).toMatchObject({ email: 'landlord@example.com' });
    expect(body.checklist).toEqual([
      { key: 'rent', label: 'Rent is in a realistic range for student housing', ok: false },
      { key: 'photos', label: 'At least 3 photos (1)', ok: false },
      { key: 'area', label: 'Location is inside the UR-CST pilot area', ok: true },
      { key: 'description', label: 'Description explains what is included', ok: false },
    ]);
  });

  it('approves a listing: students see it at once and the landlord is told', async () => {
    const { app, agent, admin, owner } = await setUp();
    const listing = await pending(owner.id, 'Kiyovu Sunny Room');
    expect(await publicIds(app)).not.toContain(listing.id);

    const res = await agent.post(`/api/admin/listings/${listing.id}/approve`);

    expect(res.status).toBe(200);
    expect(res.body.reviewStatus).toBe('APPROVED');
    expect(await publicIds(app)).toContain(listing.id);
    expect(await prisma.property.findUniqueOrThrow({ where: { id: listing.id } })).toMatchObject({
      reviewedById: admin.id,
      reviewNote: null,
    });
    expect(await prisma.notification.findFirst({ where: { userId: owner.id } })).toMatchObject({
      type: 'LISTING_APPROVED',
      text: 'Listing approved: Kiyovu Sunny Room is now visible to students.',
    });
    expect(await prisma.activityLog.findFirst()).toMatchObject({
      actorId: admin.id,
      action: 'LISTING_APPROVED',
      text: 'Test Person approved Kiyovu Sunny Room',
    });
  });

  it('needs a note to request changes or reject, and sends it to the landlord', async () => {
    const { app, agent, owner } = await setUp();
    const first = await pending(owner.id, 'First');
    const second = await pending(owner.id, 'Second');

    const blank = await agent
      .post(`/api/admin/listings/${first.id}/request-changes`)
      .send({ note: ' ' });
    expect(blank.status).toBe(400);
    expect(blank.body.error.fields).toEqual({
      note: 'Please write a short note for the landlord.',
    });

    await agent
      .post(`/api/admin/listings/${first.id}/request-changes`)
      .send({ note: 'Add a bathroom photo.' });
    await agent.post(`/api/admin/listings/${second.id}/reject`).send({ note: 'Outside the area.' });

    const rows = await prisma.property.findMany({ orderBy: { title: 'asc' } });
    expect(rows.map(({ reviewStatus, reviewNote }) => [reviewStatus, reviewNote])).toEqual([
      ['CHANGES_REQUESTED', 'Add a bathroom photo.'],
      ['REJECTED', 'Outside the area.'],
    ]);
    const texts = (await prisma.notification.findMany({ orderBy: { createdAt: 'asc' } })).map(
      ({ text }) => text,
    );
    expect(texts).toEqual([
      'Changes requested on First. Note: Add a bathroom photo.',
      'Listing rejected: Second. Reason: Outside the area.',
    ]);
    expect(await publicIds(app)).toEqual([]);
  });

  it('only reviews listings that are waiting', async () => {
    const { agent, owner } = await setUp();
    const live = await createListing(owner.id);
    const draft = await createListing(owner.id, { reviewStatus: 'DRAFT' });

    expect((await agent.post(`/api/admin/listings/${live.id}/approve`)).status).toBe(409);
    expect((await agent.post(`/api/admin/listings/${draft.id}/approve`)).status).toBe(404);
  });

  it('removes an approved listing from search and from saved lists, resolving the report', async () => {
    const { app, agent, owner, student } = await setUp();
    const listing = await createListing(owner.id, { title: 'Nice Room' });
    await prisma.savedProperty.create({ data: { userId: student.id, propertyId: listing.id } });
    const report = await prisma.report.create({
      data: { propertyId: listing.id, reason: 'SUSPICIOUS' },
    });

    expect(
      (await agent.post(`/api/admin/listings/${listing.id}/remove`).send({ note: '' })).status,
    ).toBe(400);
    const res = await agent
      .post(`/api/admin/listings/${listing.id}/remove`)
      .send({ note: 'The photos were of another house.', reportId: report.id });

    expect(res.body.reviewStatus).toBe('REMOVED');
    expect(await publicIds(app)).not.toContain(listing.id);
    expect(await prisma.savedProperty.count()).toBe(0);
    expect(await prisma.report.findUniqueOrThrow({ where: { id: report.id } })).toMatchObject({
      status: 'RESOLVED',
      resolutionNote: 'Listing removed. The photos were of another house.',
    });
    expect(await prisma.notification.findFirst({ where: { userId: owner.id } })).toMatchObject({
      type: 'LISTING_REMOVED',
      text: 'Listing removed by admin: Nice Room. Reason: The photos were of another house.',
    });
    expect(
      (await agent.post(`/api/admin/listings/${listing.id}/remove`).send({ note: 'Again' })).status,
    ).toBe(409);
  });
});

describe('users', () => {
  it('lists students and landlords, never administrators, with search and a role filter', async () => {
    const { agent } = await setUp();

    const all = await agent.get('/api/admin/users');
    const landlords = await agent.get('/api/admin/users?role=landlord');
    const search = await agent.get('/api/admin/users?q=STUDENT@');

    expect(all.body.items.map(({ email }: { email: string }) => email).sort()).toEqual([
      'landlord@example.com',
      'student@example.com',
    ]);
    expect(landlords.body.items).toEqual([expect.objectContaining({ role: 'LANDLORD' })]);
    expect(search.body.total).toBe(1);
  });

  it('shows how many listings or inquiries an account has', async () => {
    const { agent, owner, admin } = await setUp();
    await createListing(owner.id);

    const { body } = await agent.get(`/api/admin/users/${owner.id}`);

    expect(body).toMatchObject({ role: 'LANDLORD', count: 1, status: 'ACTIVE' });
    expect((await agent.get(`/api/admin/users/${admin.id}`)).status).toBe(404);
  });

  it('suspends and reactivates an account, which stops and allows logging in', async () => {
    const { app, agent, student, admin } = await setUp();
    const studentAgent = await logIn(app, student.email);

    await agent.patch(`/api/admin/users/${student.id}/status`).send({ status: 'SUSPENDED' });
    expect((await studentAgent.get('/api/me/saved/ids')).status).toBe(403);
    const blocked = await request(app)
      .post('/api/auth/login')
      .send({ email: student.email, password: PASSWORD });
    expect(blocked.status).not.toBe(200);

    await agent.patch(`/api/admin/users/${student.id}/status`).send({ status: 'ACTIVE' });
    const back = await request(app)
      .post('/api/auth/login')
      .send({ email: student.email, password: PASSWORD });
    expect(back.status).toBe(200);
    expect((await prisma.activityLog.findMany()).map(({ text }) => text)).toEqual([
      'Test Person suspended Test Person',
      'Test Person reactivated Test Person',
    ]);
    expect(
      (await agent.patch(`/api/admin/users/${admin.id}/status`).send({ status: 'SUSPENDED' }))
        .status,
    ).toBe(403);
  });
});

describe('reports', () => {
  it('lists open and resolved reports, and resolving needs a note', async () => {
    const { agent, owner, student } = await setUp();
    const listing = await createListing(owner.id, { title: 'Nice Room' });
    const report = await prisma.report.create({
      data: {
        propertyId: listing.id,
        reporterId: student.id,
        reason: 'NO_LONGER_AVAILABLE',
        details: 'Taken last week.',
      },
    });
    await prisma.report.create({ data: { propertyId: listing.id, reason: 'SUSPICIOUS' } });

    const open = await agent.get('/api/admin/reports');
    expect(open.body.counts).toEqual({ OPEN: 2, RESOLVED: 0 });
    expect(open.body.items).toContainEqual(
      expect.objectContaining({
        id: report.id,
        reporter: 'Test Person',
        details: 'Taken last week.',
        property: expect.objectContaining({ title: 'Nice Room', photoCount: 1 }),
      }),
    );
    expect(open.body.items).toContainEqual(expect.objectContaining({ reporter: 'A guest' }));

    expect((await agent.post(`/api/admin/reports/${report.id}/resolve`).send({})).status).toBe(400);
    const done = await agent
      .post(`/api/admin/reports/${report.id}/resolve`)
      .send({ note: 'Landlord marked it occupied.' });
    expect(done.body).toMatchObject({
      status: 'RESOLVED',
      resolutionNote: 'Landlord marked it occupied.',
    });
    expect((await agent.get('/api/admin/reports?status=RESOLVED')).body.total).toBe(1);
    expect(
      (await agent.post(`/api/admin/reports/${report.id}/resolve`).send({ note: 'Again' })).status,
    ).toBe(409);
  });
});

describe('locations', () => {
  it('adds, edits and searches locations, with unique names and a distance in the pilot area', async () => {
    const { agent } = await setUp();
    await createLocation('Kiyovu', 1);

    const added = await agent
      .post('/api/admin/locations')
      .send({ name: 'Rugenge', distanceKm: '1.46', angleDeg: 90 });
    expect(added.status).toBe(201);
    expect(added.body).toMatchObject({
      name: 'Rugenge',
      distanceKm: 1.5,
      angleDeg: 90,
      listings: 0,
    });

    const clash = await agent.post('/api/admin/locations').send({ name: 'kiyovu', distanceKm: 1 });
    expect(clash.body.error.fields).toEqual({ name: 'This location already exists.' });
    const far = await agent.post('/api/admin/locations').send({ name: 'Far', distanceKm: 6 });
    expect(far.body.error.fields).toEqual({
      distanceKm: 'Enter a distance between 0.1 and 5 km (the pilot area).',
    });

    const edited = await agent
      .patch(`/api/admin/locations/${added.body.id as string}`)
      .send({ name: 'Rugenge Hill', distanceKm: 2 });
    expect(edited.body).toMatchObject({ name: 'Rugenge Hill', distanceKm: 2, angleDeg: 90 });

    const search = await agent.get('/api/admin/locations?q=hill');
    expect(search.body.items.map(({ name }: { name: string }) => name)).toEqual(['Rugenge Hill']);
  });

  it('cannot remove a location while listings use it', async () => {
    const { agent, owner } = await setUp();
    const listing = await createListing(owner.id);
    const location = await prisma.location.findUniqueOrThrow({ where: { name: 'Kiyovu' } });

    const blocked = await agent.delete(`/api/admin/locations/${location.id}`);
    expect(blocked.status).toBe(409);
    expect(blocked.body.error.message).toBe(
      '1 listing uses this location. Ask landlords to move it to another neighbourhood first.',
    );

    await prisma.property.update({ where: { id: listing.id }, data: { reviewStatus: 'REMOVED' } });
    expect((await agent.delete(`/api/admin/locations/${location.id}`)).status).toBe(200);
    expect(await prisma.location.count()).toBe(0);
  });
});
