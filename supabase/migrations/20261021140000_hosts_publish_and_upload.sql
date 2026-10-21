-- Hosts publish their own listings (decision 21 Oct 2026: no admin review) and
-- upload their own photos.

-- Publishing no longer needs an admin; publishing still closes any open review
create or replace function public.prevent_self_publish()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if new.active is true then
    new.pending_approval := false;
  end if;
  return new;
end;
$$;

-- Photos and videos: the host gallery uploads to <property id>/<file>, which
-- only admins could do, so a new host's upload failed
create policy "Hosts can upload images for their properties"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'property-images'
    and (storage.foldername(name))[1] in (
      select pr.id::text from public.properties pr
      join public.profiles pf on pf.id = pr.host_id
      where pf.user_id = auth.uid()
    )
  );

create policy "Hosts can replace images for their properties"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'property-images'
    and (storage.foldername(name))[1] in (
      select pr.id::text from public.properties pr
      join public.profiles pf on pf.id = pr.host_id
      where pf.user_id = auth.uid()
    )
  );

create policy "Hosts can delete images for their properties"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'property-images'
    and (storage.foldername(name))[1] in (
      select pr.id::text from public.properties pr
      join public.profiles pf on pf.id = pr.host_id
      where pf.user_id = auth.uid()
    )
  );
