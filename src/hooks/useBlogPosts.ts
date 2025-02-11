import { useState, useEffect, useCallback } from 'react';
import { BlogPost } from '../lib/models';
import { getBlogPosts } from '../lib/supabase/blogService';
import { useAuth } from '../contexts/AuthContext';

export function useBlogPosts() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPosts = useCallback(async () => {
    if (!user) {
      setPosts([]);
      setLoading(false);
      return;
    }

    try {
      console.log('Fetching posts for user:', user.id);
      const userPosts = await getBlogPosts(user.id);
      setPosts(userPosts);
      setError(null);
    } catch (err) {
      console.error('Error in fetchPosts:', err);
      setError('記事の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    console.log('useBlogPosts effect triggered');
    fetchPosts();
  }, [fetchPosts]);

  const refreshPosts = useCallback(async () => {
    setLoading(true);
    await fetchPosts();
  }, [fetchPosts]);

  return { posts, loading, error, refreshPosts };
}