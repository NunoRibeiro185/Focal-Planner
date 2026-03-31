-- Allow booking_tasks to exist without a booking (general/standalone tasks).
-- A null booking_id means the task is not tied to any specific booking.
alter table booking_tasks alter column booking_id drop not null;
