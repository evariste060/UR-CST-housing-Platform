# 03 · REST API

Base URL `/api`. JSON in and out. Errors: `{ "error": { "code": "VALIDATION_ERROR", "message": "Plain-English message", "fields": { "rentRwf": "Enter an amount between 10,000 and 1,000,000 RWF." } } }`. Status codes: 400 validation, 401 not logged in, 403 wrong role or not the owner, 404 not found, 409 conflict (e.g. email taken, location in use), 429 too many attempts.

Legend: 🌐 anyone · 🎓 student · 🏠 landlord (own resources only) · 🛡 admin

## Auth
| Method | Path | Who | Notes |
|---|---|---|---|
| POST | /auth/register | 🌐 | `{ role: STUDENT\|LANDLORD, fullName, email, phone?, password }` (phone required for landlords). Sets session cookie. |
| POST | /auth/login | 🌐 | `{ email, password, remember? }`. `remember` keeps the login for 30 days; otherwise it ends when the browser closes. Suspended accounts get 403 with a clear message. Limited to 10 failed attempts per 15 minutes (429). |
| POST | /auth/logout | 🌐 | Clears cookie. |
| GET | /auth/me | 🌐 | Current user or `null`. |
| POST | /auth/forgot-password | 🌐 | Always 200 ("If an account exists…"). Dev: reset link logged to console. Links last 1 hour and work once. Limited to 5 requests per 15 minutes (429). |
| POST | /auth/reset-password | 🌐 | `{ token, password }`. Ends every session for that user. |
| PATCH | /me | 🎓🏠🛡 | Update name, email, phone. |
| POST | /me/password | 🎓🏠🛡 | `{ currentPassword, newPassword }`. Keeps this session and ends the others. |
| GET | /me/contact-preferences | 🏠 | The landlord's current choices. |
| PATCH | /me/contact-preferences | 🏠 | `{ allowPhone, allowWhatsapp, allowInApp }`; at least one must stay on. |

## Properties (public)
| Method | Path | Who | Notes |
|---|---|---|---|
| GET | /properties | 🌐 | Approved only. Query: `q, locationId, minRent, maxRent, maxDistance, types=SINGLE,SHARED, layout=any\|self\|shared, water, electricity, privateBath, security, rooms=any\|1\|2, availableOnly, sort=recommended\|price-asc\|price-desc\|distance, page, pageSize`. Returns `{ items, total, page, pageSize }`. |
| GET | /properties?ids=a,b | 🌐 | The listings with these ids, for the Compare, Saved and Recently viewed lists kept on the device. Same approved-only rule. |
| GET | /properties/counts | 🌐 | Takes the same filters as `/properties`. Returns how many approved listings each filter option would show with the other filters kept: `areas, budgets, distances, types, layouts, facilities, rooms, availability`. |
| GET | /properties/featured | 🌐 | 3 most recently approved available listings. Every listing summary has `coverUrl` and `photoUrls`, which holds all public photos with the cover first. |
| GET | /properties/:id | 🌐 | Approved only for the public; owner and admin can see any status. Records a view for logged-in students. Includes landlord display name and only the enabled contact methods. |
| POST | /properties/:id/reports | 🌐 | `{ reason, details? }`; notifies admins. |
| GET | /locations | 🌐 | For filters and the wizard. |
| POST | /search/parse | 🌐 | `{ text }` → filters object (smart search; also used by the header search). |

## Student
| Method | Path | Notes |
|---|---|---|
| GET/POST/DELETE | /me/saved, /me/saved/:propertyId | Save is idempotent. |
| GET | /me/saved/ids | Only the ids, for hearts and counts on every page. |
| POST | /me/saved/merge | `{ propertyIds }` from guest localStorage after login. |
| GET / DELETE | /me/history | Recently viewed + recent searches; DELETE clears both. |
| POST | /me/history/restore | `{ views, searches }`; puts cleared history back, for Undo. |
| POST | /me/searches | `{ label, filters }` |
| GET | /me/inquiries | Student's inquiries with last message and replied flag. |
| GET | /me/inquiries/:id | 🎓 One of your own inquiries with the landlord's name and every message. |
| POST | /me/inquiries/:id/messages | 🎓 Write again in one of your own conversations ({ message }, 1 to 2,000 characters). The inquiry becomes NEW for the landlord, who gets a notification. 409 LISTING_REMOVED if the listing was deleted. Returns the updated conversation. |
| POST | /properties/:id/inquiries | 🎓 `{ message }` (≥ 10 chars). Creates inquiry + first message, notifies landlord. |

## Landlord
| Method | Path | Notes |
|---|---|---|
| GET | /landlord/summary | Totals: properties, available, occupied, pending, changes requested, drafts, new inquiries; recent inquiries; the five most recently updated listings. |
| GET | /landlord/properties | `?filter=all\|available\|occupied\|pending\|changes\|drafts`, `availability=all\|available\|occupied`, `status=all\|DRAFT\|PENDING\|APPROVED\|CHANGES_REQUESTED\|REJECTED\|REMOVED`, `q` (title or neighbourhood, up to 100 characters), `sort=updated-desc\|updated-asc`. They all combine. Each row has `type` and `updatedAt`. Also returns `counts` for every `filter` value. |
| GET | /landlord/properties/:id | The wizard's view: saved answers over the live listing, and photos. |
| POST | /landlord/properties | Creates a DRAFT (wizard step 1 autosave). |
| PATCH | /landlord/properties/:id | Partial update (autosave). Editing an APPROVED listing does not change it until submit. |
| POST | /landlord/properties/:id/photos | multipart, max 10 photos, jpg/png/webp, ≤ 5 MB each. |
| PATCH | /landlord/properties/:id/photos | `{ order: [photoId…], coverId }`. Takes effect on submit. |
| DELETE | /landlord/properties/:id/photos/:photoId | Takes effect on submit. |
| POST | /landlord/properties/:id/photos/:photoId/restore | Undo for removing a photo. |
| POST | /landlord/properties/:id/submit | Validates all steps; sets PENDING; notifies admins. |
| PATCH | /landlord/properties/:id/availability | `{ availability }`; returns previous value for Undo; notifies students who saved it. |
| DELETE | /landlord/properties/:id | Soft delete. `POST /landlord/properties/:id/restore` for Undo. |
| GET | /landlord/inquiries | `?status=all\|new\|handled` and `q` (student name or property title). `lastMessage` includes `createdAt`. |
| GET | /landlord/inquiries/:id | Thread, with the property's cover photo, neighbourhood, rent and review status. Student contact details are not included. |
| POST | /landlord/inquiries/:id/messages | Reply; marks HANDLED; notifies student. |
| PATCH | /landlord/inquiries/:id | `{ status }` |

## Admin
| Method | Path | Notes |
|---|---|---|
| GET | /admin/summary | Counts (pending reviews, open reports, listings, students, landlords), the 5 oldest pending listings, 5 open reports and the 7 latest activity rows. |
| GET | /admin/listings | `?status=PENDING\|CHANGES_REQUESTED\|APPROVED\|REJECTED\|REMOVED&page=` (default PENDING, oldest first). Drafts and deleted listings are never listed. Includes `counts` per tab. |
| GET | /admin/listings/:id | The full listing plus landlord contact, review note and a 4-item checklist: rent 10,000–400,000 RWF, at least 3 photos, area within 5 km, description of 60+ characters. |
| POST | /admin/listings/:id/approve | Approve, request changes and reject work only from PENDING or CHANGES_REQUESTED (409 otherwise). Each notifies the landlord and writes an ActivityLog row. |
| POST | /admin/listings/:id/request-changes | `{ note }` required |
| POST | /admin/listings/:id/reject | `{ note }` required |
| POST | /admin/listings/:id/remove | `{ note }` required; optional `reportId` to resolve it too. APPROVED listings only; also deletes students' saved rows. |
| GET | /admin/users | `?role=all\|student\|landlord&q=&page=`. Admin accounts are not listed. |
| GET | /admin/users/:id | Adds phone and the number of listings or inquiries. |
| PATCH | /admin/users/:id/status | `{ status: ACTIVE\|SUSPENDED }`; admins cannot change their own (403). Logged. |
| GET | /admin/reports | `?status=OPEN\|RESOLVED&page=`, with `counts`. |
| POST | /admin/reports/:id/resolve | `{ note }` required; 409 if already resolved. |
| GET/POST/PATCH/DELETE | /admin/locations(/:id) | `?q=&page=`; each row has a `listings` count. Name is unique ignoring case ("This location already exists."); distance 0.1–5 km, one decimal. DELETE returns 409 while any listing that is not deleted or removed uses it. |

## Notifications
| Method | Path | Notes |
|---|---|---|
| GET | /notifications | Any signed-in role. Current user's, newest first, paginated, with `unreadCount`. Each item: `{ id, type, text, link, read, createdAt }`. |
| POST | /notifications/:id/read | Returns `{ unreadCount }`. Someone else's notification answers 404. |
| POST | /notifications/read-all | Returns `{ unreadCount: 0 }`. |

Events that create one (Phase 7): inquiry received (landlord), landlord reply (student), listing submitted (landlord, and every active admin), availability changed on an approved listing (every student who saved it; a second change inside the 60-second Undo window takes the first notice back instead), new report (every active admin). Listing approved / changes requested / rejected / removed are sent by the admin actions in Phase 6.

## Support
| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | /support | 🌐 | `{ name, email, topic, message (10–2000) }`. Sent to the support team through the `mailer` (printed to the API console in development) and logged as an `ActivityLog` row. 5 per 15 minutes per address. `topic` is SEARCH, ACCOUNT, LISTING or PROBLEM. |

Every moderation and landlord action writes an `ActivityLog` row.
