// Demonstration data from reference/prototype.html. data.test.ts compares it with the prototype.
// Everyone here is fictional. Distances are approximate and illustrative, not survey data.
import type { Prisma } from '@prisma/client';

const MONTHS: Record<string, string> = { Aug: '08', Sep: '09', Oct: '10', Nov: '11' };

/** Turns the prototype's "12 Oct 2026" into a date in Kigali time (UTC+2). */
export function kigali(date: string, time = '12:00'): Date {
  const [day, month, year] = date.split(' ') as [string, string, string];
  return new Date(`${year}-${MONTHS[month]}-${day.padStart(2, '0')}T${time}:00+02:00`);
}

const ADMIN_ID = 'u-admin';

export const DEMO_PASSWORD = 'demo1234';

export const locations: Prisma.LocationCreateManyInput[] = [
  { id: 'l1', name: 'Kiyovu', angleDeg: 40, distanceKm: 0.8 },
  { id: 'l2', name: 'Muhima', angleDeg: 320, distanceKm: 1.2 },
  { id: 'l3', name: 'Biryogo', angleDeg: 200, distanceKm: 1.5 },
  { id: 'l4', name: 'Nyarugenge Town', angleDeg: 100, distanceKm: 1.0 },
  { id: 'l5', name: 'Gitega', angleDeg: 250, distanceKm: 1.8 },
  { id: 'l6', name: 'Kimisagara', angleDeg: 285, distanceKm: 2.4 },
  { id: 'l7', name: 'Nyamirambo', angleDeg: 215, distanceKm: 3.0 },
  { id: 'l8', name: 'Rwampara', angleDeg: 175, distanceKm: 3.5 },
];

type SeedUser = Omit<Prisma.UserCreateManyInput, 'passwordHash'>;

function user(
  id: string,
  fullName: string,
  role: 'STUDENT' | 'LANDLORD' | 'ADMIN',
  email: string,
  registered: string,
  phone: string | null = null,
  status: 'ACTIVE' | 'SUSPENDED' = 'ACTIVE',
): SeedUser {
  const createdAt = kigali(registered);
  return { id, fullName, role, email, phone, status, createdAt, updatedAt: createdAt };
}

export const users: SeedUser[] = [
  user('u0', 'Demo Student', 'STUDENT', 'student@demo.ur', '1 Sep 2026', '+250 700 000 201'),
  user('u1', 'Aline K. (demo)', 'STUDENT', 'aline.k@demo.ur', '3 Sep 2026'),
  user('u2', 'Eric N. (demo)', 'STUDENT', 'eric.n@demo.ur', '5 Sep 2026'),
  user('u3', 'Grace U. (demo)', 'STUDENT', 'grace.u@demo.ur', '9 Sep 2026'),
  user('u4', 'Patrick H. (demo)', 'STUDENT', 'patrick.h@demo.ur', '14 Sep 2026'),
  user('u5', 'Divine I. (demo)', 'STUDENT', 'divine.i@demo.ur', '20 Sep 2026'),
  user('u6', 'Samuel O. (demo, international)', 'STUDENT', 'samuel.o@demo.ur', '2 Oct 2026'),
  user('u7', 'Demo Landlord A', 'LANDLORD', 'landlord@demo.ur', '28 Aug 2026', '+250 700 000 101'),
  user(
    'u8',
    'Demo Landlord B',
    'LANDLORD',
    'landlord.b@demo.ur',
    '30 Aug 2026',
    '+250 700 000 102',
  ),
  user('u9', 'Demo Landlord C', 'LANDLORD', 'landlord.c@demo.ur', '4 Sep 2026', '+250 700 000 103'),
  // Not in the prototype: Landlord D's phone number.
  user(
    'u10',
    'Demo Landlord D',
    'LANDLORD',
    'landlord.d@demo.ur',
    '11 Sep 2026',
    '+250 700 000 104',
    'SUSPENDED',
  ),
  // Not in the prototype: the administrator's registration date.
  user(ADMIN_ID, 'Demo Administrator', 'ADMIN', 'admin@demo.ur', '25 Aug 2026'),
];

export const landlordProfiles: Prisma.LandlordProfileCreateManyInput[] = [
  { userId: 'u7', allowPhone: true, allowWhatsapp: true, allowInApp: true },
  { userId: 'u8', allowPhone: true, allowWhatsapp: true, allowInApp: true },
  { userId: 'u9', allowPhone: true, allowWhatsapp: false, allowInApp: true },
  { userId: 'u10', allowPhone: true, allowWhatsapp: true, allowInApp: true },
];

const LOCATION_IDS: Record<string, string> = Object.fromEntries(
  locations.map((location) => [location.name, location.id as string]),
);
const LANDLORD_IDS = { L1: 'u7', L2: 'u8', L3: 'u9' };
const ROOM_TYPES = {
  single: 'SINGLE',
  shared: 'SHARED',
  studio: 'STUDIO',
  apartment: 'APARTMENT',
} as const;

// The API features the three most recently approved listings. p1 is approved last so that gives
// p1, p8, p4, the same three the prototype shows on Landing. Other listings use their submitted date.
const APPROVED_ON: Record<string, string> = { p1: '23 Oct 2026' };

function P(
  id: string,
  title: string,
  area: string,
  dist: number,
  type: keyof typeof ROOM_TYPES,
  rooms: number,
  rent: number,
  self: boolean,
  [water, electricity, bath, security]: [boolean, boolean, 'private' | 'shared', boolean],
  avail: 'available' | 'occupied',
  review: 'approved' | 'pending',
  ll: keyof typeof LANDLORD_IDS,
  description: string,
  landmark: string,
  submitted: string,
): Prisma.PropertyCreateManyInput {
  const submittedAt = kigali(submitted);
  const approved = review === 'approved';
  const reviewedAt = approved ? kigali(APPROVED_ON[id] ?? submitted) : null;
  return {
    id,
    landlordId: LANDLORD_IDS[ll],
    title,
    type: ROOM_TYPES[type],
    rooms,
    description,
    locationId: LOCATION_IDS[area] as string,
    landmark,
    distanceKm: dist,
    rentRwf: rent,
    water,
    electricity,
    bathroom: bath === 'private' ? 'PRIVATE' : 'SHARED',
    security,
    selfContained: self,
    availability: avail === 'available' ? 'AVAILABLE' : 'OCCUPIED',
    reviewStatus: approved ? 'APPROVED' : 'PENDING',
    submittedAt,
    reviewedAt,
    reviewedById: approved ? ADMIN_ID : null,
    createdAt: submittedAt,
    updatedAt: reviewedAt ?? submittedAt,
  };
}

export const properties: Prisma.PropertyCreateManyInput[] = [
  P(
    'p1',
    'Kiyovu Garden Single Room',
    'Kiyovu',
    0.8,
    'single',
    1,
    85000,
    true,
    [true, true, 'private', true],
    'available',
    'approved',
    'L1',
    'A bright single room in a quiet compound with a small garden. The room has its own bathroom and a reading desk by the window. Water and electricity are included in the rent. The compound gate is locked at night and a guard is on duty from 6 pm to 6 am. It is a short walk downhill to campus, and shops and a bus stop are nearby. Suitable for one student who wants a calm place to study.',
    'Near Kiyovu roundabout',
    '12 Oct 2026',
  ),
  P(
    'p2',
    'Muhima Shared Student House',
    'Muhima',
    1.2,
    'shared',
    1,
    45000,
    false,
    [true, true, 'shared', true],
    'available',
    'approved',
    'L2',
    'Shared room for two students in a house with four rooms. Residents share a kitchen and two bathrooms. Water and electricity are included. Most current residents are university students.',
    'Behind Muhima health centre',
    '28 Sep 2026',
  ),
  P(
    'p3',
    'Biryogo Courtyard Single Room',
    'Biryogo',
    1.5,
    'single',
    1,
    70000,
    false,
    [true, true, 'shared', false],
    'available',
    'approved',
    'L1',
    'A single room facing a shared courtyard. The bathroom and kitchen are shared with two other tenants. Water and electricity are included. There is no guard, but each room has a strong lock.',
    'Near Biryogo market',
    '3 Oct 2026',
  ),
  P(
    'p4',
    'Nyarugenge Town Studio',
    'Nyarugenge Town',
    1.0,
    'studio',
    1,
    120000,
    true,
    [true, true, 'private', true],
    'available',
    'approved',
    'L3',
    'A self-contained studio with a small kitchen corner and private bathroom, on the second floor of a building with a security guard. Close to the town centre and campus.',
    'Near the city bus park',
    '20 Oct 2026',
  ),
  P(
    'p5',
    'Gitega Hillside Single Room',
    'Gitega',
    1.8,
    'single',
    1,
    95000,
    true,
    [true, true, 'private', true],
    'occupied',
    'approved',
    'L2',
    'Self-contained single room with a view over the valley. Private bathroom, water and electricity included, guarded compound.',
    'Gitega primary school road',
    '15 Sep 2026',
  ),
  P(
    'p6',
    'Kimisagara Budget Shared Room',
    'Kimisagara',
    2.4,
    'shared',
    1,
    35000,
    false,
    [true, true, 'shared', false],
    'available',
    'approved',
    'L3',
    'An affordable shared room for two students. Shared bathroom and kitchen. Water and electricity included. A good option for students on a tight budget.',
    'Kimisagara youth centre',
    '1 Oct 2026',
  ),
  P(
    'p7',
    'Nyamirambo Two-Room Apartment',
    'Nyamirambo',
    3.0,
    'apartment',
    2,
    160000,
    true,
    [true, true, 'private', true],
    'available',
    'approved',
    'L1',
    'A two-room apartment with a sitting room, bedroom, private bathroom and kitchen. Suitable for two students who want to share costs. Guarded compound.',
    'Near Nyamirambo stadium',
    '8 Oct 2026',
  ),
  P(
    'p8',
    'Muhima Corner Single Room',
    'Muhima',
    1.3,
    'single',
    1,
    60000,
    false,
    [true, true, 'shared', true],
    'available',
    'approved',
    'L2',
    'A single room in a guarded house. The bathroom is shared with one other tenant. Water and electricity are included.',
    'Muhima main road',
    '22 Oct 2026',
  ),
  P(
    'p9',
    'Kiyovu Quiet Studio',
    'Kiyovu',
    0.6,
    'studio',
    1,
    150000,
    true,
    [true, true, 'private', true],
    'occupied',
    'approved',
    'L3',
    'A furnished self-contained studio close to campus with a private bathroom and kitchenette. Guarded building.',
    'Kiyovu, near the embassies area',
    '5 Sep 2026',
  ),
  P(
    'p10',
    'Rwampara Shared Flat Room',
    'Rwampara',
    3.5,
    'shared',
    1,
    40000,
    false,
    [true, false, 'shared', false],
    'available',
    'approved',
    'L3',
    'A shared room in a flat. Water is included; electricity is prepaid by tenants (not included in rent). Shared bathroom.',
    'Rwampara bus stop',
    '30 Sep 2026',
  ),
  P(
    'p11',
    'Gitega Family-House Single Room',
    'Gitega',
    1.9,
    'single',
    1,
    55000,
    false,
    [true, true, 'shared', true],
    'available',
    'approved',
    'L1',
    'A single room in a family house. Students share the bathroom with one other tenant. Water and electricity included. The family lives on site and the gate is locked at night.',
    'Gitega church road',
    '18 Oct 2026',
  ),
  P(
    'p12',
    'Nyarugenge Apartment near Market',
    'Nyarugenge Town',
    2.2,
    'apartment',
    2,
    180000,
    true,
    [true, true, 'private', true],
    'available',
    'pending',
    'L1',
    'Two-room apartment near the central market with private bathroom and kitchen. Guarded building with a water tank for backup.',
    'Near the central market',
    '2 Nov 2026',
  ),
  P(
    'p13',
    'Biryogo Lane Shared Room',
    'Biryogo',
    1.6,
    'shared',
    1,
    42000,
    false,
    [true, true, 'shared', false],
    'available',
    'pending',
    'L2',
    'Shared room for two in a house close to Biryogo. Shared bathroom and kitchen. Water and electricity included.',
    'Biryogo lane 4',
    '3 Nov 2026',
  ),
];

const PHOTOS_PER_PROPERTY = 4;

export function photoFileName(propertyId: string, position: number): string {
  return `${propertyId}-${position}.svg`;
}

export const photos: Prisma.PropertyPhotoCreateManyInput[] = properties.flatMap((property) =>
  Array.from({ length: PHOTOS_PER_PROPERTY }, (_, position) => ({
    id: `${property.id}-photo-${position}`,
    propertyId: property.id as string,
    url: `/uploads/demo/${photoFileName(property.id as string, position)}`,
    position,
    isCover: position === 0,
  })),
);

function inquiry(
  id: string,
  propertyId: string,
  studentId: string,
  status: 'NEW' | 'HANDLED',
  thread: { senderId: string; body: string; at: Date }[],
) {
  const first = thread[0] as (typeof thread)[number];
  const last = thread[thread.length - 1] as (typeof thread)[number];
  return {
    inquiry: {
      id,
      propertyId,
      studentId,
      status,
      createdAt: first.at,
      updatedAt: last.at,
    } satisfies Prisma.InquiryCreateManyInput,
    messages: thread.map(
      ({ senderId, body, at }, index) =>
        ({
          id: `${id}-m${index + 1}`,
          inquiryId: id,
          senderId,
          body,
          createdAt: at,
        }) satisfies Prisma.InquiryMessageCreateManyInput,
    ),
  };
}

const inquiryThreads = [
  inquiry('q1', 'p1', 'u1', 'NEW', [
    {
      senderId: 'u1',
      body: 'Hello, I am a UR-CST student interested in this room. Is it still available from December?',
      at: kigali('3 Nov 2026', '09:14'),
    },
  ]),
  inquiry('q2', 'p7', 'u2', 'NEW', [
    {
      senderId: 'u2',
      body: 'Hi, my friend and I would like to share the apartment. Can we visit on Saturday?',
      at: kigali('2 Nov 2026', '16:40'),
    },
  ]),
  inquiry('q3', 'p3', 'u3', 'HANDLED', [
    {
      senderId: 'u3',
      body: 'Is water included in the rent?',
      at: kigali('29 Oct 2026', '11:02'),
    },
    {
      senderId: 'u7',
      body: 'Yes, water and electricity are included.',
      at: kigali('29 Oct 2026', '13:20'),
    },
  ]),
  inquiry('q4', 'p2', 'u0', 'HANDLED', [
    {
      senderId: 'u0',
      body: 'Hello, is the shared room still available?',
      at: kigali('31 Oct 2026', '10:05'),
    },
    {
      senderId: 'u8',
      body: 'Yes, one place is still free. You can visit any weekday afternoon.',
      at: kigali('31 Oct 2026', '15:30'),
    },
  ]),
];

export const inquiries = inquiryThreads.map((thread) => thread.inquiry);
export const inquiryMessages = inquiryThreads.flatMap((thread) => thread.messages);

export const reports: Prisma.ReportCreateManyInput[] = [
  {
    id: 'r1',
    propertyId: 'p10',
    reporterId: 'u4',
    reason: 'WRONG_INFORMATION',
    details:
      'The listing says electricity is available, but tenants told me it is often cut and is not included in the rent.',
    status: 'OPEN',
    createdAt: kigali('1 Nov 2026', '18:05'),
  },
  {
    id: 'r2',
    propertyId: 'p6',
    reporterId: 'u5',
    reason: 'PHOTOS_DONT_MATCH',
    details: 'When I visited, the room looked different from the photos. It was smaller.',
    status: 'OPEN',
    createdAt: kigali('30 Oct 2026'),
  },
  {
    id: 'r3',
    propertyId: 'p2',
    reporterId: 'u6',
    reason: 'NO_LONGER_AVAILABLE',
    details: 'I was told the room was taken.',
    status: 'RESOLVED',
    resolutionNote: 'Landlord confirmed one place is still free.',
    // Not in the prototype: who resolved the report, and when.
    resolvedById: ADMIN_ID,
    resolvedAt: kigali('21 Oct 2026'),
    createdAt: kigali('20 Oct 2026'),
  },
];

function notification(
  id: string,
  userId: string,
  type: string,
  text: string,
  link: string,
  when: Date,
  read = false,
): Prisma.NotificationCreateManyInput {
  return { id, userId, type, text, link, createdAt: when, readAt: read ? when : null };
}

export const notifications: Prisma.NotificationCreateManyInput[] = [
  notification(
    'n1',
    'u0',
    'AVAILABILITY_CHANGED',
    'Availability changed: Gitega Hillside Single Room is now occupied.',
    '/properties/p5',
    // The prototype says "Today". Its demo date is 4 Nov 2026.
    kigali('4 Nov 2026', '08:20'),
  ),
  notification(
    'n2',
    'u0',
    'INQUIRY_REPLIED',
    'Demo Landlord B replied to your inquiry about Muhima Shared Student House.',
    '/student',
    kigali('31 Oct 2026', '15:30'),
  ),
  notification(
    'n3',
    'u0',
    'NEW_LISTING',
    'New listing near campus: Muhima Corner Single Room (1.3 km).',
    '/properties/p8',
    kigali('22 Oct 2026'),
    true,
  ),
  notification(
    'n4',
    'u7',
    'INQUIRY_RECEIVED',
    'New inquiry from Aline K. (demo) about Kiyovu Garden Single Room.',
    '/landlord/inquiries',
    kigali('3 Nov 2026', '09:14'),
  ),
  notification(
    'n5',
    'u7',
    'LISTING_SUBMITTED',
    'Listing submitted for review: Nyarugenge Apartment near Market.',
    '/landlord/properties',
    kigali('2 Nov 2026', '10:30'),
  ),
  notification(
    'n6',
    'u7',
    'LISTING_APPROVED',
    'Listing approved: Gitega Family-House Single Room is now visible to students.',
    '/landlord/properties',
    kigali('18 Oct 2026'),
    true,
  ),
  notification(
    'n7',
    ADMIN_ID,
    'LISTING_SUBMITTED',
    'New listing to review: Biryogo Lane Shared Room (Demo Landlord B).',
    '/admin/listings/p13',
    kigali('3 Nov 2026', '14:12'),
  ),
  notification(
    'n8',
    ADMIN_ID,
    'LISTING_SUBMITTED',
    'New listing to review: Nyarugenge Apartment near Market (Demo Landlord A).',
    '/admin/listings/p12',
    kigali('2 Nov 2026', '10:30'),
  ),
  notification(
    'n9',
    ADMIN_ID,
    'REPORT_RECEIVED',
    'New report on Rwampara Shared Flat Room: information is wrong.',
    '/admin/reports',
    kigali('1 Nov 2026', '18:05'),
  ),
];

export const activity: Prisma.ActivityLogCreateManyInput[] = [
  {
    id: 'a1',
    actorId: 'u8',
    action: 'LISTING_SUBMITTED',
    targetType: 'Property',
    targetId: 'p13',
    text: 'Demo Landlord B submitted Biryogo Lane Shared Room',
    createdAt: kigali('3 Nov 2026', '14:12'),
  },
  {
    id: 'a2',
    actorId: 'u7',
    action: 'LISTING_SUBMITTED',
    targetType: 'Property',
    targetId: 'p12',
    text: 'Demo Landlord A submitted Nyarugenge Apartment near Market',
    createdAt: kigali('2 Nov 2026', '10:30'),
  },
  {
    id: 'a3',
    actorId: 'u4',
    action: 'REPORT_CREATED',
    targetType: 'Report',
    targetId: 'r1',
    text: 'Patrick H. (demo) reported Rwampara Shared Flat Room',
    createdAt: kigali('1 Nov 2026', '18:05'),
  },
  {
    id: 'a4',
    actorId: 'u6',
    action: 'USER_REGISTERED',
    targetType: 'User',
    targetId: 'u6',
    text: 'Samuel O. (demo, international) registered as a student',
    createdAt: kigali('2 Oct 2026', '09:41'),
  },
];

// The Demo Student's starting state from freshState() in the prototype.
export const savedProperties: Prisma.SavedPropertyCreateManyInput[] = [
  { userId: 'u0', propertyId: 'p2', createdAt: kigali('31 Oct 2026') },
];

export const propertyViews: Prisma.PropertyViewCreateManyInput[] = [
  { userId: 'u0', propertyId: 'p2', viewedAt: kigali('31 Oct 2026', '10:00') },
  { userId: 'u0', propertyId: 'p4', viewedAt: kigali('31 Oct 2026', '09:00') },
];

export const searchHistory: Prisma.SearchHistoryCreateManyInput[] = [
  {
    id: 's1',
    userId: 'u0',
    label: 'Muhima · up to 60,000 RWF',
    // Uses the query names from docs/03-api.md, not the prototype's filter keys.
    filters: { q: 'Muhima', maxRent: 60000 },
    createdAt: kigali('31 Oct 2026'),
  },
];
