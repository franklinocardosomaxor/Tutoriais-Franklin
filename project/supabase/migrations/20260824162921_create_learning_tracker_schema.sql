/*
# Learning Tracker System - Initial Schema

## Overview
A comprehensive system for tracking learning progress across videos, images, links, and tutorials. Supports multi-user access with admin-managed content.

## New Tables

1. **profiles** - Extends auth.users with role information (admin, student, collaborator, tutor)
2. **tutors** - Content creators/instructors responsible for training materials
3. **categories** - Top-level grouping for tutorials (e.g., "System Configuration")
4. **modules** - Learning modules within categories (e.g., "Module 01 - User Management")
5. **videos** - Video training content with status tracking, descriptions, and tutor assignment
6. **images** - Step-by-step visual learning sequences within modules
7. **links** - External resource links with favorite/consulted status
8. **documents** - Document-based learning materials within modules

## Content Status Values
- Videos: 'pending' (⏳) or 'implemented' (✅) with completion date
- Images: 'pending', 'viewed', or 'concluded' with review tracking
- Links: 'consulted' or 'favorite'

## Security
- RLS enabled on all tables
- Owner-scoped CRUD: each authenticated user manages their own content
- Profiles table: users can read/update their own profile
- Owner columns default to auth.uid() for seamless inserts

## Important Notes
1. All content tables include user_id for owner isolation
2. Modules belong to categories, content items belong to modules
3. Order columns enable sequencing for the recommendation system
4. Tutors are owner-scoped (each user manages their own tutor list)
*/

-- Profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text,
  role text NOT NULL DEFAULT 'student' CHECK (role IN ('admin', 'student', 'collaborator', 'tutor')),
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Tutors table
CREATE TABLE IF NOT EXISTS tutors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text,
  specialty text,
  bio text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE tutors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_tutors" ON tutors;
CREATE POLICY "select_own_tutors" ON tutors FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_tutors" ON tutors;
CREATE POLICY "insert_own_tutors" ON tutors FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_tutors" ON tutors;
CREATE POLICY "update_own_tutors" ON tutors FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_tutors" ON tutors;
CREATE POLICY "delete_own_tutors" ON tutors FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  icon text DEFAULT 'FolderOpen',
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_categories" ON categories;
CREATE POLICY "select_own_categories" ON categories FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_categories" ON categories;
CREATE POLICY "insert_own_categories" ON categories FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_categories" ON categories;
CREATE POLICY "update_own_categories" ON categories FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_categories" ON categories;
CREATE POLICY "delete_own_categories" ON categories FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Modules table
CREATE TABLE IF NOT EXISTS modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE modules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_modules" ON modules;
CREATE POLICY "select_own_modules" ON modules FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_modules" ON modules;
CREATE POLICY "insert_own_modules" ON modules FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_modules" ON modules;
CREATE POLICY "update_own_modules" ON modules FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_modules" ON modules;
CREATE POLICY "delete_own_modules" ON modules FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Videos table
CREATE TABLE IF NOT EXISTS videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  module_id uuid REFERENCES modules(id) ON DELETE SET NULL,
  tutor_id uuid REFERENCES tutors(id) ON DELETE SET NULL,
  title text NOT NULL,
  url text,
  embed_url text,
  description text,
  objective text,
  key_steps text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'implemented')),
  completed_at date,
  notes text,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE videos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_videos" ON videos;
CREATE POLICY "select_own_videos" ON videos FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_videos" ON videos;
CREATE POLICY "insert_own_videos" ON videos FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_videos" ON videos;
CREATE POLICY "update_own_videos" ON videos FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_videos" ON videos;
CREATE POLICY "delete_own_videos" ON videos FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Images table (step-by-step visual learning)
CREATE TABLE IF NOT EXISTS images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  module_id uuid REFERENCES modules(id) ON DELETE SET NULL,
  step_number int NOT NULL DEFAULT 1,
  image_url text,
  title text NOT NULL,
  explanation text,
  tutor_notes text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'viewed', 'concluded')),
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE images ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_images" ON images;
CREATE POLICY "select_own_images" ON images FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_images" ON images;
CREATE POLICY "insert_own_images" ON images FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_images" ON images;
CREATE POLICY "update_own_images" ON images FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_images" ON images;
CREATE POLICY "delete_own_images" ON images FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Links table
CREATE TABLE IF NOT EXISTS links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  module_id uuid REFERENCES modules(id) ON DELETE SET NULL,
  tutor_id uuid REFERENCES tutors(id) ON DELETE SET NULL,
  site_name text NOT NULL,
  url text NOT NULL,
  purpose text,
  status text NOT NULL DEFAULT 'consulted' CHECK (status IN ('consulted', 'favorite')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_links" ON links;
CREATE POLICY "select_own_links" ON links FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_links" ON links;
CREATE POLICY "insert_own_links" ON links FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_links" ON links;
CREATE POLICY "update_own_links" ON links FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_links" ON links;
CREATE POLICY "delete_own_links" ON links FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Documents table
CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  module_id uuid REFERENCES modules(id) ON DELETE SET NULL,
  title text NOT NULL,
  file_url text,
  description text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'studied')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_documents" ON documents;
CREATE POLICY "select_own_documents" ON documents FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_documents" ON documents;
CREATE POLICY "insert_own_documents" ON documents FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_documents" ON documents;
CREATE POLICY "update_own_documents" ON documents FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_documents" ON documents;
CREATE POLICY "delete_own_documents" ON documents FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_modules_category ON modules(category_id);
CREATE INDEX IF NOT EXISTS idx_videos_module ON videos(module_id);
CREATE INDEX IF NOT EXISTS idx_videos_user ON videos(user_id);
CREATE INDEX IF NOT EXISTS idx_images_module ON images(module_id);
CREATE INDEX IF NOT EXISTS idx_images_user ON images(user_id);
CREATE INDEX IF NOT EXISTS idx_links_module ON links(module_id);
CREATE INDEX IF NOT EXISTS idx_links_user ON links(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_module ON documents(module_id);
CREATE INDEX IF NOT EXISTS idx_documents_user ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_tutors_user ON tutors(user_id);
CREATE INDEX IF NOT EXISTS idx_categories_user ON categories(user_id);

-- Trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), 'student')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at on profiles
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
