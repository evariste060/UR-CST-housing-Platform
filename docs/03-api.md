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
| PATCH | /me/contact-preferences | 🏠 | `{ allowPhone, allowWhatsapp, allowInApp }`; at least one must stay on. |

## Properties (public)
| Method | Path | Who | Notes |
|---|---|---|---|
| GET | /properties | 🌐 | Approved only. Query: `q, locationId, minRent, maxRent, maxDistance, types=SINGLE,SHARED, layout=any\|self\|shared, water, electricity, privateBath, security, rooms=any\|1\|2, availableOnly, sort=recommended\|price-asc\|price-desc\|distance, page, pageSize`. Returns `{ items, total, page, pageSize }`. |
| GET | /properties/featured | 🌐 | 3 most recently approved available listings. |
| GET | /properties/:id | 🌐 | Approved only for the public; owner and admin can see any status. Records a view for logged-in students. Includes landlord display name and only the enabled contact methods. |
| POST | /properties/:id/reports | 🌐 | `{ reason, details? }`; notifies admins. |
| GET | /locations | 🌐 | For filters and the wizard. |
| POST | /search/parse | 🌐 | `{ text }` → filters object (smart search; also used by the header search). |

## Student
| Method | Path | Notes |
|---|---|---|
| GET/POST/DELETE | /me/saved, /me/saved/:propertyId | Save is idempotent. |
| POST | /me/saved/merge | `{ propertyIds }` from guest localStorage after login. |
| GET / DELETE | /me/history | Recently viewed + recent searches; DELETE clears both. |
| POST | /me/searches | `{ label, filters }` |
| GET | /me/inquiries | Student's inquiries with last message and replied flag. |
| POST | /properties/:id/inquiries | 🎓 `{ message }` (≥ 10 chars). Creates inquiry + first message, notifies landlord. |

## Landlord
| Method | Path | Notes |
|---|---|---|
| GET | /landlord/summary | Totals: properties, available, occupied, pending; recent inquiries. |
| GET | /landlord/properties | `?filter=all\|available\|occupied\|pending` |
| POST | /landlord/properties | Creates a DRAFT (wizard step 1 autosave). |
| PATCH | /landlord/properties/:id | Partial update (autosave). Editing an APPROVED listing does not change it until submit. |
| POST | /landlord/properties/:id/photos | multipart, max 10 photos, jpg/png/webp, ≤ 5 MB each. |
| PATCH | /landlord/properties/:id/photos | `{ order: [photoId…], coverId }` |
| DELETE | /landlord/properties/:id/photos/:photoId | |
| POST | /landlord/properties/:id/submit | Validates all steps; sets PENDING; notifies admins. |
| PATCH | /landlord/properties/:id/availability | `{ availability }`; returns previous value for Undo; notifies students who saved it. |
| DELETE | /landlord/properties/:id | Soft delete. `POST /landlord/properties/:id/restore` for Undo. |
| GET | /landlord/inquiries | `?status=all\|new\|handled` |
| GET | /landlord/inquiries/:id | Thread. |
| POST | /landlord/inquiries/:id/messages | Reply; marks HANDLED; notifies student. |
| PATCH | /landlord/inquiries/:id | `{ status }` |

## Admin
| Method | Path | Notes |
|---|---|---|
| GET | /admin/summary | Counts + recent activity + items needing attention. |
| GET | /admin/listings | `?status=PENDING…` |
| GET | /admin/listings/:id | Includes checklist results. |
| POST | /admin/listings/:id/approve | |
| POST | /admin/listings/:id/request-changes | `{ note }` required |
| POST | /admin/listings/:id/reject | `{ note }` required |
| POST | /admin/listings/:id/remove | `{ note }` required; optional `reportId` to resolve it too |
| GET | /admin/users | `?role=&q=&page=` |
| GET | /admin/users/:id | |
| PATCH | /admin/users/:id/status | `{ status }`; admins cannot suspend themselves |
| GET | /admin/reports | `?status=OPEN\|RESOLVED` |
| POST | /admin/reports/:id/resolve | `{ note }` required |
| GET/POST/PATCH/DELETE | /admin/locations(/:id) | Unique name; distance 0.1–5; DELETE returns 409 if listings use it |

## Notifications
| Method | Path | Notes |
|---|---|---|
| GET | /notifications | Current user's, newest first, with `unreadCount`. |
| POST | /notifications/:id/read | |
| POST | /notifications/read-all | |

Every moderation and landlord action writes an `ActivityLog` row.
