/*
  # Fix blog post and section policies

  1. Changes
    - Update RLS policies for blog_posts table
    - Update RLS policies for blog_sections table
    - Add explicit UPDATE policies
    - Add explicit DELETE policies

  2. Security
    - Ensure users can only manage their own posts
    - Ensure users can only manage sections of their own posts
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can manage their own blog posts" ON blog_posts;
DROP POLICY IF EXISTS "Users can manage sections of their blog posts" ON blog_sections;

-- Create new policies for blog_posts
CREATE POLICY "Users can read their own blog posts"
  ON blog_posts
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own blog posts"
  ON blog_posts
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own blog posts"
  ON blog_posts
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own blog posts"
  ON blog_posts
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create new policies for blog_sections
CREATE POLICY "Users can read sections of their blog posts"
  ON blog_sections
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM blog_posts
    WHERE blog_posts.id = blog_sections.post_id
    AND blog_posts.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert sections to their blog posts"
  ON blog_sections
  FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM blog_posts
    WHERE blog_posts.id = blog_sections.post_id
    AND blog_posts.user_id = auth.uid()
  ));

CREATE POLICY "Users can update sections of their blog posts"
  ON blog_sections
  FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM blog_posts
    WHERE blog_posts.id = blog_sections.post_id
    AND blog_posts.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM blog_posts
    WHERE blog_posts.id = blog_sections.post_id
    AND blog_posts.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete sections of their blog posts"
  ON blog_sections
  FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM blog_posts
    WHERE blog_posts.id = blog_sections.post_id
    AND blog_posts.user_id = auth.uid()
  ));