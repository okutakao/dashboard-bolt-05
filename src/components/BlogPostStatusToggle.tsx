import React from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { BlogPost } from '../lib/models';
import { updateBlogPostStatus } from '../lib/supabase/blogService';

type BlogPostStatusToggleProps = {
  post: BlogPost;
  onStatusChange: (post: BlogPost) => void;
  disabled?: boolean;
};

export function BlogPostStatusToggle({ post, onStatusChange, disabled = false }: BlogPostStatusToggleProps) {
  const [isUpdating, setIsUpdating] = React.useState(false);

  const handleToggleStatus = async () => {
    if (disabled || isUpdating) return;

    setIsUpdating(true);
    try {
      const newStatus = post.status === 'draft' ? 'published' : 'draft';
      const updatedPost = await updateBlogPostStatus(post.id, newStatus);
      onStatusChange(updatedPost);
    } catch (error) {
      console.error('Error updating post status:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <button
      onClick={handleToggleStatus}
      disabled={disabled || isUpdating}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors
        ${post.status === 'published'
          ? 'bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900 dark:text-green-200 dark:hover:bg-green-800'
          : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200 dark:bg-yellow-900 dark:text-yellow-200 dark:hover:bg-yellow-800'
        }
        ${(disabled || isUpdating) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      title={post.status === 'published' ? '下書きに戻す' : '公開する'}
    >
      {post.status === 'published' ? (
        <>
          <Eye className="h-4 w-4" />
          <span>公開中</span>
        </>
      ) : (
        <>
          <EyeOff className="h-4 w-4" />
          <span>下書き</span>
        </>
      )}
    </button>
  );
}