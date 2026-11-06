# 01 · Product specification

## Goal
Help UR-CST students find suitable, available accommodation near campus easily, confidently and with less effort. The pilot covers neighbourhoods within about 5 km of UR-CST (Nyarugenge, Kigali).

## Roles
| Role | Who | Main goals |
|---|---|---|
| Student (primary) | New, out-of-Kigali, current and international UR-CST students | Find affordable rooms close to campus, understand facilities, compare, save, contact landlords |
| Landlord (secondary) | Property owners, some with limited tech experience | Publish rooms with photos, set rent and availability, answer students |
| Administrator | Platform team | Review and approve listings, handle reports, manage users and locations, monitor activity |

Guests (not logged in) can search, view, save and compare. Saved and compare lists for guests live in localStorage and are merged into the account at login. Sending an in-app message needs a student account. Administrator accounts are never created through public registration (seed or CLI only).

## Out of scope for the MVP
Rent payment, booking confirmation, rental contracts, nationwide listings, real translations (Kinyarwanda and French are shown as "Planned"), housing alerts (shown as a planned enhancement).

## Screens (match `reference/prototype.html`)
**Public & auth:** 1 Landing · 2 Login · 3 Registration (role step, then form) · 4 Forgot / reset password
**Student:** 5 Search & filters · 6 Property details · 7 Saved · 8 Compare · 9 Recently viewed & search history · 10 Contact landlord / inquiry · 11 Student dashboard · 12 Account & preferences
**Landlord:** 13 Dashboard · 14 My properties · 15 Add / edit wizard (5 steps) · 16 Preview · 17 Student inquiries · 18 Account & preferences
**Admin:** 19 Dashboard · 20 Listing review (list + detail) · 21 Users · 22 Reported properties · 23 Locations
**Shared:** 24 Notifications (bell dropdown + page) · 25 Empty/error/loading/confirmation states · 26 Help & support (FAQ + contact form)

## Key behaviours by screen
### Landing
Two-row header: logo · smart search bar · Dark mode · Listen · Aa Text menu · Language menu · Login / Sign up. Second row: Home, Find Housing ▾ (presets), Saved Properties (count), Compare (count), How It Works, For Landlords ▾, Support, and "You are here" on the right. Hero with Location / Max budget / Room type fields that open visible pick lists, then Search. Featured Accommodation (3 cards), How It Works band, four trust items, footer.

Smart search understands phrases like "Kiyovu single room under 100,000 within 2 km" (location, room types, max budget, distance, self-contained, private bathroom, security, water, electricity, available). Unknown text becomes a free-text location search.

### Search & filters
- Filters (visible sidebar on desktop, drawer on mobile, all as chips or toggle tiles): neighbourhood, budget presets + exact min/max sliders, distance presets + slider, room type (multi), layout (any / self-contained / shared), must include (water, electricity, private bathroom, security), rooms (any / 1 / 2+), availability (all / available only).
- Results count updates live; applied-filter chips with ×; Clear all; sort chips (recommended = available first then closest, price low/high, closest); grid/list toggle.
- Empty state offers Increase budget (+30,000), Expand distance (+1 km), Remove facility & type filters, View all; each one updates results immediately.
- Each search is saved to history (for logged-in students; localStorage for guests).

### Property card
Rent (RWF/month), distance from UR-CST, availability badge, title, type, layout, 2–3 facility chips, save heart, Listen, View details, Compare toggle.

### Property details
"On this page" chips (Photos, Price & availability, Facilities, About, Location, Landlord) with scroll-spy. Gallery with prev/next, thumbnails and fullscreen. Price panel shows availability **and** review badges separately, with the note that approval does not confirm today's availability. Facilities as icon + text + included/not included. Description with Show more. Schematic map plus landmarks. Landlord card showing only the contact methods the landlord enabled. Save, Add to compare, Contact landlord, Report a problem. Sticky contact bar on mobile. Viewing adds to Recently viewed.

### Contact landlord
Method cards (phone with copy, WhatsApp link with prefilled message, in-app message). In-app message: prefilled "Hello, I am a UR-CST student interested in this room (…). Is it still available?", at least 10 characters, creates an Inquiry and notifies the landlord.

### Landlord wizard
Steps: 1 Basic info (title ≥ 5 chars, type cards, rooms chips, description ≥ 30 chars) · 2 Location (neighbourhood cards, landmark required, address optional, map pin optional) · 3 Rent & facilities (rent 10,000–1,000,000 RWF with quick-pick amounts, availability, water/electricity/security toggles, bathroom, layout) · 4 Photos (1+ required, preview, remove with Undo, set cover, reorder) · 5 Review with Edit links per section. Draft autosaves (server-side DRAFT listing). Preview as student. Submit asks for confirmation then sets PENDING and notifies admins.

### Admin
Listing review tabs (Pending, Changes requested, Approved, Rejected, Removed). Detail page with a checklist (realistic rent, 3+ photos, inside pilot area, description explains what is included). Approve / Request changes (note required) / Reject (reason required), all confirmed. Users: search, filter by role, view, suspend/reactivate (confirmed). Reports: open/resolved, view, inspect listing, resolve (note required), remove listing (reason required). Locations: search, add/edit (name unique, distance 0.1–5 km), remove only when unused.

## Required end-to-end journeys (become Playwright tests)
**A – Student:** home → search → max rent 100,000, single room, within 2 km → results → open a property → view photos and facilities → save → compare with another → contact landlord (in-app message).
**B – Landlord:** log in → dashboard → Add accommodation → fill all steps with validation → photos → review → preview → submit → listing shows Pending review → mark occupied → Undo.
**C – Admin:** log in → dashboard → pending listings → open one → approve → status shows Approved by admin and the listing appears in student search → open reports → view and resolve one.

## Seed data
Use the same demonstration data as the prototype: 8 locations, 3 demo landlords, 13 properties (11 approved, 2 pending), 11 users, 4 inquiries, 3 reports, notifications and activity. All people and phone numbers are fictional (`+250 700 000 1xx`). Demo logins: `student@demo.ur`, `landlord@demo.ur`, `admin@demo.ur`, password `demo1234`. The exact values are in the `PROPERTIES_SEED`, `USERS_SEED`, etc. constants inside `reference/prototype.html`.
