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

interface BackupData {
  title: string;
  theme: string;
  tone: BlogPost['tone'];
  status: BlogPost['status'];
  updated_at: string;
  sections?: Array<{
    post_id: string;
    title: string;
    content: string;
    order: number;
    created_at: string;
    updated_at: string;
  }>;
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
  const maxRetries = 3;
  let retryCount = 0;

  while (retryCount < maxRetries) {
    try {
      // セッションの確認と再取得
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        console.warn('セッションの再取得を試みます...');
        const { data: refreshResult, error: refreshError } = await supabase.auth.refreshSession();
        
        if (refreshError || !refreshResult.session) {
          if (retryCount === maxRetries - 1) {
            throw new Error('セッションの更新に失敗しました。再度ログインしてください。');
          }
          retryCount++;
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
          continue;
        }
      }

      // 既存の下書きを検索
      const { data: existingDraft, error: searchError } = await supabase
        .from('blog_posts')
        .select('id')
        .eq('user_id', userId)
        .eq('status', 'draft')
        .eq('title', post.title)
        .single();

      if (searchError && searchError.code !== 'PGRST116') {
        console.error('下書き検索エラー:', searchError);
        if (retryCount === maxRetries - 1) {
          throw new Error('記事の保存中にエラーが発生しました');
        }
        retryCount++;
        await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
        continue;
      }

      if (existingDraft) {
        return updateBlogPost({
          ...post,
          id: existingDraft.id,
          userId
        });
      }

      // 現在時刻を一度だけ取得して再利用
      const currentTime = new Date().toISOString();

      // トランザクション的な処理のために一時データを保持
      let tempPostId: string | null = null;
      let tempSections: Array<{
        id: string;
        post_id: string;
        title: string;
        content: string;
        order: number;
        created_at: string;
        updated_at: string;
      }> | null = null;

      // 新規記事の作成
      const { data: newPost, error: insertError } = await supabase
        .from('blog_posts')
        .insert([
          {
            title: post.title,
            theme: post.theme,
            tone: post.tone,
            status: post.status,
            user_id: userId,
            created_at: currentTime,
            updated_at: currentTime
          }
        ])
        .select()
        .single();

      if (insertError) {
        console.error('記事作成エラー:', insertError);
        if (retryCount === maxRetries - 1) {
          throw new Error('記事の作成に失敗しました');
        }
        retryCount++;
        await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
        continue;
      }

      if (!newPost) {
        throw new Error('記事の作成に失敗しました');
      }

      tempPostId = newPost.id;

      // セクションの作成
      const { data: sections, error: sectionsError } = await supabase
        .from('blog_sections')
        .insert(
          post.sections.map((section, index) => ({
            post_id: newPost.id,
            title: section.title,
            content: section.content,
            order: section.order || index,
            created_at: currentTime,
            updated_at: currentTime
          }))
        )
        .select();

      if (sectionsError || !sections) {
        console.error('セクション作成エラー:', sectionsError);
        // 記事の削除（ロールバック）
        if (tempPostId) {
          await supabase
            .from('blog_posts')
            .delete()
            .eq('id', tempPostId);
        }
        if (retryCount === maxRetries - 1) {
          throw new Error('セクションの作成に失敗しました');
        }
        retryCount++;
        await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
        continue;
      }

      tempSections = sections;

      // 最終的な記事データを返す
      return {
        id: newPost.id,
        userId: newPost.user_id,
        title: newPost.title,
        theme: newPost.theme,
        tone: newPost.tone,
        status: newPost.status,
        createdAt: newPost.created_at,
        updatedAt: newPost.updated_at,
        sections: tempSections.map(section => ({
          id: section.id,
          postId: section.post_id,
          title: section.title,
          content: section.content,
          order: section.order,
          createdAt: section.created_at,
          updatedAt: section.updated_at
        }))
      };

    } catch (error) {
      console.error('記事作成中にエラーが発生:', error);
      if (retryCount === maxRetries - 1) {
        throw new Error(error instanceof Error ? error.message : '記事の作成に失敗しました');
      }
      retryCount++;
      await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
    }
  }

  throw new Error('記事の作成に失敗しました。再度お試しください。');
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
  const maxRetries = 3;
  let retryCount = 0;
  let backupData: BackupData | null = null;

  while (retryCount < maxRetries) {
    try {
      // セッションの確認と再取得
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        console.warn('セッションの再取得を試みます...');
        const { data: refreshResult, error: refreshError } = await supabase.auth.refreshSession();
        
        if (refreshError || !refreshResult.session) {
          if (retryCount === maxRetries - 1) {
            throw new Error('セッションの更新に失敗しました。再度ログインしてください。');
          }
          retryCount++;
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
          continue;
        }
      }

      // バックアップの取得
      if (!backupData) {
        const { data: originalPost, error: backupError } = await supabase
          .from('blog_posts')
          .select(`
            *,
            sections:blog_sections(*)
          `)
          .eq('id', post.id)
          .single();

        if (backupError || !originalPost) {
          console.error('バックアップの取得に失敗:', backupError);
          if (retryCount === maxRetries - 1) {
            throw new Error('記事の取得に失敗しました');
          }
          retryCount++;
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
          continue;
        }

        backupData = {
          title: originalPost.title,
          theme: originalPost.theme,
          tone: originalPost.tone,
          status: originalPost.status,
          updated_at: originalPost.updated_at,
          sections: originalPost.sections
        };
      }

      // 現在時刻を一度だけ取得して再利用
      const currentTime = new Date().toISOString();

      // 記事の更新
      const { data: updatedPost, error: updateError } = await supabase
        .from('blog_posts')
        .update({
          title: post.title,
          theme: post.theme,
          tone: post.tone,
          status: post.status,
          updated_at: currentTime
        })
        .eq('id', post.id)
        .eq('user_id', post.userId)
        .select()
        .single();

      if (updateError) {
        console.error('記事の更新に失敗:', updateError);
        if (retryCount === maxRetries - 1) {
          throw new Error('記事の更新に失敗しました');
        }
        retryCount++;
        await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
        continue;
      }

      // セクションの更新
      try {
        // 既存のセクションを削除
        const { error: deleteError } = await supabase
          .from('blog_sections')
          .delete()
          .eq('post_id', post.id);

        if (deleteError) {
          throw new Error('セクションの削除に失敗しました');
        }

        // 新しいセクションを作成
        const { data: newSections, error: insertError } = await supabase
          .from('blog_sections')
          .insert(
            post.sections.map((section, index) => ({
              post_id: post.id,
              title: section.title,
              content: section.content,
              order: section.order || index,
              created_at: currentTime,
              updated_at: currentTime
            }))
          )
          .select();

        if (insertError) {
          // エラーが発生した場合、バックアップから復元
          if (backupData) {
            await supabase
              .from('blog_posts')
              .update({
                title: backupData.title,
                theme: backupData.theme,
                tone: backupData.tone,
                status: backupData.status,
                updated_at: backupData.updated_at
              })
              .eq('id', post.id);

            if (backupData.sections) {
              await supabase
                .from('blog_sections')
                .insert(backupData.sections);
            }
          }
          throw new Error('セクションの保存に失敗しました。変更を元に戻します。');
        }

        // 成功した場合、更新された記事を返す
        return {
          ...updatedPost,
          sections: newSections.map(section => ({
            id: section.id,
            postId: section.post_id,
            title: section.title,
            content: section.content,
            order: section.order,
            createdAt: section.created_at,
            updatedAt: section.updated_at
          }))
        };

      } catch (sectionError) {
        console.error('セクション更新中にエラーが発生:', sectionError);
        if (retryCount === maxRetries - 1) {
          throw new Error(sectionError instanceof Error ? sectionError.message : 'セクションの更新に失敗しました');
        }
        retryCount++;
        await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
      }

    } catch (error) {
      console.error('記事の更新中にエラーが発生:', error);
      if (retryCount === maxRetries - 1) {
        throw new Error(error instanceof Error ? error.message : '記事の更新に失敗しました');
      }
      retryCount++;
      await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
    }
  }

  throw new Error('記事の更新に失敗しました。再度お試しください。');
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