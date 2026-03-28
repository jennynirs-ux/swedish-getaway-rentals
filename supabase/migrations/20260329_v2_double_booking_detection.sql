-- V2 Phase 1: Double-booking detection RPC
-- Returns overlapping booking pairs for alerting and dashboard display

CREATE OR REPLACE FUNCTION public.detect_double_bookings(
  property_id_param UUID DEFAULT NULL
)
RETURNS TABLE (
  booking_a_id UUID,
  booking_b_id UUID,
  property_id UUID,
  property_title TEXT,
  overlap_start DATE,
  overlap_end DATE
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    a.id AS booking_a_id,
    b.id AS booking_b_id,
    a.property_id,
    p.title AS property_title,
    GREATEST(a.check_in_date::date, b.check_in_date::date) AS overlap_start,
    LEAST(a.check_out_date::date, b.check_out_date::date) AS overlap_end
  FROM bookings a
  JOIN bookings b ON a.property_id = b.property_id
    AND a.id < b.id
    AND a.check_in_date::date < b.check_out_date::date
    AND b.check_in_date::date < a.check_out_date::date
  JOIN properties p ON p.id = a.property_id
  WHERE a.status IN ('confirmed', 'pending')
    AND b.status IN ('confirmed', 'pending')
    AND (property_id_param IS NULL OR a.property_id = property_id_param);
$$;

COMMENT ON FUNCTION public.detect_double_bookings IS
'Returns all overlapping booking pairs. Pass property_id to filter, or NULL for all properties.';
