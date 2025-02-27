import { BlogPost, BlogSection, NewBlogPost, UpdateBlogPost } from '../models';
import { supabase } from '../../supabase';

interface DatabaseBlogSection {
  id: string;
  post_id: string;
  title: string;
  content: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

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
        mode: post.mode || 'simple',
        createdAt: new Date(post.created_at).toISOString(),
        updatedAt: new Date(post.updated_at).toISOString(),
        sections: (post.sections || [])
          .sort((a: BlogSection, b: BlogSection) => a.sortOrder - b.sortOrder)
          .map((section: BlogSection) => ({
            id: section.id,
            postId: section.postId,
            title: section.title,
            content: section.content,
            sortOrder: section.sortOrder,
            createdAt: section.createdAt,
            updatedAt: section.updatedAt
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
    id: post.id,
    userId: post.user_id,
    title: post.title,
    theme: post.theme,
    tone: post.tone,
    status: post.status,
    mode: post.mode || 'simple',
    createdAt: post.created_at,
    updatedAt: post.updated_at,
    sections: post.sections
      .sort((a: DatabaseBlogSection, b: DatabaseBlogSection) => a.sort_order - b.sort_order)
      .map((section: DatabaseBlogSection) => ({
        id: section.id,
        postId: section.post_id,
        title: section.title,
        content: section.content,
        sortOrder: section.sort_order,
        createdAt: section.created_at,
        updatedAt: section.updated_at
      }))
  };
}

export async function ensureValidSession(): Promise<boolean> {
  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (!sessionError && session) {
      return true;
    }

    console.warn('セッションの再取得を試みます...');
    const { data: refreshResult, error: refreshError } = await supabase.auth.refreshSession();
    
    if (!refreshError && refreshResult.session) {
      console.log('セッションの再取得に成功しました');
      return true;
    }

    console.error('セッションの再取得に失敗:', refreshError);
    return false;
  } catch (error) {
    console.error('セッション確認中にエラーが発生:', error);
    return false;
  }
}

export async function createBlogPost(post: NewBlogPost, userId: string): Promise<BlogPost> {
  const isSessionValid = await ensureValidSession();
  if (!isSessionValid) {
    throw new Error('セッションが無効です');
  }

  let tempPostId: string | null = null;

  try {
    const { data: newPost, error: postError } = await supabase
      .from('blog_posts')
      .insert({
        user_id: userId,
        title: post.title,
        theme: post.theme,
        tone: post.tone,
        status: post.status,
        mode: post.mode,
        created_at: post.createdAt,
        updated_at: post.updatedAt
      })
      .select()
      .single();

    if (postError || !newPost) {
      throw new Error('記事の作成に失敗しました: ' + (postError?.message || '不明なエラー'));
    }

    tempPostId = newPost.id;

    const sectionsToCreate = post.sections.map((section, index) => ({
      post_id: newPost.id,
      title: section.title,
      content: section.content,
      sort_order: index,
      created_at: section.createdAt,
      updated_at: section.updatedAt
    }));

    const { data: sections, error: sectionsError } = await supabase
      .from('blog_sections')
      .insert(sectionsToCreate)
      .select();

    if (sectionsError || !sections) {
      if (tempPostId) {
        await supabase
          .from('blog_posts')
          .delete()
          .eq('id', tempPostId);
      }
      throw new Error('セクションの作成に失敗しました: ' + (sectionsError?.message || '不明なエラー'));
    }

    return {
      id: newPost.id,
      userId: newPost.user_id,
      title: newPost.title,
      theme: newPost.theme,
      tone: newPost.tone,
      status: newPost.status,
      mode: newPost.mode,
      createdAt: newPost.created_at,
      updatedAt: newPost.updated_at,
      sections: sections.map(section => ({
        id: section.id,
        postId: section.post_id,
        title: section.title,
        content: section.content,
        sortOrder: section.sort_order,
        createdAt: section.created_at,
        updatedAt: section.updated_at
      }))
    };

  } catch (error) {
    if (tempPostId) {
      await supabase
        .from('blog_posts')
        .delete()
        .eq('id', tempPostId);
    }
    
    console.error('記事作成中にエラーが発生:', error);
    throw new Error(error instanceof Error ? error.message : '記事の作成に失敗しました');
  }
}

export async function updateBlogPost(post: UpdateBlogPost): Promise<BlogPost> {
  try {
    const { data: updatedPost, error: updateError } = await supabase
      .from('blog_posts')
      .update({
        title: post.title,
        theme: post.theme,
        tone: post.tone,
        status: post.status,
        mode: post.mode,
        updated_at: post.updatedAt
      })
      .eq('id', post.id)
      .eq('user_id', post.userId)
      .select()
      .single();

    if (updateError) {
      throw new Error('記事の更新に失敗しました: ' + updateError.message);
    }

    const sectionsToCreate = post.sections.map((section, index) => ({
      post_id: post.id,
      title: section.title,
      content: section.content,
      sort_order: index,
      created_at: section.createdAt,
      updated_at: section.updatedAt
    }));

    // 既存のセクションを削除
    const { error: deleteError } = await supabase
      .from('blog_sections')
      .delete()
      .eq('post_id', post.id);

    if (deleteError) {
      throw new Error('セクションの削除に失敗しました: ' + deleteError.message);
    }

    // 新しいセクションを作成
    const { data: sections, error: insertError } = await supabase
      .from('blog_sections')
      .insert(sectionsToCreate)
      .select();

    if (insertError) {
      throw new Error('セクションの作成に失敗しました: ' + insertError.message);
    }

    return {
      id: updatedPost.id,
      userId: updatedPost.user_id,
      title: updatedPost.title,
      theme: updatedPost.theme,
      tone: updatedPost.tone,
      status: updatedPost.status,
      mode: updatedPost.mode,
      createdAt: updatedPost.created_at,
      updatedAt: updatedPost.updated_at,
      sections: sections.map(section => ({
        id: section.id,
        postId: section.post_id,
        title: section.title,
        content: section.content,
        sortOrder: section.sort_order,
        createdAt: section.created_at,
        updatedAt: section.updated_at
      }))
    };

  } catch (error) {
    console.error('記事の更新処理中にエラーが発生:', error);
    throw error instanceof Error ? error : new Error('記事の更新に失敗しました');
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
      id: post.id,
      userId: post.user_id,
      title: post.title,
      theme: post.theme,
      tone: post.tone,
      status: post.status,
      mode: post.mode || 'simple',
      createdAt: post.created_at,
      updatedAt: post.updated_at,
      sections: post.sections
        .sort((a: DatabaseBlogSection, b: DatabaseBlogSection) => a.sort_order - b.sort_order)
        .map((section: DatabaseBlogSection) => ({
          id: section.id,
          postId: section.post_id,
          title: section.title,
          content: section.content,
          sortOrder: section.sort_order,
          createdAt: section.created_at,
          updatedAt: section.updated_at
        }))
    };
  } catch (error) {
    console.error('Error updating blog post status:', error);
    throw new Error('記事のステータス更新に失敗しました');
  }
}