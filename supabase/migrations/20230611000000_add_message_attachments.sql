-- Create storage bucket for message attachments
INSERT INTO storage.buckets (id, name)
VALUES ('message-attachments', 'message-attachments')
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload message attachments
CREATE POLICY "Allow authenticated users to upload message attachments"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'message-attachments');

-- Allow authenticated users to view message attachments
CREATE POLICY "Allow authenticated users to view message attachments"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'message-attachments');

-- Allow users to delete their own message attachments
CREATE POLICY "Allow users to delete their own message attachments"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'message-attachments' AND (storage.foldername(name))[1]::bigint IN (
  SELECT channel_id FROM messages WHERE user_id = auth.uid()
));
