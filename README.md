# Footprints

## Named trips

Create a trip from the dashboard with a name, start date, and end date. Select that
trip when adding or editing a visited city. A trip can contain several countries,
and repeat visits to the same city can belong to different trips. Use the trip
selector on the dashboard or travel timeline to filter the map, visits, and stats.
Select a trip and choose **Edit trip** to rename it or adjust its date range.
All city and attraction visit dates must fall within the trip's inclusive range.

### Database upgrade

With the existing schema and `database/2026-06-29_trips_and_city_location_dates.sql`
already installed, configure `backend/.env` with `DATABASE_URL`, then run:

```sh
cd backend
npm run migrate:named-trips
```

Run this before starting the updated backend, and deploy the updated frontend
together with it. The command detects an already upgraded schema and skips it.
Existing trip IDs and visits are retained. Old country groups become trips named
`<country> memories`, with ranges derived from their city and attraction dates.
Empty legacy trips use their creation date. Historical holidays are not split
automatically; create separate trips and reassign visits through **Edit**.

### API

All endpoints require the existing Bearer token.

- `GET /api/trips`: lists the signed-in user's trips.
- `POST /api/trips`: creates a trip using `{ "name": "Japan Spring 2026", "startDate": "2026-04-01", "endDate": "2026-04-15" }`.
- `PUT /api/trips/:id`: updates the same fields; rejects ranges excluding saved visits.
- `POST /api/locations` and `PUT /api/locations/:id`: now require `tripId` belonging to the user, alongside the existing location fields.

Dates use `YYYY-MM-DD`. Trip names need not be unique. Countries remain properties
of visited cities; they no longer determine trip membership.

### Verification

Run `npm test` in `backend`. With `DATABASE_URL` configured, the integration suite
uses isolated PostgreSQL temporary tables and rolls back its work, without changing
application data. Without that setting, the database suite is skipped.
Run `npm run build` and `npm run lint` in `frontend`.
