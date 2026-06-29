BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  country_name VARCHAR(120) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS trips_user_country_unique
  ON trips (user_id, LOWER(country_name));

ALTER TABLE visited_locations
  ADD COLUMN IF NOT EXISTS trip_id UUID REFERENCES trips(id) ON DELETE CASCADE;

INSERT INTO trips (user_id, country_name)
SELECT DISTINCT user_id, country
FROM visited_locations
WHERE country IS NOT NULL
ON CONFLICT DO NOTHING;

UPDATE visited_locations vl
SET trip_id = t.id
FROM trips t
WHERE t.user_id = vl.user_id
  AND LOWER(t.country_name) = LOWER(vl.country)
  AND vl.trip_id IS NULL;

ALTER TABLE visited_locations
  ALTER COLUMN trip_id SET NOT NULL;

ALTER TABLE visited_city_locations
  ADD COLUMN IF NOT EXISTS visit_date DATE,
  ADD COLUMN IF NOT EXISTS latitude NUMERIC(10, 6),
  ADD COLUMN IF NOT EXISTS longitude NUMERIC(10, 6);

UPDATE visited_city_locations vcl
SET visit_date = vl.visit_date
FROM visited_locations vl
WHERE vcl.visited_location_id = vl.id
  AND vcl.visit_date IS NULL;

ALTER TABLE visited_city_locations
  ALTER COLUMN visit_date SET NOT NULL;

CREATE INDEX IF NOT EXISTS visited_locations_trip_id_idx
  ON visited_locations (trip_id);

CREATE INDEX IF NOT EXISTS visited_city_locations_visit_date_idx
  ON visited_city_locations (visit_date);

COMMIT;
