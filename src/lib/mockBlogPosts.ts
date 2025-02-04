import { BlogPost, BlogSection, AIGeneration } from './models';

export const mockBlogPosts: BlogPost[] = [
  {
    id: '1',
    userId: 'user-1',
    title: 'Pythonプログラミング入門',
    theme: 'プログラミング学習',
    tone: 'casual',
    status: 'published',
    createdAt: '2024-02-01T00:00:00Z',
    updatedAt: '2024-02-01T00:00:00Z',
    sections: [
      {
        id: 'section-1',
        postId: '1',
        title: 'Pythonの基礎',
        content: 'Pythonは初心者にやさしい言語です。シンプルな文法と豊富なライブラリが特徴です。',
        order: 1,
        createdAt: '2024-02-01T00:00:00Z',
        updatedAt: '2024-02-01T00:00:00Z',
      },
      {
        id: 'section-2',
        postId: '1',
        title: '変数と型',
        content: 'Pythonの変数は動的型付けで、使いやすい設計になっています。',
        order: 2,
        createdAt: '2024-02-01T00:00:00Z',
        updatedAt: '2024-02-01T00:00:00Z',
      }
    ]
  },
  {
    id: '2',
    userId: 'user-1',
    title: 'ビジネスのためのデータ分析',
    theme: 'データ分析',
    tone: 'business',
    status: 'draft',
    createdAt: '2024-02-02T00:00:00Z',
    updatedAt: '2024-02-02T00:00:00Z',
    sections: [
      {
        id: 'section-3',
        postId: '2',
        title: 'データ分析の重要性',
        content: 'ビジネスにおけるデータ分析の重要性について解説します。',
        order: 1,
        createdAt: '2024-02-02T00:00:00Z',
        updatedAt: '2024-02-02T00:00:00Z',
      }
    ]
  }
];

export const mockAIGenerations: AIGeneration[] = [
  {
    id: 'gen-1',
    postId: '1',
    sectionId: 'section-1',
    prompt: 'Pythonの基礎について説明してください',
    response: 'Pythonは初心者にやさしい言語です...',
    type: 'content',
    createdAt: '2024-02-01T00:00:00Z'
  },
  {
    id: 'gen-2',
    postId: '1',
    prompt: 'Python入門記事のアウトラインを生成してください',
    response: 'アウトライン: 1. Pythonの基礎, 2. 変数と型...',
    type: 'outline',
    createdAt: '2024-02-01T00:00:00Z'
  }
];

export function getMockBlogPost(id: string): BlogPost | undefined {
  return mockBlogPosts.find(post => post.id === id);
}

export function getMockBlogPostsByUser(userId: string): BlogPost[] {
  return mockBlogPosts.filter(post => post.userId === userId);
}

export function getMockAIGenerationsByPost(postId: string): AIGeneration[] {
  return mockAIGenerations.filter(gen => gen.postId === postId);
}