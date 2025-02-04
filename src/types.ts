export type Section = {
  id: string;
  title: string;
  content: string;
  list?: string[];
  synced?: boolean;
};

export type Content = {
  ja: {
    title: string;
    sections: Section[];
  };
  en: {
    title: string;
    sections: Section[];
  };
};

// ブログ記事関連の型定義
export type BlogPost = {
  id: string;
  userId: string;
  title: string;
  theme: string;
  targetAudience?: string;
  tone?: string;
  status: 'draft' | 'published';
  createdAt: string;
  updatedAt: string;
};

export type BlogSection = {
  id: string;
  postId: string;
  title: string;
  content: string;
  order: number;
  createdAt: string;
  updatedAt: string;
};

export type AIGeneration = {
  id: string;
  postId: string;
  sectionId?: string;
  prompt: string;
  response: string;
  type: 'theme' | 'outline' | 'content';
  createdAt: string;
};

export type User = {
  id: string;
  email: string;
};

export type WritingTone = 'casual' | 'business' | 'academic';

export type PostStatus = 'draft' | 'published';