import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import {
  activity,
  DEMO_PASSWORD,
  inquiries,
  inquiryMessages,
  landlordProfiles,
  locations,
  notifications,
  photoFileName,
  photos,
  properties,
  propertyViews,
  reports,
  savedProperties,
  searchHistory,
  users,
} from './seed/data';
import { photo } from './seed/photos';

const BCRYPT_ROUNDS = 10;
const PHOTO_DIR = fileURLToPath(new URL('../uploads/demo/', import.meta.url));

async function writeDemoPhotos() {
  await mkdir(PHOTO_DIR, { recursive: true });
  await Promise.all(
    photos.map(({ propertyId, position }) =>
      writeFile(`${PHOTO_DIR}${photoFileName(propertyId, position)}`, photo(propertyId, position)),
    ),
  );
}

async function main(prisma: PrismaClient) {
  // db:seed never deletes anything. Only db:reset clears the database.
  if ((await prisma.user.count()) > 0) {
    console.error('The database already has data, so nothing was seeded.');
    console.error('To start again from the demonstration data, run: npm run db:reset');
    process.exitCode = 1;
    return;
  }

  await writeDemoPhotos();
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, BCRYPT_ROUNDS);

  await prisma.$transaction(
    async (tx) => {
      await tx.location.createMany({ data: locations });
      await tx.user.createMany({ data: users.map((user) => ({ ...user, passwordHash })) });
      await tx.landlordProfile.createMany({ data: landlordProfiles });
      await tx.property.createMany({ data: properties });
      await tx.propertyPhoto.createMany({ data: photos });
      await tx.inquiry.createMany({ data: inquiries });
      await tx.inquiryMessage.createMany({ data: inquiryMessages });
      await tx.report.createMany({ data: reports });
      await tx.notification.createMany({ data: notifications });
      await tx.activityLog.createMany({ data: activity });
      await tx.savedProperty.createMany({ data: savedProperties });
      await tx.propertyView.createMany({ data: propertyViews });
      await tx.searchHistory.createMany({ data: searchHistory });
    },
    { timeout: 30_000 },
  );

  console.log(
    `Seeded ${users.length} users, ${locations.length} locations, ${properties.length} properties and ${photos.length} photos.`,
  );
}

const prisma = new PrismaClient();

try {
  await main(prisma);
} finally {
  await prisma.$disconnect();
}
