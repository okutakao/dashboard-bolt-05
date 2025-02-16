-- blog_postsテーブルの作成
CREATE TABLE blog_posts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    theme TEXT NOT NULL,
    tone TEXT NOT NULL CHECK (tone IN ('casual', 'business', 'academic')),
    status TEXT NOT NULL CHECK (status IN ('draft', 'published')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- blog_sectionsテーブルの作成
CREATE TABLE blog_sections (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    post_id UUID REFERENCES blog_posts(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    column_order INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- RLSの有効化
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_sections ENABLE ROW LEVEL SECURITY;

-- blog_postsのポリシー
CREATE POLICY "ユーザーは自分の記事を参照可能" ON blog_posts
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "ユーザーは記事を作成可能" ON blog_posts
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "ユーザーは自分の記事を更新可能" ON blog_posts
    FOR UPDATE TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "ユーザーは自分の記事を削除可能" ON blog_posts
    FOR DELETE TO authenticated
    USING (auth.uid() = user_id);

-- blog_sectionsのポリシー
CREATE POLICY "ユーザーは自分の記事のセクションを参照可能" ON blog_sections
    FOR SELECT TO authenticated
    USING (EXISTS (
        SELECT 1 FROM blog_posts
        WHERE blog_posts.id = blog_sections.post_id
        AND blog_posts.user_id = auth.uid()
    ));

CREATE POLICY "ユーザーは記事のセクションを作成可能" ON blog_sections
    FOR INSERT TO authenticated
    WITH CHECK (EXISTS (
        SELECT 1 FROM blog_posts
        WHERE blog_posts.id = blog_sections.post_id
        AND blog_posts.user_id = auth.uid()
    ));

CREATE POLICY "ユーザーは自分の記事のセクションを更新可能" ON blog_sections
    FOR UPDATE TO authenticated
    USING (EXISTS (
        SELECT 1 FROM blog_posts
        WHERE blog_posts.id = blog_sections.post_id
        AND blog_posts.user_id = auth.uid()
    ));

CREATE POLICY "ユーザーは自分の記事のセクションを削除可能" ON blog_sections
    FOR DELETE TO authenticated
    USING (EXISTS (
        SELECT 1 FROM blog_posts
        WHERE blog_posts.id = blog_sections.post_id
        AND blog_posts.user_id = auth.uid()
    )); 