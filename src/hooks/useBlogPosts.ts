import { useState, useEffect } from 'react';
import { BlogPost } from '../lib/models';
import { getBlogPosts } from '../lib/supabase/blogService';
import { useAuth } from '../contexts/AuthContext';

export function useBlogPosts() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        if (!user) {
          setPosts([]);
          return;
        }

        const userPosts = await getBlogPosts(user.id);
        setPosts(userPosts);
        setError(null);
      } catch (err) {
        setError('記事の取得に失敗しました');
        console.error('Error fetching posts:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, [user]);

  const refreshPosts = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const userPosts = await getBlogPosts(user.id);
      setPosts(userPosts);
      setError(null);
    } catch (err) {
      setError('記事の取得に失敗しました');
      console.error('Error refreshing posts:', err);
    } finally {
      setLoading(false);
    }
  };

  return { posts, loading, error, refreshPosts };
}