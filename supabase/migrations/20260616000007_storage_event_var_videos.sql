-- Bucket privado para vídeos VAR (replay de revisão).
-- Service-role uploads; admin authenticated lê via signed URL.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'event-var-videos', 'event-var-videos', false, 52428800,
  array['video/webm', 'video/mp4', 'video/x-matroska']
)
on conflict (id) do update set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types,
  public = excluded.public;

drop policy if exists "var_videos_admin_all" on storage.objects;
create policy "var_videos_admin_all" on storage.objects
  for all
  to authenticated
  using (bucket_id = 'event-var-videos' and public.is_event_admin(auth.uid()))
  with check (bucket_id = 'event-var-videos' and public.is_event_admin(auth.uid()));
