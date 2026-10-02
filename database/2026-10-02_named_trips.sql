BEGIN;

ALTER TABLE trips ADD COLUMN name VARCHAR(160), ADD COLUMN start_date DATE, ADD COLUMN end_date DATE;

-- Keep every existing trip and visit; derive a range including attraction dates.
WITH dates AS (
  SELECT trip_id, visit_date FROM visited_locations
  UNION ALL
  SELECT vl.trip_id, vcl.visit_date FROM visited_city_locations vcl
  JOIN visited_locations vl ON vl.id = vcl.visited_location_id
), ranges AS (
  SELECT trip_id, MIN(visit_date) AS first_date, MAX(visit_date) AS last_date FROM dates GROUP BY trip_id
)
UPDATE trips t SET start_date = r.first_date, end_date = r.last_date FROM ranges r WHERE r.trip_id = t.id;

UPDATE trips SET name = country_name || ' memories',
  start_date = COALESCE(start_date, created_at::date, CURRENT_DATE),
  end_date = COALESCE(end_date, created_at::date, CURRENT_DATE);
DROP INDEX IF EXISTS trips_user_country_unique;
ALTER TABLE trips DROP COLUMN country_name,
  ALTER COLUMN name SET NOT NULL, ALTER COLUMN start_date SET NOT NULL, ALTER COLUMN end_date SET NOT NULL,
  ADD CONSTRAINT trips_valid_range CHECK (end_date >= start_date),
  ADD CONSTRAINT trips_name_not_blank CHECK (length(trim(name)) > 0);
CREATE INDEX trips_user_start_date_idx ON trips(user_id, start_date DESC);
COMMIT;
