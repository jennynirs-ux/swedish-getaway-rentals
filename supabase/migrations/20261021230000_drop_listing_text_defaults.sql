-- New hosts' listings were created with the old marketing lines as column
-- defaults ("Experience luxury…", "Your perfect escape awaits.", "Available
-- year-round", a boilerplate introduction and a 2-hour response promise), which
-- then showed on their pages as if the host had written them.
alter table public.properties
  alter column tagline_line1 drop default,
  alter column tagline_line2 drop default,
  alter column availability_text drop default,
  alter column introduction_text drop default,
  alter column contact_response_time drop default;

-- Clear the defaults where they were stored on listings other than the owners'
-- two cabins (whose text was written for them)
update public.properties
set tagline_line1 = nullif(tagline_line1, 'Experience luxury in the heart of Swedish nature.'),
    tagline_line2 = nullif(tagline_line2, 'Your perfect escape awaits.'),
    availability_text = nullif(availability_text, 'Available year-round'),
    introduction_text = case when introduction_text like 'Every corner has been thoughtfully designed to provide the ultimate combination%' then null else introduction_text end,
    contact_response_time = nullif(contact_response_time, 'We typically respond to inquiries within 2 hours.')
where coalesce(slug, '') not in ('lakefront-retreat', 'lakehouse-getaway');
