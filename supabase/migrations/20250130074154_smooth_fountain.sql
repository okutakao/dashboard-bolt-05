/*
  # Document Management System Schema

  1. New Tables
    - `documents`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `title` (text)
      - `language` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    - `sections`
      - `id` (uuid, primary key)
      - `document_id` (uuid, references documents)
      - `title` (text)
      - `content` (text)
      - `order` (integer)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    - `list_items`
      - `id` (uuid, primary key)
      - `section_id` (uuid, references sections)
      - `content` (text)
      - `order` (integer)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
*/

-- Documents table
CREATE TABLE documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  title text NOT NULL,
  language text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own documents"
  ON documents
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Sections table
CREATE TABLE sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid REFERENCES documents ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  content text,
  "order" integer NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage sections of their documents"
  ON sections
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM documents
    WHERE documents.id = sections.document_id
    AND documents.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM documents
    WHERE documents.id = sections.document_id
    AND documents.user_id = auth.uid()
  ));

-- List items table
CREATE TABLE list_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id uuid REFERENCES sections ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  "order" integer NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE list_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage list items of their sections"
  ON list_items
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM sections
    JOIN documents ON documents.id = sections.document_id
    WHERE sections.id = list_items.section_id
    AND documents.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM sections
    JOIN documents ON documents.id = sections.document_id
    WHERE sections.id = list_items.section_id
    AND documents.user_id = auth.uid()
  ));