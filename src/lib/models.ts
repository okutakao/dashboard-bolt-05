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
  id: string;
  postId: string;
  title: string;
  content: string;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export type FormSection = {
  title: string;
  content: string;
  order: number;
  createdAt: string;
  updatedAt: string;
  id?: string;
  postId?: string;
};

export type NewBlogSection = Omit<BlogSection, 'id'>;

export interface AIGeneration {
  id: string;
  postId: string;
  sectionId?: string;
  prompt: string;
  response: string;
  type: 'theme' | 'outline' | 'content';
  createdAt: string;
}

export interface BlogPostWithUser extends BlogPost {
  user: User;
}

export type NewBlogPost = {
  title: string;
  theme: string;
  tone: BlogPost['tone'];
  status: BlogPost['status'];
  createdAt: string;
  updatedAt: string;
  sections: Omit<BlogSection, 'id' | 'postId'>[];
};

export type UpdateBlogPost = {
  id: string;
  title: string;
  theme: string;
  tone: BlogPost['tone'];
  status: BlogPost['status'];
  createdAt: string;
  updatedAt: string;
  sections: (BlogSection | Omit<BlogSection, 'id'>)[];
};