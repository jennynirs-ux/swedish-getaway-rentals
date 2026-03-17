-- BL-010: Add transport_distances JSONB column to properties
-- Stores host-editable distances to airports, train stations, bus stops, etc.
-- Format: [{ "name": "Gothenburg Airport", "distance": 45, "type": "airport" }, ...]

ALTER TABLE properties
ADD COLUMN IF NOT EXISTS transport_distances JSONB DEFAULT '[]'::jsonb;

-- Allow hosts to update their own property transport distances
-- (Existing RLS on properties already handles host-level update access)

COMMENT ON COLUMN properties.transport_distances IS 'Host-editable distances to nearby transport hubs (airports, train stations, bus stops, etc.)';
