import type { AccountStatus, Prisma, Role } from '@prisma/client';
import type { SupportMessageInput } from '@urcst/shared';
import bcrypt from 'bcrypt';
import { createApp } from '../app';
import { prisma } from '../db';
import type { Mailer } from '../lib/mailer';
import type { Storage } from '../lib/storage';
import { assertTestDatabase } from './testDatabase';

export const PASSWORD = 'correct-password';

// The tests use few bcrypt rounds, because they create many users.
const passwordHash = bcrypt.hashSync(PASSWORD, 4);

export async function clearDatabase() {
  assertTestDatabase(process.env.DATABASE_URL as string);
  await prisma.$executeRaw`TRUNCATE "ActivityLog", "PasswordReset", "LandlordProfile", "Location", "User" CASCADE`;
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

let nextListing = 1;

export async function createLocation(name = 'Kiyovu', distanceKm = 1) {
  return prisma.location.upsert({
    where: { name },
    create: { name, distanceKm },
    update: {},
  });
}

/** An approved, available listing with one photo, unless `overrides` says otherwise. */
export async function createListing(
  landlordId: string,
  overrides: Partial<Prisma.PropertyUncheckedCreateInput> = {},
) {
  const location = await createLocation();
  const number = nextListing++;

  return prisma.property.create({
    data: {
      landlordId,
      locationId: location.id,
      title: `Listing ${number}`,
      type: 'SINGLE',
      description: 'A tidy room close to campus with good light.',
      landmark: 'Near the market',
      distanceKm: 1,
      rentRwf: 80000,
      water: true,
      electricity: true,
      bathroom: 'PRIVATE',
      security: true,
      selfContained: true,
      reviewStatus: 'APPROVED',
      reviewedAt: new Date(),
      photos: { create: { url: `/uploads/demo/${number}.svg`, position: 0, isCover: true } },
      ...overrides,
    },
  });
}

/** An app whose mailer keeps reset links and support messages instead of printing them. */
export function createTestApp() {
  const sentLinks: string[] = [];
  const supportMessages: SupportMessageInput[] = [];
  const files = new Map<string, Buffer>();
  const storage: Storage = {
    async save(data, extension) {
      const url = `/uploads/listings/${files.size + 1}.${extension}`;
      files.set(url, data);
      return url;
    },
    async remove(url) {
      files.delete(url);
    },
  };
  const mailer: Mailer = {
    async sendPasswordReset(_to, link) {
      sentLinks.push(link);
    },
    async sendSupportMessage(message) {
      supportMessages.push(message);
    },
  };

  return { app: createApp({ mailer, storage }), sentLinks, supportMessages, files };
}

export function tokenFrom(link: string | undefined): string {
  return new URL(link as string).searchParams.get('token') as string;
}
