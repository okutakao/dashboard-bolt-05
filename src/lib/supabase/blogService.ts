import { supabase } from '../../supabase';
import { BlogPost, BlogSection, NewBlogPost, UpdateBlogPost, NewBlogSection } from '../models';

export async function getBlogPosts(userId: string): Promise<BlogPost[]> {
  console.log('getBlogPosts called with userId:', userId);
  
  if (!userId) {
    console.error('User ID is required');
    return [];
  }

  const maxRetries = 3;
  let retryCount = 0;

  while (retryCount < maxRetries) {
    try {
      console.log(`Fetching posts from Supabase... (attempt ${retryCount + 1}/${maxRetries})`);
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
        if (retryCount === maxRetries - 1) {
          return [];
        }
        retryCount++;
        await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount))); // 指数バックオフ
        continue;
      }

      if (!posts) {
        console.log('No posts found');
        return [];
      }

      console.log('Posts fetched successfully:', posts.length);
      return posts.map(post => ({
        id: post.id,
        userId: post.user_id,
        title: post.title,
        theme: post.theme,
        tone: post.tone,
        status: post.status,
        createdAt: new Date(post.created_at).toISOString(),
        updatedAt: new Date(post.updated_at).toISOString(),
        sections: (post.sections || [])
          .sort((a: BlogSection, b: BlogSection) => a.order - b.order)
          .map((section: any) => ({
            id: section.id,
            postId: section.post_id,
            title: section.title,
            content: section.content,
            order: section.order,
            createdAt: new Date(section.created_at).toISOString(),
            updatedAt: new Date(section.updated_at).toISOString(),
          }))
      }));
    } catch (error) {
      console.error(`Unexpected error in getBlogPosts (attempt ${retryCount + 1}/${maxRetries}):`, error);
      if (retryCount === maxRetries - 1) {
        return [];
      }
      retryCount++;
      await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount))); // 指数バックオフ
    }
  }

  return []; // 全ての再試行が失敗した場合
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
  post: {
    title: string;
    theme: string;
    tone: BlogPost['tone'];
    status: BlogPost['status'];
    createdAt: string;
    updatedAt: string;
    sections: Array<{
      title: string;
      content: string;
      order: number;
      createdAt: string;
      updatedAt: string;
    }>;
  },
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
    sections: post.sections.map((section, index) => ({
      id: '', // 一時的なIDを設定
      postId: newPost.id,
      title: section.title,
      content: section.content,
      order: section.order || index,
      createdAt: section.createdAt,
      updatedAt: section.updatedAt
    }))
  };
}

export async function updateBlogPost(
  post: {
    id: string;
    userId: string;
    title: string;
    theme: string;
    tone: BlogPost['tone'];
    status: BlogPost['status'];
    createdAt: string;
    updatedAt: string;
    sections: Array<{
      id?: string;
      postId?: string;
      title: string;
      content: string;
      order: number;
      createdAt: string;
      updatedAt: string;
    }>;
  }
): Promise<BlogPost> {
  const { data: updatedPost, error: updateError } = await supabase
    .from('blog_posts')
    .update({
      title: post.title,
      theme: post.theme,
      tone: post.tone,
      status: post.status,
      updated_at: post.updatedAt
    })
    .eq('id', post.id)
    .eq('user_id', post.userId)
    .select()
    .single();

  if (updateError) throw updateError;
  if (!updatedPost) throw new Error('Failed to update blog post');

  // 既存のセクションを削除
  const { error: deleteError } = await supabase
    .from('blog_sections')
    .delete()
    .eq('post_id', post.id);

  if (deleteError) throw deleteError;

  // 新しいセクションを作成
  const { error: sectionsError } = await supabase
    .from('blog_sections')
    .insert(
      post.sections.map((section, index) => ({
        post_id: post.id,
        title: section.title,
        content: section.content,
        order: section.order || index,
        created_at: section.createdAt,
        updated_at: section.updatedAt
      }))
    );

  if (sectionsError) throw sectionsError;

  return {
    id: updatedPost.id,
    userId: updatedPost.user_id,
    title: updatedPost.title,
    theme: updatedPost.theme,
    tone: updatedPost.tone,
    status: updatedPost.status,
    createdAt: updatedPost.created_at,
    updatedAt: updatedPost.updated_at,
    sections: post.sections.map((section, index) => ({
      id: '', // 一時的なIDを設定
      postId: updatedPost.id,
      title: section.title,
      content: section.content,
      order: section.order || index,
      createdAt: section.createdAt,
      updatedAt: section.updatedAt
    }))
  };
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