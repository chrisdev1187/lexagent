-- Create private vault-docs storage bucket
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'vault-docs',
  'vault-docs',
  false,
  52428800, -- 50 MB
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg',
    'image/png',
    'image/gif',
    'text/plain'
  ]
)
on conflict (id) do nothing;

-- Allow authenticated users to upload to their own folder ({uid}/...)
create policy "vault_docs_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'vault-docs'
    and (string_to_array(name, '/'))[1] = auth.uid()::text
  );

-- Allow users to read their own files
create policy "vault_docs_select" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'vault-docs'
    and (string_to_array(name, '/'))[1] = auth.uid()::text
  );

-- Allow users to delete their own files
create policy "vault_docs_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'vault-docs'
    and (string_to_array(name, '/'))[1] = auth.uid()::text
  );
