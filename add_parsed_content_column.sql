-- Add parsed_content column for caching extracted text between batch requests
-- This avoids re-downloading and re-parsing files on every batch

ALTER TABLE uploaded_files ADD COLUMN IF NOT EXISTS parsed_content TEXT;

COMMENT ON COLUMN uploaded_files.parsed_content IS 'Cached plain text content from file parsing. Used to speed up batched AI extraction by skipping re-download/re-parse on subsequent batches.';
