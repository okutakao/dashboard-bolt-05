-- ブログ記事テーブルの作成
CREATE TABLE IF NOT EXISTS blog_posts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    title TEXT NOT NULL,
    theme TEXT NOT NULL,
    tone TEXT,
    status TEXT NOT NULL DEFAULT 'draft',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_user
        FOREIGN KEY(user_id)
        REFERENCES auth.users(id)
        ON DELETE CASCADE
);

-- ブログセクションテーブルの作成
CREATE TABLE IF NOT EXISTS blog_sections (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    post_id UUID NOT NULL,
    title TEXT NOT NULL,
    content TEXT,
    order INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_post
        FOREIGN KEY(post_id)
        REFERENCES blog_posts(id)
        ON DELETE CASCADE
);

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_blog_posts_user_id ON blog_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_blog_sections_post_id ON blog_sections(post_id);

-- RLSポリシーの設定
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_sections ENABLE ROW LEVEL SECURITY;

-- ユーザーごとの記事アクセスポリシー
CREATE POLICY "Users can view their own posts"
    ON blog_posts
    FOR ALL
    USING (auth.uid() = user_id);

-- セクションのアクセスポリシー
CREATE POLICY "Users can view sections of their posts"
    ON blog_sections
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM blog_posts
            WHERE blog_posts.id = blog_sections.post_id
            AND blog_posts.user_id = auth.uid()
        )
    ); 