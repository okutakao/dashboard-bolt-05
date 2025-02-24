import { User } from '../types';

export interface BlogPost {
  id: string;
  userId: string;
  title: string;
  theme: string;
  tone: 'casual' | 'business' | 'academic';
  status: 'draft' | 'published';
  createdAt: string;
  updatedAt: string;
  sections: BlogSection[];
}

export interface BlogSection {
  id?: string;
  postId?: string;
  title: string;
  content: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface FormSection extends Omit<BlogSection, 'id' | 'postId'> {
  id?: string;
  postId?: string;
}

export interface AIGeneration {
  id: string;
  userId: string;
  postId?: string;
  prompt: string;
  response: string;
  model: string;
  createdAt: string;
  updatedAt: string;
}

export interface BlogPostWithUser extends BlogPost {
  user: User;
}

export interface NewBlogPost {
  title: string;
  theme: string;
  tone: BlogPost['tone'];
  status: BlogPost['status'];
  createdAt: string;
  updatedAt: string;
  sections: Array<{
    title: string;
    content: string;
    sortOrder: number;
    createdAt: string;
    updatedAt: string;
  }>;
}

export interface UpdateBlogPost {
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
    sortOrder: number;
    createdAt: string;
    updatedAt: string;
  }>;
}

export interface NewBlogSection extends Omit<BlogSection, 'id' | 'postId'> {}

export interface ArticleStructure {
  introduction: {
    title: string;
    content: string;
    targetLength: { min: number; max: number };
  };
  mainSections: Array<{
    title: string;
    content: string;
    targetLength: { min: number; max: number };
    previousContext?: string;
  }>;
  conclusion: {
    title: string;
    content: string;
    targetLength: { min: number; max: number };
    fullContext: string;
  };
}