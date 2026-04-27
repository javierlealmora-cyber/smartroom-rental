-- Migration: Add notes column to rooms table
-- Date: 2026-04-12
-- Description: Adds a text field for optional notes/comments on rooms

-- Add notes column to rooms table
ALTER TABLE rooms 
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add comment for documentation
COMMENT ON COLUMN rooms.notes IS 'Optional notes or comments about the room';
