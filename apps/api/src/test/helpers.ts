import type { AccountStatus, Role } from '@prisma/client';
import bcrypt from 'bcrypt';
import { createApp } from '../app';
import { prisma } from '../db';
import type { Mailer } from '../lib/mailer';
import { assertTestDatabase } from './testDatabase';

export const PASSWORD = 'correct-password';

// The tests use few bcrypt rounds, because they create many users.
const passwordHash = bcrypt.hashSync(PASSWORD, 4);

export async function clearDatabase() {
  assertTestDatabase(process.env.DATABASE_URL as string);
  await prisma.$executeRaw`TRUNCATE "ActivityLog", "PasswordReset", "LandlordProfile", "User" CASCADE`;
}

export function createUser(
  overrides: { email?: string; role?: Role; status?: AccountStatus; phone?: string } = {},
) {
  const { role = 'STUDENT', ...rest } = overrides;

  return prisma.user.create({
    data: {
      email: 'person@example.com',
      fullName: 'Test Person',
      passwordHash,
      role,
      landlordProfile: role === 'LANDLORD' ? { create: {} } : undefined,
      ...rest,
    },
  });
}

/** An app whose mailer keeps reset links instead of printing them. */
export function createTestApp() {
  const sentLinks: string[] = [];
  const mailer: Mailer = {
    async sendPasswordReset(_to, link) {
      sentLinks.push(link);
    },
  };

  return { app: createApp({ mailer }), sentLinks };
}

export function tokenFrom(link: string | undefined): string {
  return new URL(link as string).searchParams.get('token') as string;
}
