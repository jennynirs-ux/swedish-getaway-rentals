-- Point property images at WebP copies (max 1600 px, most under 300 kB, plus
-- a "-800.webp" copy for small screens) in property-images/optimized/.
-- The originals (3-10 MB each, 138 MB in total) stay in storage untouched;
-- to go back, run the same replace with the columns of the mapping swapped.
CREATE TEMP TABLE image_map (old_path text PRIMARY KEY, new_path text NOT NULL) ON COMMIT DROP;
INSERT INTO image_map (old_path, new_path) VALUES
  ('6618e8ae-e1ff-4a3b-8f6b-b3287c881d12/1760018794928-AA20A6CC-584D-4754-9264-60E8218B0B64.jpeg', 'optimized/6618e8ae-e1ff-4a3b-8f6b-b3287c881d12/1760018794928-AA20A6CC-584D-4754-9264-60E8218B0B64.webp'),
  ('6618e8ae-e1ff-4a3b-8f6b-b3287c881d12/1760018853577-IMG_8181.jpeg', 'optimized/6618e8ae-e1ff-4a3b-8f6b-b3287c881d12/1760018853577-IMG_8181.webp'),
  ('6618e8ae-e1ff-4a3b-8f6b-b3287c881d12/1760018879752-IMG_8144.jpeg', 'optimized/6618e8ae-e1ff-4a3b-8f6b-b3287c881d12/1760018879752-IMG_8144.webp'),
  ('6618e8ae-e1ff-4a3b-8f6b-b3287c881d12/1760018905435-IMG_8142.jpeg', 'optimized/6618e8ae-e1ff-4a3b-8f6b-b3287c881d12/1760018905435-IMG_8142.webp'),
  ('6618e8ae-e1ff-4a3b-8f6b-b3287c881d12/1760018947953-IMG_8107.jpeg', 'optimized/6618e8ae-e1ff-4a3b-8f6b-b3287c881d12/1760018947953-IMG_8107.webp'),
  ('6618e8ae-e1ff-4a3b-8f6b-b3287c881d12/1760019176981-IMG_6957.jpeg', 'optimized/6618e8ae-e1ff-4a3b-8f6b-b3287c881d12/1760019176981-IMG_6957.webp'),
  ('properties/1757316566343-n2p6xkav3sb.avif', 'optimized/properties/1757316566343-n2p6xkav3sb.webp'),
  ('properties/1757316963650-zt4b06c9d9r.jpeg', 'optimized/properties/1757316963650-zt4b06c9d9r.webp'),
  ('properties/1760005052639-nhrjymiluh.jpeg', 'optimized/properties/1760005052639-nhrjymiluh.webp'),
  ('properties/1760005073961-toaik830r7.jpeg', 'optimized/properties/1760005073961-toaik830r7.webp'),
  ('properties/1760005609004-a88xixsspk7.jpeg', 'optimized/properties/1760005609004-a88xixsspk7.webp'),
  ('properties/1760005684010-q1txokac9h.jpeg', 'optimized/properties/1760005684010-q1txokac9h.webp'),
  ('properties/1760006149337-44dg1sinf9e.jpeg', 'optimized/properties/1760006149337-44dg1sinf9e.webp'),
  ('properties/1760364754510-lgm70p4vxba.jpeg', 'optimized/properties/1760364754510-lgm70p4vxba.webp'),
  ('properties/1760365317330-0m6jb00rr93q.jpeg', 'optimized/properties/1760365317330-0m6jb00rr93q.webp'),
  ('properties/1764617857353-rgr45yjiu49.jpeg', 'optimized/properties/1764617857353-rgr45yjiu49.webp'),
  ('properties/1764617956444-vldvw7bvya.jpeg', 'optimized/properties/1764617956444-vldvw7bvya.webp'),
  ('properties/1764618015968-euca4b73x3k.jpeg', 'optimized/properties/1764618015968-euca4b73x3k.webp'),
  ('properties/gallery/1757317031870-216d95w50ow.jpeg', 'optimized/properties/gallery/1757317031870-216d95w50ow.webp'),
  ('properties/gallery/1757317031870-ish3del6fad.jpeg', 'optimized/properties/gallery/1757317031870-ish3del6fad.webp'),
  ('properties/gallery/1757317031870-kwbtw7jyrg.jpeg', 'optimized/properties/gallery/1757317031870-kwbtw7jyrg.webp'),
  ('properties/gallery/1757317031870-rok8gtnjo8d.jpeg', 'optimized/properties/gallery/1757317031870-rok8gtnjo8d.webp'),
  ('properties/gallery/1757317031870-wn2udmpn6i.jpeg', 'optimized/properties/gallery/1757317031870-wn2udmpn6i.webp'),
  ('properties/gallery/1757317353773-2nrbpabfsat.jpeg', 'optimized/properties/gallery/1757317353773-2nrbpabfsat.webp'),
  ('properties/gallery/1757317353776-3olavwxrsnp.jpeg', 'optimized/properties/gallery/1757317353776-3olavwxrsnp.webp'),
  ('properties/gallery/1757317353776-6oezdu06ar.jpeg', 'optimized/properties/gallery/1757317353776-6oezdu06ar.webp'),
  ('properties/gallery/1757317353776-qjdlcuc9kwr.jpeg', 'optimized/properties/gallery/1757317353776-qjdlcuc9kwr.webp'),
  ('properties/gallery/1757489200559-78ld6dt2ezj.jpeg', 'optimized/properties/gallery/1757489200559-78ld6dt2ezj.webp'),
  ('properties/gallery/1757489200559-7de4q6jd9tc.jpeg', 'optimized/properties/gallery/1757489200559-7de4q6jd9tc.webp'),
  ('properties/gallery/1757489200559-ag06krct36c.jpeg', 'optimized/properties/gallery/1757489200559-ag06krct36c.webp'),
  ('properties/gallery/1757489298619-a2jidz8qon.jpeg', 'optimized/properties/gallery/1757489298619-a2jidz8qon.webp'),
  ('properties/gallery/1757489298619-cficz0tlhik.jpeg', 'optimized/properties/gallery/1757489298619-cficz0tlhik.webp'),
  ('properties/gallery/1757489298619-p6rhz6xjog.jpeg', 'optimized/properties/gallery/1757489298619-p6rhz6xjog.webp'),
  ('properties/gallery/1757507042306-4z5mepy46j9.jpeg', 'optimized/properties/gallery/1757507042306-4z5mepy46j9.webp'),
  ('properties/gallery/1757507042307-r5ri0m1t8kq.jpeg', 'optimized/properties/gallery/1757507042307-r5ri0m1t8kq.webp'),
  ('properties/gallery/1757507042307-rmm53vnhjb9.jpeg', 'optimized/properties/gallery/1757507042307-rmm53vnhjb9.webp'),
  ('properties/gallery/1757507042307-xrrm50ne00j.jpeg', 'optimized/properties/gallery/1757507042307-xrrm50ne00j.webp');

DO $$
DECLARE
  _base constant text := 'https://bbuutvozqfzbsnllsiai.supabase.co/storage/v1/object/public/property-images/';
  _m record;
BEGIN
  FOR _m IN SELECT * FROM image_map LOOP
    UPDATE public.properties SET
      hero_image_url     = replace(hero_image_url, _base || _m.old_path, _base || _m.new_path),
      gallery_images     = replace(gallery_images::text, _base || _m.old_path, _base || _m.new_path)::text[],
      guidebook_sections = replace(guidebook_sections::text, _base || _m.old_path, _base || _m.new_path)::jsonb,
      amenities_data     = replace(amenities_data::text, _base || _m.old_path, _base || _m.new_path)::jsonb,
      featured_amenities = replace(featured_amenities::text, _base || _m.old_path, _base || _m.new_path)::jsonb
    WHERE row_to_json(properties)::text LIKE '%' || _m.old_path || '%';
  END LOOP;
END $$;
