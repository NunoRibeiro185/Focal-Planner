-- Add a free-text location field to bookings (e.g. "Porto, Portugal").
-- Used by the availability calendar panel header to show where/when at a glance.
alter table bookings add column location text;
