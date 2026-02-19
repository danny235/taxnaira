
-- Fix Storage RLS Policies for TaxNaira
-- Ensure the storage.objects table has policies for the tax_documents bucket

-- 1. Enable RLS on storage.objects (just in case it's not enabled, though usually it is)
-- Note: Typically SUPABASE manages this, but we should ensure policies exist.

DO $$
BEGIN
    -- Policy for Uploading
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'Users can upload their own tax documents'
    ) THEN
        CREATE POLICY "Users can upload their own tax documents"
        ON storage.objects FOR INSERT
        TO authenticated
        WITH CHECK (
            bucket_id = 'tax_documents' AND
            (storage.foldername(name))[1] = auth.uid()::text
        );
    END IF;

    -- Policy for Viewing
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'Users can view their own tax documents'
    ) THEN
        CREATE POLICY "Users can view their own tax documents"
        ON storage.objects FOR SELECT
        TO authenticated
        USING (
            bucket_id = 'tax_documents' AND
            (storage.foldername(name))[1] = auth.uid()::text
        );
    END IF;

    -- Policy for Deleting
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'Users can delete their own tax documents'
    ) THEN
        CREATE POLICY "Users can delete their own tax documents"
        ON storage.objects FOR DELETE
        TO authenticated
        USING (
            bucket_id = 'tax_documents' AND
            (storage.foldername(name))[1] = auth.uid()::text
        );
    END IF;
END
$$;
