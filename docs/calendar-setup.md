# Private Google Calendar availability

The current site runs in explicit demo mode, as requested. Both the UI and the prepared enquiry identify the dates as sample data. Nothing in demo mode claims to represent real property bookings.

## Recommended: secret iCal link (no Google Cloud)

1. Sign in to Google Calendar with the owner's account and create **one** calendar for all villas, e.g. **Lit Stays bookings** (Settings → Add calendar → Create new calendar). Set its timezone to **Asia/Kolkata**.
2. Open **Settings → Lit Stays bookings → Integrate calendar** and copy **Secret address in iCal format**. Treat it like a password: anyone with it can read the calendar. If it leaks, click **Reset** there and update Vercel.
3. In **Vercel → Project → Settings → Environment Variables**, add:

   | Variable | Value |
   | --- | --- |
   | `AVAILABILITY_MODE` | `ical` |
   | `NEXT_PUBLIC_AVAILABILITY_MODE` | `live` |
   | `GOOGLE_CALENDAR_ICAL_URL` | the secret address (server only, never `NEXT_PUBLIC_`) |

4. Redeploy. The villa calendars switch from "Sample availability" to the real bookings.

The server reads the link itself; it never reaches the browser, and only booked date ranges are returned. Google can take a few minutes, sometimes longer, to update a secret iCal feed after an edit, on top of the site's 60-second cache. Repeating (recurring) events are not supported in this mode: only their first occurrence counts, so add each booking as its own event.

## Alternative: service account (Google Cloud)

### Create the dedicated calendar

1. In Google Calendar, create **one** separate calendar for all three villas (for example "Lit Stays bookings"). Keep it private and set its timezone to **Asia/Kolkata**.
2. In a Google Cloud project, enable the Google Calendar API.
3. Create a dedicated service account. It does not need broad project-level IAM roles or domain-wide delegation.
4. Share only this bookings calendar with the service account's email, with **See all event details** access. The service uses the `calendar.events.readonly` OAuth scope. It reads each event's title (to tell which villa it belongs to) and dates, never descriptions, attendees or contact information, and it never sends titles to the browser.
5. Create a service-account key and store its email and private key in the production server's secret/environment configuration. Do not put them in any `NEXT_PUBLIC_` variable, source file, or frontend host configuration.
6. Copy the calendar ID from Google Calendar settings. Store it only in `GOOGLE_CALENDAR_ID` on the server.

Google references: [service-account authentication](https://developers.google.com/identity/protocols/oauth2/service-account), [events.list range and recurrence semantics](https://developers.google.com/workspace/calendar/api/v3/reference/events/list).

## Environment configuration

Copy `.env.example` to `.env.local` for local development. The example contains placeholders only; real `.env` files are ignored by Git.

| Variable | Purpose |
| --- | --- |
| `AVAILABILITY_MODE` | Server mode: `demo` or `google` |
| `NEXT_PUBLIC_AVAILABILITY_MODE` | Frontend mode: `demo` or `google`; rebuild after changing |
| `GOOGLE_CALENDAR_ID` | Private dedicated calendar ID; server only |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Read-only service account email; server only |
| `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` | PKCS#8 PEM key; server only, literal newlines or escaped `\n` supported |
| `PROPERTY_TIMEZONE` | IANA timezone, default `Asia/Kolkata`; must match the dedicated calendar |
| `AVAILABILITY_CACHE_SECONDS` | Server cache lifetime: 5–300 seconds, default 60 |
| `AVAILABILITY_REFRESH_SECONDS` | Browser refresh interval: 15–300 seconds, default 60 |
| `GOOGLE_CALENDAR_TIMEOUT_MS` | Whole upstream operation deadline: 1000–30000 ms, default 8000 |
| `MIN_STAY_NIGHTS` | Optional owner-confirmed minimum; blank means no additional minimum |
| `NEXT_PUBLIC_AVAILABILITY_API_URL` | Optional separate API origin; blank uses same-origin `/api/availability` |
| `AVAILABILITY_ALLOWED_ORIGIN` | Comma-separated explicit frontend origins when using a separate API |
| `PORT` | Production HTTP port, default 3000 |
| `LITSTAYS_HOST` | Bind address; use `0.0.0.0` on a production Node host |

For live use, set **both** modes to `google`, configure the private server variables, rebuild, and restart. Missing credentials, malformed responses, or a demo response returned to a live client cause a recoverable error; they never fall back to an empty "available" calendar.

```sh
npm ci
npm run dev
```

For a Node production host:

```sh
npm run build
LITSTAYS_HOST=0.0.0.0 npm start
```

Keep secrets in the Node host's secret manager. `npm start` serves both the static frontend and the API. The separate development API is started automatically by `npm run dev`.

### Vercel

On Vercel (`VERCEL=1` during the build) the site is built as a normal Next.js app instead of a static export, and `src/app/api/availability/route.server.ts` serves `/api/availability` as a Vercel Function. Add the server variables above in **Vercel → Project → Settings → Environment Variables**, set both modes to `google`, then redeploy. Leave `NEXT_PUBLIC_AVAILABILITY_API_URL` blank.

### Other static hosts

The current Sites publication is a static demo. To keep using a static frontend host with a live calendar, deploy the included Node API separately, configure its allowed frontend origin, set the frontend's public API origin and `google` mode, and rebuild. Never move server credentials into the static host's public build environment.

## Owner workflow and occupied nights

All three villas share the one calendar. **The event title decides which villa it blocks**: it must contain the villa's name — `Archway`, `Avante` or `Aurania` (any capitals). Anything else in the title is ignored and stays private, so `Archway – Sharma family`, `avante owner stay` or `AURANIA maintenance` all work.

- A title naming two villas (`Archway + Avante wedding`) blocks both.
- A title naming no villa (`Dentist`, or no title) blocks **nothing** on the website.
- The name must be the whole word: `Archways` does not match.

Create an event from the **check-in date to the checkout date** for every booking, owner block, or maintenance period. Only the dates matter, not the times. Even transparent events block nights.

An event shown as **28–30 November** means check-in 28, checkout 30: the nights of 28 and 29 November are booked for that villa, and **30 November stays bookable**, so another guest can book 30 November–1 December. An event on a single date (for example maintenance on 7 November) blocks that one night. The villa-to-name mapping lives in `villaCalendarNames` in `src/lib/availability-rules.ts`.

Back-to-back bookings work naturally: 12–15 November followed by 15–18 November blocks the nights 12–17 and leaves 18 November free. Timed events are read the same way, by their start and end dates in the property timezone, ignoring the hours.

Recurring events are expanded by Google with `singleEvents=true`, all pages are collected, and cancelled events are excluded. Date calculations use the configured timezone, including DST-aware range boundaries where that timezone observes DST.

## API and freshness

`GET /api/availability?villa=villa-archway|villa-avante|villa-aurania&from=YYYY-MM-DD&to=YYYY-MM-DD` returns, for that villa only, status, unavailable date ranges, requested bounds, timezone, configured minimum stay, and freshness/refresh information. The `to` boundary is exclusive. Requests are bounded to one year, pagination is bounded, and public traffic has an in-memory rate limit.

`fresh=1` bypasses the server cache. The enquiry form performs this check before preparing its message. An error at this stage prevents a prepared enquiry from being represented as checked; a separate Instagram link remains available to contact the host directly.

Default cache and browser refresh intervals are 60 seconds each. An owner update can therefore take roughly the combined cache and polling windows, plus upstream/network time, to appear. No instantaneous-sync promise is made. Expired cached availability is never returned when the upstream request fails.

In-memory caches and limits apply per server process. For a high-traffic multi-instance installation, use a shared cache and rate limiter at the hosting layer. Behind a reverse proxy, the default limiter sees the proxy's network address; use the host's trusted client-IP/rate-limit facilities rather than trusting arbitrary forwarded headers.

No Google Calendar writes or reservations are created. This read-only check is not a reservation lock. Direct confirmed bookings would require separate atomic conflict detection and persistence.

## Verification

`npm test` covers per-villa title matching from the shared calendar, booked nights, checkout boundaries, multi-night stays, consecutive reservations, owner blocks, month-spanning events, timezone and DST boundaries, cancellations, empty calendars, API failures, stale cache rejection, a whole-operation timeout, fresh-check cache bypass, stale-response races, and privacy-safe responses. Browser tests cover calendar selection, unavailable nights, boundary checkout, keyboard controls, enquiry synchronization, responsive widths, and preview labeling.

Live credentials and access to an actual dedicated Google Calendar have not been tested; the owner requested dummy data for this version.
