import type { Role } from '@prisma/client';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../db';
import { clearDatabase, createTestApp, createUser, PASSWORD } from '../test/helpers';

beforeEach(clearDatabase);

async function loggedIn(role: Role = 'STUDENT') {
  const { app } = createTestApp();
  const user = await createUser({ role });
  const agent = request.agent(app);
  await agent.post('/api/auth/login').send({ email: user.email, password: PASSWORD });
  return { app, user, agent };
}

describe('account routes need a login', () => {
  it.each([
    ['patch', '/api/me'],
    ['post', '/api/me/password'],
    ['patch', '/api/me/contact-preferences'],
  ] as const)('%s %s returns 401', async (method, path) => {
    const { app } = createTestApp();

    const res = await request(app)[method](path).send({});

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('NOT_LOGGED_IN');
  });
});

describe('PATCH /api/me', () => {
  it('updates the name, email and phone', async () => {
    const { agent } = await loggedIn();

    const res = await agent
      .patch('/api/me')
      .send({ fullName: 'New Name', email: 'NEW@example.com', phone: '0788 000 000' });

    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({
      fullName: 'New Name',
      email: 'new@example.com',
      phone: '0788 000 000',
    });
  });

  it('lets a student remove their phone number', async () => {
    const { agent, user } = await loggedIn();
    await prisma.user.update({ where: { id: user.id }, data: { phone: '0788 000 000' } });

    const res = await agent.patch('/api/me').send({ phone: '' });

    expect(res.body.user.phone).toBeNull();
  });

  it('does not let a landlord remove their phone number', async () => {
    const { agent } = await loggedIn('LANDLORD');

    const res = await agent.patch('/api/me').send({ phone: '' });

    expect(res.status).toBe(400);
    expect(res.body.error.fields.phone).toBe('Enter a phone number with at least 9 digits.');
  });

  it('returns 409 for an email another account uses', async () => {
    const { agent } = await loggedIn();
    await createUser({ email: 'taken@example.com' });

    const res = await agent.patch('/api/me').send({ email: 'taken@example.com' });

    expect(res.status).toBe(409);
  });

  it('cannot change the role', async () => {
    const { agent, user } = await loggedIn();

    await agent.patch('/api/me').send({ role: 'ADMIN' });

    const stored = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(stored.role).toBe('STUDENT');
  });
});

describe('POST /api/me/password', () => {
  it('rejects a wrong current password', async () => {
    const { agent } = await loggedIn();

    const res = await agent
      .post('/api/me/password')
      .send({ currentPassword: 'wrong-password', newPassword: 'a-brand-new-password' });

    expect(res.status).toBe(400);
    expect(res.body.error.fields.currentPassword).toBe('Current password is not correct.');
  });

  it('changes the password, keeps this session and ends others', async () => {
    const { app, agent, user } = await loggedIn();
    const otherDevice = request.agent(app);
    await otherDevice.post('/api/auth/login').send({ email: user.email, password: PASSWORD });

    const res = await agent
      .post('/api/me/password')
      .send({ currentPassword: PASSWORD, newPassword: 'a-brand-new-password' });

    expect(res.status).toBe(200);
    expect((await agent.get('/api/auth/me')).body.user.id).toBe(user.id);
    expect((await otherDevice.get('/api/auth/me')).body).toEqual({ user: null });
  });
});

describe('PATCH /api/me/contact-preferences', () => {
  const prefs = { allowPhone: true, allowWhatsapp: false, allowInApp: true };

  it('saves a landlord preference', async () => {
    const { agent, user } = await loggedIn('LANDLORD');

    const res = await agent.patch('/api/me/contact-preferences').send(prefs);

    expect(res.status).toBe(200);
    expect(res.body).toEqual(prefs);
    expect(await prisma.landlordProfile.findUnique({ where: { userId: user.id } })).toMatchObject(
      prefs,
    );
  });

  it('needs one method to stay on', async () => {
    const { agent } = await loggedIn('LANDLORD');

    const res = await agent
      .patch('/api/me/contact-preferences')
      .send({ allowPhone: false, allowWhatsapp: false, allowInApp: false });

    expect(res.status).toBe(400);
    expect(res.body.error.fields.contactPreferences).toBe(
      'Keep at least one contact method on so students can reach you.',
    );
  });

  it.each(['STUDENT', 'ADMIN'] as const)('is forbidden for %s accounts', async (role) => {
    const { agent } = await loggedIn(role);

    const res = await agent.patch('/api/me/contact-preferences').send(prefs);

    expect(res.status).toBe(403);
  });
});
