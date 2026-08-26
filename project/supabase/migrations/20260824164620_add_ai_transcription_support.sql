/*
# Add AI transcription and classification support

## Overview
Adds columns for storing AI-generated transcriptions and classifications on videos,
plus a settings table for storing the OpenAI API key securely (server-side only).

## Changes

### Modified Tables
1. **videos** - Added columns:
   - `transcription` (text) - AI-generated transcription of the video audio
   - `ai_category` (text) - AI-suggested category name
   - `ai_module` (text) - AI-suggested module name
   - `ai_summary` (text) - AI-generated summary of what the video teaches
   - `ai_key_steps` (text) - AI-extracted key steps
   - `ai_processed` (boolean) - Whether AI processing has been completed
   - `file_path` (text) - Path to the uploaded file in Supabase Storage

### New Tables
2. **app_settings** - Stores app configuration like the OpenAI API key
   - `id` (uuid, primary key)
   - `user_id` (uuid, owner)
   - `openai_api_key` (text) - Encrypted API key for OpenAI services
   - `created_at` (timestamp)
   - `updated_at` (timestamp)

## Security
- RLS enabled on app_settings with owner-scoped CRUD
- The OpenAI API key is stored in the database and only accessed by edge functions
  (server-side), never exposed to the frontend client

## Important Notes
1. The API key is stored per-user in app_settings
2. Edge functions read the key server-side using the service role key
3. Frontend never directly accesses the API key
*/

-- Add transcription columns to videos
ALTER TABLE videos
  ADD COLUMN IF NOT EXISTS transcription text,
  ADD COLUMN IF NOT EXISTS ai_category text,
  ADD COLUMN IF NOT EXISTS ai_module text,
  ADD COLUMN IF NOT EXISTS ai_summary text,
  ADD COLUMN IF NOT EXISTS ai_key_steps text,
  ADD COLUMN IF NOT EXISTS ai_processed boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS file_path text;

-- Create app_settings table
CREATE TABLE IF NOT EXISTS app_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  openai_api_key text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_settings" ON app_settings;
CREATE POLICY "select_own_settings" ON app_settings FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_settings" ON app_settings;
CREATE POLICY "insert_own_settings" ON app_settings FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_settings" ON app_settings;
CREATE POLICY "update_own_settings" ON app_settings FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_settings" ON app_settings;
CREATE POLICY "delete_own_settings" ON app_settings FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Create unique constraint so each user has only one settings row
CREATE UNIQUE INDEX IF NOT EXISTS idx_app_settings_user ON app_settings(user_id);
