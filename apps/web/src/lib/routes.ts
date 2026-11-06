import type { Role } from '@urcst/shared';
import type { IconName } from '../components/Icon';

export interface Crumb {
  label: string;
  to?: string;
}

const HOME: Crumb = { label: 'Home', to: '/' };
const LANDLORD: Crumb = { label: 'Landlord workspace', to: '/landlord' };
const ADMIN: Crumb = { label: 'Admin workspace', to: '/admin' };
const PROPERTIES: Crumb = { label: 'My properties', to: '/landlord/properties' };

function workspaceRoot(role: Role | undefined): Crumb {
  if (role === 'LANDLORD') return LANDLORD;
  if (role === 'ADMIN') return ADMIN;
  return HOME;
}

const STATIC_TRAILS: Record<string, Crumb[]> = {
  '/': [{ label: 'Home' }],
  '/how-it-works': [HOME, { label: 'How it works' }],
  '/login': [HOME, { label: 'Log in' }],
  '/register': [HOME, { label: 'Create account' }],
  '/forgot-password': [HOME, { label: 'Log in', to: '/login' }, { label: 'Forgot password' }],
  '/reset-password': [HOME, { label: 'Log in', to: '/login' }, { label: 'New password' }],
  '/search': [HOME, { label: 'Find Housing' }],
  '/saved': [HOME, { label: 'Saved properties' }],
  '/compare': [HOME, { label: 'Find Housing', to: '/search' }, { label: 'Compare' }],
  '/history': [HOME, { label: 'Recently viewed' }],
  '/student': [HOME, { label: 'My dashboard' }],
  '/account': [HOME, { label: 'My dashboard', to: '/student' }, { label: 'Account & preferences' }],
  '/design-system': [HOME, { label: 'Design system' }],
  '/landlord': [LANDLORD, { label: 'Dashboard' }],
  '/landlord/properties': [LANDLORD, { label: 'My properties' }],
  '/landlord/properties/new': [LANDLORD, PROPERTIES, { label: 'Add accommodation' }],
  '/landlord/inquiries': [LANDLORD, { label: 'Student inquiries' }],
  '/landlord/account': [LANDLORD, { label: 'Account & preferences' }],
  '/admin': [ADMIN, { label: 'Dashboard' }],
  '/admin/review': [ADMIN, { label: 'Listing review' }],
  '/admin/users': [ADMIN, { label: 'Users' }],
  '/admin/reports': [ADMIN, { label: 'Reported properties' }],
  '/admin/locations': [ADMIN, { label: 'Locations' }],
};

/** The "You are here" path for a page. `title` names the listing on property pages. */
export function crumbsFor(pathname: string, role?: Role, title = 'Property'): Crumb[] {
  const path = pathname.length > 1 ? pathname.replace(/\/$/, '') : pathname;
  if (path === '/help') return [workspaceRoot(role), { label: 'Help & support' }];
  if (path === '/notifications') return [workspaceRoot(role), { label: 'Notifications' }];
  const FIND: Crumb = { label: 'Find Housing', to: '/search' };
  const listing = path.match(/^\/properties\/([^/]+)(\/contact)?$/);
  if (listing) {
    const property = `/properties/${listing[1]}`;
    return listing[2]
      ? [HOME, FIND, { label: title, to: property }, { label: 'Contact landlord' }]
      : [HOME, FIND, { label: title }];
  }
  return STATIC_TRAILS[path] ?? [HOME, { label: 'Page not found' }];
}

export function pageLabel(pathname: string, role?: Role): string {
  return crumbsFor(pathname, role).at(-1)?.label ?? 'Home';
}

function isSharedWorkspacePage(pathname: string) {
  return pathname === '/help' || pathname === '/notifications';
}

/** Landlords and administrators work inside the sidebar layout on these pages. */
export function usesWorkspaceLayout(pathname: string, role?: Role): boolean {
  if (role === 'LANDLORD') {
    return /^\/landlord(\/|$)/.test(pathname) || isSharedWorkspacePage(pathname);
  }
  if (role === 'ADMIN') return /^\/admin(\/|$)/.test(pathname) || isSharedWorkspacePage(pathname);
  return false;
}

const AUTH_PAGES = ['/login', '/register', '/forgot-password', '/reset-password'];

export function showsFooter(pathname: string) {
  return !AUTH_PAGES.includes(pathname);
}

export type Audience = 'GUEST' | Role;
const ALL: Audience[] = ['GUEST', 'STUDENT', 'LANDLORD', 'ADMIN'];

export interface QuickFindPage {
  label: string;
  to: string;
  icon: IconName;
  audience: Audience[];
  keywords: string;
}

/** The value of `to` that opens the display panel instead of a page. */
export const DISPLAY_SETTINGS = '__display';

function page(
  label: string,
  to: string,
  icon: IconName,
  audience: Audience[],
  keywords: string,
): QuickFindPage {
  return { label, to, icon, audience, keywords };
}

export const QUICK_FIND_PAGES: QuickFindPage[] = [
  page('Home', '/', 'home', ALL, 'start landing'),
  page('Find Housing: search & filters', '/search', 'search', ALL, 'rooms accommodation rent'),
  page('Saved properties', '/saved', 'heart', ALL, 'favourites heart'),
  page('Compare properties', '/compare', 'compare', ALL, 'side by side'),
  page('Recently viewed & search history', '/history', 'clock', ALL, 'previous last'),
  page('My dashboard', '/student', 'dash', ['STUDENT'], 'inquiries messages'),
  page('Account & preferences', '/account', 'user', ['STUDENT'], 'password profile settings'),
  page('Landlord dashboard', '/landlord', 'dash', ['LANDLORD'], 'summary'),
  page(
    'My properties',
    '/landlord/properties',
    'building',
    ['LANDLORD'],
    'listings availability occupied',
  ),
  page(
    'Add accommodation',
    '/landlord/properties/new',
    'plus',
    ['LANDLORD'],
    'new listing publish',
  ),
  page('Student inquiries', '/landlord/inquiries', 'message', ['LANDLORD'], 'messages reply'),
  page(
    'Account & preferences',
    '/landlord/account',
    'user',
    ['LANDLORD'],
    'phone contact password',
  ),
  page('Admin dashboard', '/admin', 'dash', ['ADMIN'], 'summary'),
  page('Listing review', '/admin/review', 'shieldcheck', ['ADMIN'], 'approve reject pending'),
  page('User management', '/admin/users', 'users', ['ADMIN'], 'accounts suspend'),
  page('Reported properties', '/admin/reports', 'flag', ['ADMIN'], 'reports complaints'),
  page('Locations', '/admin/locations', 'map', ['ADMIN'], 'neighbourhoods areas'),
  page(
    'Notifications',
    '/notifications',
    'bell',
    ['STUDENT', 'LANDLORD', 'ADMIN'],
    'alerts updates',
  ),
  page('Help & FAQ', '/help', 'help', ALL, 'support questions contact'),
  page('Log in', '/login', 'user', ['GUEST'], 'sign in'),
  page('Create account', '/register', 'plus', ['GUEST'], 'sign up register'),
  page(
    'Display & audio settings',
    DISPLAY_SETTINGS,
    'palette',
    ALL,
    'font text size read aloud listen contrast',
  ),
];

export function searchQuickFind(query: string, role?: Role): QuickFindPage[] {
  const audience: Audience = role ?? 'GUEST';
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const pages = QUICK_FIND_PAGES.filter(({ label, keywords, audience: allowed }) => {
    const text = `${label} ${keywords}`.toLowerCase();
    return allowed.includes(audience) && words.every((word) => text.includes(word));
  });
  return words.length ? pages : pages.slice(0, 8);
}
