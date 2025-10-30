-- Add columns to support closing flags and per-person slot times
ALTER TABLE business_requirements
  ADD COLUMN IF NOT EXISTS chef_end_is_closing boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS kitchen_end_is_closing boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS chef_slots jsonb,
  ADD COLUMN IF NOT EXISTS kitchen_slots jsonb;

-- Enforce one row per day (API also enforces this)
CREATE UNIQUE INDEX IF NOT EXISTS business_requirements_day_unique_idx
  ON business_requirements (day_of_week);

-- Optional: ensure day names are restricted to Monday-Sunday (uncomment if desired and data is clean)
-- ALTER TABLE business_requirements
--   ADD CONSTRAINT business_requirements_day_check
--   CHECK (day_of_week IN ('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'));


