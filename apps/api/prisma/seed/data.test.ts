import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  activity,
  inquiries,
  inquiryMessages,
  kigali,
  landlordProfiles,
  locations,
  notifications,
  photos,
  properties,
  reports,
  users,
} from './data';
import { photo } from './photos';

type Row = Record<string, unknown>;

interface Prototype {
  photo: (seed: string, idx: number) => string;
  LOCATIONS_SEED: Row[];
  LANDLORDS: Record<string, Row>;
  PROPERTIES_SEED: Row[];
  USERS_SEED: Row[];
  INQUIRIES_SEED: (Row & { thread: { text: string }[] })[];
  REPORTS_SEED: Row[];
  NOTIFS_SEED: Row[];
  ACTIVITY_SEED: Row[];
}

// Runs the prototype's own data block, so these tests compare against the real source.
function loadPrototype(): Prototype {
  const html = readFileSync(
    new URL('../../../../reference/prototype.html', import.meta.url),
    'utf8',
  );
  const start = html.indexOf('const PHOTO_CACHE');
  const end = html.indexOf('const DEFAULT_FILTERS');
  const names =
    'photo, LOCATIONS_SEED, LANDLORDS, PROPERTIES_SEED, USERS_SEED, INQUIRIES_SEED, REPORTS_SEED, NOTIFS_SEED, ACTIVITY_SEED';
  return new Function(`${html.slice(start, end)}\nreturn { ${names} };`)() as Prototype;
}

const proto = loadPrototype();

const byId = <T extends { id?: string }>(rows: T[], id: string) => {
  const row = rows.find((candidate) => candidate.id === id);
  if (!row) throw new Error(`No row with id ${id}`);
  return row;
};

describe('demo data matches the prototype', () => {
  it('has the expected totals', () => {
    expect(locations).toHaveLength(8);
    expect(properties).toHaveLength(13);
    expect(properties.filter((p) => p.reviewStatus === 'APPROVED')).toHaveLength(11);
    expect(properties.filter((p) => p.reviewStatus === 'PENDING')).toHaveLength(2);
    expect(users).toHaveLength(12);
    expect(inquiries).toHaveLength(4);
    expect(reports).toHaveLength(3);
    expect(notifications).toHaveLength(9);
    expect(activity).toHaveLength(4);
  });

  it('copies the locations', () => {
    expect(
      locations.map(({ name, angleDeg, distanceKm }) => ({ name, angleDeg, distanceKm })),
    ).toEqual(
      proto.LOCATIONS_SEED.map((l) => ({ name: l.name, angleDeg: l.angle, distanceKm: l.km })),
    );
  });

  it('copies every property', () => {
    expect(properties.map((p) => p.id)).toEqual(proto.PROPERTIES_SEED.map((p) => p.id));

    for (const source of proto.PROPERTIES_SEED) {
      const seeded = byId(properties, source.id as string);
      const location = byId(locations, seeded.locationId);

      expect(seeded).toMatchObject({
        title: source.title,
        distanceKm: source.dist,
        type: String(source.type).toUpperCase(),
        rooms: source.rooms,
        rentRwf: source.rent,
        selfContained: source.selfContained,
        water: source.water,
        electricity: source.electricity,
        bathroom: String(source.bath).toUpperCase(),
        security: source.security,
        availability: String(source.avail).toUpperCase(),
        reviewStatus: String(source.review).toUpperCase(),
        description: source.desc,
        landmark: source.landmark,
        submittedAt: kigali(source.submitted as string),
      });
      expect(location.name).toBe(source.area);
    }
  });

  it('matches the landlord on every property', () => {
    const landlordIds = { L1: 'u7', L2: 'u8', L3: 'u9' };

    for (const source of proto.PROPERTIES_SEED) {
      const expected = landlordIds[source.landlordId as keyof typeof landlordIds];
      expect(byId(properties, source.id as string).landlordId).toBe(expected);
    }
  });

  it('copies the users and adds only the administrator', () => {
    const fromPrototype = users.filter((user) => user.role !== 'ADMIN');

    expect(
      fromPrototype.map(({ fullName, email, role, status }) => ({ fullName, email, role, status })),
    ).toEqual(
      proto.USERS_SEED.map((u) => ({
        fullName: u.name,
        email: u.email,
        role: String(u.role).toUpperCase(),
        status: String(u.status).toUpperCase(),
      })),
    );
    expect(users.filter((user) => user.role === 'ADMIN').map((user) => user.email)).toEqual([
      'admin@demo.ur',
    ]);
  });

  it('copies the landlord contact settings and phone numbers', () => {
    for (const [userId, source] of [
      ['u7', proto.LANDLORDS.L1],
      ['u8', proto.LANDLORDS.L2],
      ['u9', proto.LANDLORDS.L3],
    ] as const) {
      const profile = landlordProfiles.find((p) => p.userId === userId);

      expect(profile).toMatchObject({
        allowPhone: source?.phoneOn,
        allowWhatsapp: source?.whatsapp,
        allowInApp: source?.inapp,
      });
      expect(byId(users, userId).phone).toBe(source?.phone);
    }
  });

  it('copies every inquiry thread', () => {
    for (const source of proto.INQUIRIES_SEED) {
      const seeded = byId(inquiries, source.id as string);
      const student = byId(users, seeded.studentId);
      const bodies = inquiryMessages.filter((m) => m.inquiryId === seeded.id).map((m) => m.body);

      expect(seeded.propertyId).toBe(source.propId);
      expect(student.fullName).toBe(source.student);
      expect(seeded.status).toBe(String(source.status).toUpperCase());
      expect(bodies).toEqual(source.thread.map((message) => message.text));
    }
  });

  it('sends each landlord reply from the owner of the property', () => {
    for (const message of inquiryMessages) {
      const parent = byId(inquiries, message.inquiryId);
      const owner = byId(properties, parent.propertyId).landlordId;

      expect([parent.studentId, owner]).toContain(message.senderId);
    }
  });

  it('copies every report', () => {
    for (const source of proto.REPORTS_SEED) {
      const seeded = byId(reports, source.id as string);

      expect(seeded).toMatchObject({
        propertyId: source.propId,
        details: source.detail,
        status: String(source.status).toUpperCase(),
      });
      expect(byId(users, seeded.reporterId as string).fullName).toBe(source.by);
    }
    expect(byId(reports, 'r3').resolutionNote).toBe(byId(proto.REPORTS_SEED, 'r3').note);
  });

  it('copies the notifications to the right person', () => {
    const roles: Record<string, string> = { u0: 'student', u7: 'landlord', 'u-admin': 'admin' };

    expect(
      notifications.map((n) => ({
        id: n.id,
        role: roles[n.userId],
        text: n.text,
        read: n.readAt !== null,
      })),
    ).toEqual(
      proto.NOTIFS_SEED.map((n) => ({ id: n.id, role: n.role, text: n.text, read: n.read })),
    );
  });

  it('copies the activity log', () => {
    expect(activity.map((row) => row.text)).toEqual(proto.ACTIVITY_SEED.map((row) => row.text));
  });

  it('features the same three listings as the prototype Landing page', () => {
    const featured = properties
      .filter((p) => p.reviewStatus === 'APPROVED' && p.availability === 'AVAILABLE')
      .sort((a, b) => Number(b.reviewedAt) - Number(a.reviewedAt))
      .slice(0, 3)
      .map((p) => p.id);

    expect(featured).toEqual(['p1', 'p8', 'p4']);
  });

  it('never calls a listing verified', () => {
    const allText = JSON.stringify([properties, notifications, activity, reports]);

    expect(allText.toLowerCase()).not.toContain('verified');
  });
});

describe('demo photos', () => {
  it('gives every property four photos with the first as cover', () => {
    expect(photos).toHaveLength(52);

    for (const property of properties) {
      const own = photos.filter((p) => p.propertyId === property.id);

      expect(own.map((p) => p.position)).toEqual([0, 1, 2, 3]);
      expect(own.filter((p) => p.isCover).map((p) => p.position)).toEqual([0]);
    }
  });

  it('generates exactly the same images as the prototype', () => {
    for (const { propertyId, position } of photos) {
      const expected = proto.photo(propertyId, position).split(',').slice(1).join(',');

      expect(encodeURIComponent(photo(propertyId, position))).toBe(expected);
    }
  });
});
