import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../db';
import { clearDatabase, createTestApp, createUser, PASSWORD } from '../test/helpers';

beforeEach(clearDatabase);

const MESSAGE = {
  name: 'Aline K.',
  email: 'Aline@Example.com',
  topic: 'SEARCH',
  message: 'The distance filter does not change the results.',
};

describe('contact support', () => {
  it('sends a guest message to the support team and logs it', async () => {
    const { app, supportMessages } = createTestApp();

    const res = await request(app).post('/api/support').send(MESSAGE);

    expect(res.status).toBe(201);
    expect(supportMessages).toEqual([{ ...MESSAGE, email: 'aline@example.com' }]);
    expect(await prisma.activityLog.findFirst()).toMatchObject({
      actorId: null,
      action: 'SUPPORT_MESSAGE_SENT',
      text: 'Aline K. contacted support about searching for rooms',
    });
  });

  it('records who sent it when they are logged in', async () => {
    const { app } = createTestApp();
    const student = await createUser({ email: 'student@example.com' });
    const agent = request.agent(app);
    await agent.post('/api/auth/login').send({ email: student.email, password: PASSWORD });

    await agent.post('/api/support').send(MESSAGE);

    expect(await prisma.activityLog.findFirst()).toMatchObject({ actorId: student.id });
  });

  it('explains each problem in the form', async () => {
    const { app, supportMessages } = createTestApp();

    const res = await request(app)
      .post('/api/support')
      .send({ name: ' ', email: 'aline', message: 'Help' });

    expect(res.status).toBe(400);
    expect(res.body.error.fields).toEqual({
      name: 'Please enter your full name.',
      email: 'Enter a valid email address.',
      topic: 'Please choose a topic.',
      message: 'Please write at least 10 characters so we can understand the problem.',
    });
    expect(supportMessages).toEqual([]);
  });

  it('limits how many messages one person can send', async () => {
    const { app } = createTestApp();

    for (let sent = 0; sent < 5; sent++) {
      expect((await request(app).post('/api/support').send(MESSAGE)).status).toBe(201);
    }
    expect((await request(app).post('/api/support').send(MESSAGE)).status).toBe(429);
  });
});
