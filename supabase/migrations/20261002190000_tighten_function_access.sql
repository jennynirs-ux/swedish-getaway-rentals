-- Supabase security advisor, 2 October 2026.
--
-- These SECURITY DEFINER functions could be called by anyone through
-- /rest/v1/rpc, but neither the site nor any policy uses them; the only caller
-- (check_rate_limit, from send-support-email) uses the service role.
-- get_public_profiles let any signed-in account list names and locations.
revoke execute on function public.calculate_commission_split(integer, numeric) from public, anon, authenticated;
revoke execute on function public.check_enhanced_rate_limit(text, text, integer, integer, boolean) from public, anon, authenticated;
revoke execute on function public.check_rate_limit(text, integer, integer) from public, anon, authenticated;
revoke execute on function public.get_booking_statistics(uuid) from public, anon, authenticated;
revoke execute on function public.get_bookings_secure_for_user() from public, anon, authenticated;
revoke execute on function public.get_profile_statistics() from public, anon, authenticated;
revoke execute on function public.get_public_profiles() from public, anon, authenticated;

grant execute on function public.calculate_commission_split(integer, numeric) to service_role;
grant execute on function public.check_enhanced_rate_limit(text, text, integer, integer, boolean) to service_role;
grant execute on function public.check_rate_limit(text, integer, integer) to service_role;
grant execute on function public.get_booking_statistics(uuid) to service_role;
grant execute on function public.get_bookings_secure_for_user() to service_role;
grant execute on function public.get_profile_statistics() to service_role;
grant execute on function public.get_public_profiles() to service_role;

-- Still callable on purpose (each either returns nothing sensitive or checks
-- the caller itself):
--   anon + authenticated: check_booking_conflict (booking form), validate_coupon
--     (coupon field), consume_guestbook_token (guestbook link), check_user_rate_limit
--     (guest_messages insert policy), has_role and is_admin_secure_new (policies)
--   authenticated: become_host, can_manage_property_private_details (policies),
--     get_dashboard_stats, review_host_application, set_host_commission_rate
--     (admin pages; all require the admin role inside)

-- Trigger function with a fixed search_path
alter function public.update_expenses_updated_at() set search_path = public;

-- Left over from the removed cleaning_tasks table; no trigger uses it
drop function if exists public.update_cleaning_tasks_updated_at();
