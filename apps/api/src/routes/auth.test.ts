import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../db';
import { clearDatabase, createTestApp, createUser, PASSWORD, tokenFrom } from '../test/helpers';

const student = {
  role: 'STUDENT',
  fullName: 'Aline Mukamana',
  email: 'aline@example.com',
  password: 'long-enough',
};

const sessionCookie = (res: { headers: Record<string, unknown> }) =>
  (res.headers['set-cookie'] as unknown as string[] | undefined)?.[0] ?? '';

beforeEach(clearDatabase);

describe('POST /api/auth/register', () => {
  it('creates a student and logs them in', async () => {
    const { app } = createTestApp();
    const agent = request.agent(app);

    const res = await agent.post('/api/auth/register').send(student);

    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({ email: 'aline@example.com', role: 'STUDENT' });
    expect(res.body.user).not.toHaveProperty('passwordHash');
    expect((await agent.get('/api/auth/me')).body.user.email).toBe('aline@example.com');
  });

  it('stores a bcrypt hash, not the password', async () => {
    const { app } = createTestApp();

    await request(app).post('/api/auth/register').send(student);

    const user = await prisma.user.findUniqueOrThrow({ where: { email: student.email } });
    expect(user.passwordHash).toMatch(/^\$2b\$/);
  });

  it('gives a landlord a contact profile', async () => {
    const { app } = createTestApp();

    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...student, role: 'LANDLORD', phone: '0788 000 000' });

    const profile = await prisma.landlordProfile.findUnique({
      where: { userId: res.body.user.id },
    });
    expect(profile).toMatchObject({ allowPhone: true, allowWhatsapp: true, allowInApp: true });
  });

  it('logs the registration', async () => {
    const { app } = createTestApp();

    await request(app).post('/api/auth/register').send(student);

    const [row] = await prisma.activityLog.findMany();
    expect(row?.text).toBe('Aline Mukamana registered as a student');
  });

  it('refuses to create an administrator', async () => {
    const { app } = createTestApp();

    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...student, role: 'ADMIN' });

    expect(res.status).toBe(400);
    expect(await prisma.user.count()).toBe(0);
  });

  it('returns field messages for invalid input', async () => {
    const { app } = createTestApp();

    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...student, role: 'LANDLORD', phone: '', email: 'nope' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatchObject({
      code: 'VALIDATION_ERROR',
      fields: {
        email: 'Enter a valid email address.',
        phone: 'Please enter a phone number so students can reach you.',
      },
    });
  });

  it('returns 409 for an email already in use, in any letter case', async () => {
    const { app } = createTestApp();
    await createUser({ email: 'aline@example.com' });

    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...student, email: 'ALINE@example.com' });

    expect(res.status).toBe(409);
    expect(res.body.error.fields.email).toBe(
      'An account with this email already exists. Log in or use a different email.',
    );
  });
});

describe('POST /api/auth/login', () => {
  it('sets an httpOnly, SameSite=Lax session cookie', async () => {
    const { app } = createTestApp();
    await createUser();

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'person@example.com', password: PASSWORD });

    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe('STUDENT');
    expect(sessionCookie(res)).toMatch(/urcst_session=/);
    expect(sessionCookie(res)).toMatch(/HttpOnly/);
    expect(sessionCookie(res)).toMatch(/SameSite=Lax/);
  });

  it('ends the session with the browser unless Remember me is ticked', async () => {
    const { app } = createTestApp();
    await createUser();
    const login = { email: 'person@example.com', password: PASSWORD };

    const browserSession = await request(app).post('/api/auth/login').send(login);
    const remembered = await request(app)
      .post('/api/auth/login')
      .send({ ...login, remember: true });

    expect(sessionCookie(browserSession)).not.toMatch(/Max-Age/);
    expect(sessionCookie(remembered)).toMatch(/Max-Age=2592000/);
  });

  it('gives the same error for a wrong password and an unknown email', async () => {
    const { app } = createTestApp();
    await createUser();

    const wrongPassword = await request(app)
      .post('/api/auth/login')
      .send({ email: 'person@example.com', password: 'wrong-password' });
    const unknownEmail = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: 'wrong-password' });

    expect(wrongPassword.status).toBe(401);
    expect(wrongPassword.body).toEqual(unknownEmail.body);
    expect(wrongPassword.body.error.message).toBe('The email or password is not correct.');
  });

  it('tells a suspended user why they cannot log in', async () => {
    const { app } = createTestApp();
    await createUser({ status: 'SUSPENDED' });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'person@example.com', password: PASSWORD });

    expect(res.status).toBe(403);
    expect(res.body.error.message).toMatch(/suspended/);
    expect(sessionCookie(res)).toBe('');
  });

  it('does not reveal a suspended account to a wrong password', async () => {
    const { app } = createTestApp();
    await createUser({ status: 'SUSPENDED' });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'person@example.com', password: 'wrong-password' });

    expect(res.status).toBe(401);
  });

  it('limits repeated failed attempts', async () => {
    const { app } = createTestApp();
    const attempt = { email: 'person@example.com', password: 'wrong-password' };

    for (let i = 0; i < 10; i += 1) {
      await request(app).post('/api/auth/login').send(attempt);
    }
    const res = await request(app).post('/api/auth/login').send(attempt);

    expect(res.status).toBe(429);
    expect(res.body.error.message).toBe(
      'Too many attempts. Please wait a few minutes and try again.',
    );
  });
});

describe('sessions', () => {
  it('returns null when nobody is logged in', async () => {
    const { app } = createTestApp();

    const res = await request(app).get('/api/auth/me');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ user: null });
  });

  it('ignores a tampered cookie', async () => {
    const { app } = createTestApp();

    const res = await request(app).get('/api/auth/me').set('Cookie', 'urcst_session=fake.token.x');

    expect(res.body).toEqual({ user: null });
  });

  it('logs out', async () => {
    const { app } = createTestApp();
    await createUser();
    const agent = request.agent(app);
    await agent.post('/api/auth/login').send({ email: 'person@example.com', password: PASSWORD });

    await agent.post('/api/auth/logout');

    expect((await agent.get('/api/auth/me')).body).toEqual({ user: null });
  });

  it('ends the session as soon as an account is suspended', async () => {
    const { app } = createTestApp();
    const user = await createUser();
    const agent = request.agent(app);
    await agent.post('/api/auth/login').send({ email: 'person@example.com', password: PASSWORD });

    await prisma.user.update({ where: { id: user.id }, data: { status: 'SUSPENDED' } });

    expect((await agent.get('/api/auth/me')).body).toEqual({ user: null });
  });
});

describe('forgot and reset password', () => {
  const email = 'person@example.com';

  it('gives the same answer whether or not the account exists', async () => {
    const { app, sentLinks } = createTestApp();
    await createUser();

    const known = await request(app).post('/api/auth/forgot-password').send({ email });
    const unknown = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'nobody@example.com' });

    expect(known.status).toBe(200);
    expect(known.body).toEqual(unknown.body);
    expect(sentLinks).toHaveLength(1);
  });

  it('stores only a hash of the reset token', async () => {
    const { app, sentLinks } = createTestApp();
    await createUser();

    await request(app).post('/api/auth/forgot-password').send({ email });

    const [row] = await prisma.passwordReset.findMany();
    expect(row?.tokenHash).not.toBe(tokenFrom(sentLinks[0]));
  });

  it('changes the password and ends existing sessions', async () => {
    const { app, sentLinks } = createTestApp();
    await createUser();
    const agent = request.agent(app);
    await agent.post('/api/auth/login').send({ email, password: PASSWORD });
    await request(app).post('/api/auth/forgot-password').send({ email });

    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: tokenFrom(sentLinks[0]), password: 'a-brand-new-password' });

    expect(res.status).toBe(200);
    expect((await agent.get('/api/auth/me')).body).toEqual({ user: null });
    expect(
      (await request(app).post('/api/auth/login').send({ email, password: PASSWORD })).status,
    ).toBe(401);
    expect(
      (await request(app).post('/api/auth/login').send({ email, password: 'a-brand-new-password' }))
        .status,
    ).toBe(200);
  });

  it('refuses a link that was already used', async () => {
    const { app, sentLinks } = createTestApp();
    await createUser();
    await request(app).post('/api/auth/forgot-password').send({ email });
    const token = tokenFrom(sentLinks[0]);
    await request(app)
      .post('/api/auth/reset-password')
      .send({ token, password: 'first-new-password' });

    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ token, password: 'second-new-password' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_RESET_LINK');
  });

  it('refuses an expired link', async () => {
    const { app, sentLinks } = createTestApp();
    await createUser();
    await request(app).post('/api/auth/forgot-password').send({ email });
    await prisma.passwordReset.updateMany({ data: { expiresAt: new Date(Date.now() - 1000) } });

    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: tokenFrom(sentLinks[0]), password: 'a-brand-new-password' });

    expect(res.body.error.code).toBe('INVALID_RESET_LINK');
  });

  it('cancels older links when a new one is requested', async () => {
    const { app, sentLinks } = createTestApp();
    await createUser();
    await request(app).post('/api/auth/forgot-password').send({ email });
    await request(app).post('/api/auth/forgot-password').send({ email });

    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: tokenFrom(sentLinks[0]), password: 'a-brand-new-password' });

    expect(res.body.error.code).toBe('INVALID_RESET_LINK');
  });

  it('limits reset link requests', async () => {
    const { app } = createTestApp();

    for (let i = 0; i < 5; i += 1) {
      await request(app).post('/api/auth/forgot-password').send({ email });
    }
    const res = await request(app).post('/api/auth/forgot-password').send({ email });

    expect(res.status).toBe(429);
  });
});
