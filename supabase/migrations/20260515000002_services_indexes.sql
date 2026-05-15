-- Add missing indexes on FK columns for services catalog tables.
CREATE INDEX IF NOT EXISTS idx_services_photographer_id ON services(photographer_id);
CREATE INDEX IF NOT EXISTS idx_booking_services_booking_id ON booking_services(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_services_photographer_id ON booking_services(photographer_id);
CREATE INDEX IF NOT EXISTS idx_booking_services_service_id ON booking_services(service_id);
CREATE INDEX IF NOT EXISTS idx_package_template_services_template_id ON package_template_services(package_template_id);
CREATE INDEX IF NOT EXISTS idx_package_template_services_photographer_id ON package_template_services(photographer_id);
