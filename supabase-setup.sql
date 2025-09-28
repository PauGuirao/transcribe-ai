-- Supabase Storage Setup for Organization Images
-- Run this script in your Supabase SQL Editor

-- 1. Create the organization_images storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'organization_images',
  'organization_images',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- 2. Create RLS policy for uploading organization images
-- Allow authenticated users to upload images for their organization
CREATE POLICY "Users can upload organization images" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'organization_images' 
  AND auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM organization_members om
    JOIN profiles p ON p.id = auth.uid()
    WHERE om.user_id = auth.uid()
    AND om.organization_id = p.current_organization_id
    AND om.role IN ('admin', 'owner')
  )
);

-- 3. Create RLS policy for viewing organization images
-- Allow public access to view organization images (since bucket is public)
CREATE POLICY "Anyone can view organization images" ON storage.objects
FOR SELECT USING (bucket_id = 'organization_images');

-- 4. Create RLS policy for updating organization images
-- Allow organization admins/owners to update images
CREATE POLICY "Organization admins can update images" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'organization_images'
  AND auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM organization_members om
    JOIN profiles p ON p.id = auth.uid()
    WHERE om.user_id = auth.uid()
    AND om.organization_id = p.current_organization_id
    AND om.role IN ('admin', 'owner')
  )
);

-- 5. Create RLS policy for deleting organization images
-- Allow organization admins/owners to delete images
CREATE POLICY "Organization admins can delete images" ON storage.objects
FOR DELETE USING (
  bucket_id = 'organization_images'
  AND auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM organization_members om
    JOIN profiles p ON p.id = auth.uid()
    WHERE om.user_id = auth.uid()
    AND om.organization_id = p.current_organization_id
    AND om.role IN ('admin', 'owner')
  )
);

-- 6. Enable RLS on storage.objects if not already enabled
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Verify the setup
SELECT 
  id, 
  name, 
  public, 
  file_size_limit, 
  allowed_mime_types 
FROM storage.buckets 
WHERE id = 'organization_images';