-- Migration 010: convert organizations.sector from ENUM to TEXT
-- This removes the sector_type ENUM constraint, allowing any sector value
-- (finance, education, other, etc.) without needing enum migrations in the future.

-- Step 1: change the column type to TEXT (casting through text is safe for enums)
ALTER TABLE organizations
  ALTER COLUMN sector TYPE TEXT USING sector::TEXT;

-- Step 2: drop the now-unused enum type
DROP TYPE IF EXISTS sector_type;
