import { supabase } from '../../supabase';
import { BlogPost, BlogSection } from '../models';

export async function getBlogPosts(userId: string): Promise<BlogPost[]> {
  const { data: posts, error } = await supabase
    .from('blog_posts')
    .select(`
      *,
      sections:blog_sections(*)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching blog posts:', error);
    throw new Error('記事の取得に失敗しました');
  }

  return posts.map(post => ({
    ...post,
    sections: post.sections.sort((a: BlogSection, b: BlogSection) => a.order - b.order)
  }));
}

export async function getBlogPost(id: string, userId: string): Promise<BlogPost | null> {
  const { data: post, error } = await supabase
    .from('blog_posts')
    .select(`
      *,
      sections:blog_sections(*)
    `)
    .eq('id', id)
    .eq('user_id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    console.error('Error fetching blog post:', error);
    throw new Error('記事の取得に失敗しました');
  }

  return {
    ...post,
    sections: post.sections.sort((a: BlogSection, b: BlogSection) => a.order - b.order)
  };
}

export async function createBlogPost(post: Omit<BlogPost, 'id' | 'userId'>, userId: string): Promise<BlogPost> {
  const { data: newPost, error: postError } = await supabase
    .from('blog_posts')
    .insert([{
      user_id: userId,
      title: post.title,
      theme: post.theme,
      tone: post.tone,
      status: post.status,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }])
    .select()
    .single();

  if (postError) {
    console.error('Error creating blog post:', postError);
    throw new Error('記事の作成に失敗しました');
  }

  const sections = post.sections.map((section, index) => ({
    post_id: newPost.id,
    title: section.title,
    content: section.content,
    order: index,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }));

  const { data: newSections, error: sectionsError } = await supabase
    .from('blog_sections')
    .insert(sections)
    .select();

  if (sectionsError) {
    console.error('Error creating blog sections:', sectionsError);
    throw new Error('セクションの作成に失敗しました');
  }

  return {
    ...newPost,
    sections: newSections
  };
}

export async function updateBlogPost(post: BlogPost): Promise<BlogPost> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('認証が必要です');
  }

  try {
    // 1. 記事の基本情報を更新
    const { error: postError } = await supabase
      .from('blog_posts')
      .update({
        title: post.title,
        theme: post.theme,
        tone: post.tone,
        status: post.status,
        updated_at: new Date().toISOString()
      })
      .eq('id', post.id)
      .eq('user_id', post.userId);

    if (postError) throw postError;

    // 2. 既存のセクションをすべて削除
    const { error: deleteError } = await supabase
      .from('blog_sections')
      .delete()
      .eq('post_id', post.id);

    if (deleteError) throw deleteError;

    // 3. 新しいセクションを作成
    const newSections = post.sections.map((section, index) => ({
      post_id: post.id,
      title: section.title,
      content: section.content,
      order: index,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    const { data: insertedSections, error: insertError } = await supabase
      .from('blog_sections')
      .insert(newSections)
      .select();

    if (insertError) throw insertError;

    // 4. 更新された記事を返す
    return {
      ...post,
      sections: insertedSections.sort((a, b) => a.order - b.order)
    };

  } catch (error) {
    console.error('Error updating blog post:', error);
    throw new Error('記事の更新に失敗しました');
  }
}

export async function deleteBlogPost(id: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('blog_posts')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (error) {
    console.error('Error deleting blog post:', error);
    throw new Error('記事の削除に失敗しました');
  }
}

export async function updateBlogPostStatus(id: string, status: BlogPost['status']): Promise<BlogPost> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('認証が必要です');
  }

  try {
    const { data: post, error } = await supabase
      .from('blog_posts')
      .update({
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select(`
        *,
        sections:blog_sections(*)
      `)
      .single();

    if (error) throw error;

    return {
      ...post,
      sections: post.sections.sort((a: BlogSection, b: BlogSection) => a.order - b.order)
    };
  } catch (error) {
    console.error('Error updating blog post status:', error);
    throw new Error('記事のステータス更新に失敗しました');
  }
}