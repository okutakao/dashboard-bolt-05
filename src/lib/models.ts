import { User } from '../types';

export interface BlogPost {
  id: string;
  userId: string;
  title: string;
  theme: string;
  tone: 'casual' | 'business' | 'academic';
  status: 'draft' | 'published';
  mode: 'simple' | 'context';
  createdAt: string;
  updatedAt: string;
  sections: BlogSection[];
}

export interface BlogSection {
  id?: string;
  postId?: string;
  title: string;
  content: string;
  description?: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  recommendedLength: {
    min: number;
    max: number;
  };
}

export interface FormSection {
  id?: string;
  postId?: string;
  title: string;
  content: string;
  description?: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  recommendedLength: {
    min: number;
    max: number;
  };
}

export interface FormData {
  title: string;
  theme: string;
  tone: 'casual' | 'business' | 'academic';
  status: 'draft' | 'published';
  mode: 'simple' | 'context';
  sections?: FormSection[];
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
  mode: 'simple' | 'context';
  userId: string;
  createdAt: string;
  updatedAt: string;
  sections: Array<{
    title: string;
    content: string;
    description: string;
    sortOrder: number;
    createdAt: string;
    updatedAt: string;
    recommendedLength: {
      min: number;
      max: number;
    };
  }>;
}

export interface UpdateBlogPost extends BlogPost {
  sections: Array<{
    id?: string;
    postId?: string;
    title: string;
    content: string;
    description: string;
    sortOrder: number;
    createdAt: string;
    updatedAt: string;
    recommendedLength: {
      min: number;
      max: number;
    };
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

export interface ExportableContent {
  id: string;
  title: string;
  sections: Array<{
    title: string;
    description: string;
    content?: string;
    recommendedLength?: number;
  }>;
}