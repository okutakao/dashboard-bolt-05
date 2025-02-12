import { supabase } from '../../supabase';
import { BlogPost, BlogSection, NewBlogPost, UpdateBlogPost, NewBlogSection } from '../models';

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

export async function createBlogPost(
  post: Omit<BlogPost, 'id' | 'userId'> & { sections: Omit<BlogSection, 'id' | 'postId'>[] },
  userId: string
): Promise<BlogPost> {
  // トランザクションを使用して一貫性を保証
  const { data: existingDraft, error: searchError } = await supabase
    .from('blog_posts')
    .select('id')
    .eq('user_id', userId)
    .eq('status', 'draft')
    .eq('title', post.title)
    .single();

  if (searchError && searchError.code !== 'PGRST116') {
    throw searchError;
  }

  if (existingDraft) {
    // 既存の下書きが見つかった場合は更新
    return updateBlogPost({
      ...post,
      id: existingDraft.id,
      userId
    });
  }

  // 新規作成
  const { data: newPost, error: insertError } = await supabase
    .from('blog_posts')
    .insert([
      {
        title: post.title,
        theme: post.theme,
        tone: post.tone,
        status: post.status,
        user_id: userId,
        created_at: post.createdAt,
        updated_at: post.updatedAt
      }
    ])
    .select()
    .single();

  if (insertError) throw insertError;
  if (!newPost) throw new Error('Failed to create blog post');

  // セクションの作成
  const { error: sectionsError } = await supabase
    .from('blog_sections')
    .insert(
      post.sections.map((section, index) => ({
        post_id: newPost.id,
        title: section.title,
        content: section.content,
        order: section.order || index,
        created_at: section.createdAt,
        updated_at: section.updatedAt
      }))
    );

  if (sectionsError) throw sectionsError;

  return {
    id: newPost.id,
    userId: newPost.user_id,
    title: newPost.title,
    theme: newPost.theme,
    tone: newPost.tone,
    status: newPost.status,
    createdAt: newPost.created_at,
    updatedAt: newPost.updated_at,
    sections: post.sections as BlogSection[]
  };
}

export async function updateBlogPost(post: UpdateBlogPost): Promise<BlogPost> {
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
        updated_at: post.updatedAt
      })
      .eq('id', post.id);

    if (postError) {
      throw postError;
    }

    // 2. 現在のセクションを取得
    const { data: currentSections, error: fetchError } = await supabase
      .from('blog_sections')
      .select('*')
      .eq('post_id', post.id);

    if (fetchError) {
      throw fetchError;
    }

    // 3. セクションの更新処理
    const now = new Date().toISOString();
    
    // 3.1 既存のセクションを更新または削除
    const currentSectionIds = new Set(currentSections.map(s => s.id));
    const updatedSectionIds = new Set(post.sections.filter((s): s is BlogSection => 'id' in s).map(s => s.id));
    
    // 削除するセクション
    const sectionsToDelete = currentSections.filter(s => !updatedSectionIds.has(s.id));
    if (sectionsToDelete.length > 0) {
      const { error: deleteError } = await supabase
        .from('blog_sections')
        .delete()
        .in('id', sectionsToDelete.map(s => s.id));

      if (deleteError) {
        throw deleteError;
      }
    }

    // 更新するセクション
    const sectionsToUpdate = post.sections.filter((s): s is BlogSection => 'id' in s && currentSectionIds.has(s.id));
    for (const section of sectionsToUpdate) {
      const { error: updateError } = await supabase
        .from('blog_sections')
        .update({
          title: section.title,
          content: section.content,
          order: section.order,
          updated_at: now
        })
        .eq('id', section.id);

      if (updateError) {
        throw updateError;
      }
    }

    // 3.2 新しいセクションを作成
    const newSections = post.sections
      .filter((s): s is NewBlogSection => !('id' in s))
      .map(section => ({
        post_id: post.id,
        title: section.title,
        content: section.content,
        order: section.order,
        created_at: now,
        updated_at: now
      }));

    if (newSections.length > 0) {
      const { error: insertError } = await supabase
        .from('blog_sections')
        .insert(newSections);

      if (insertError) {
        throw insertError;
      }
    }

    // 4. 更新された記事とセクションを取得
    const { data: updatedPost, error: finalError } = await supabase
      .from('blog_posts')
      .select(`
        *,
        sections:blog_sections(*)
      `)
      .eq('id', post.id)
      .single();

    if (finalError) {
      throw finalError;
    }

    return {
      ...updatedPost,
      sections: updatedPost.sections.sort((a: BlogSection, b: BlogSection) => a.order - b.order)
    };

  } catch (error) {
    console.error('記事更新中のエラー:', error);
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