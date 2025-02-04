/*
  # ブログ記事システムのスキーマ更新

  1. 新しいテーブル
    - `blog_posts`: ブログ記事の基本情報
      - `id` (uuid, PK)
      - `user_id` (uuid, FK)
      - `title` (text)
      - `theme` (text)
      - `target_audience` (text)
      - `tone` (text)
      - `status` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `blog_sections`: 記事のセクション
      - `id` (uuid, PK)
      - `post_id` (uuid, FK)
      - `title` (text)
      - `content` (text)
      - `order` (integer)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `ai_generations`: AI生成履歴
      - `id` (uuid, PK)
      - `post_id` (uuid, FK)
      - `section_id` (uuid, FK, nullable)
      - `prompt` (text)
      - `response` (text)
      - `type` (text)
      - `created_at` (timestamptz)

  2. セキュリティ
    - すべてのテーブルでRLSを有効化
    - ユーザーは自身の記事のみアクセス可能
*/

-- ブログ記事テーブル
CREATE TABLE blog_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  title text NOT NULL,
  theme text NOT NULL,
  target_audience text,
  tone text,
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own blog posts"
  ON blog_posts
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ブログセクションテーブル
CREATE TABLE blog_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES blog_posts ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  content text,
  "order" integer NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE blog_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage sections of their blog posts"
  ON blog_sections
  FOR ALL
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

-- AI生成履歴テーブル
CREATE TABLE ai_generations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES blog_posts ON DELETE CASCADE NOT NULL,
  section_id uuid REFERENCES blog_sections ON DELETE CASCADE,
  prompt text NOT NULL,
  response text NOT NULL,
  type text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE ai_generations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view AI generations for their posts"
  ON ai_generations
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM blog_posts
    WHERE blog_posts.id = ai_generations.post_id
    AND blog_posts.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM blog_posts
    WHERE blog_posts.id = ai_generations.post_id
    AND blog_posts.user_id = auth.uid()
  ));