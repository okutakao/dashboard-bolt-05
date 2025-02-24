import { BlogPost, AIGeneration } from './models';

const mockBlogPosts: BlogPost[] = [
  {
    id: '1',
    userId: 'user1',
    title: 'はじめてのReact開発',
    theme: 'React入門',
    tone: 'casual',
    status: 'published',
    createdAt: '2024-02-19T10:00:00Z',
    updatedAt: '2024-02-19T10:00:00Z',
    sections: [
      {
        id: 'section1',
        postId: '1',
        title: 'Reactの基本概念',
        content: 'Reactは...',
        sortOrder: 1,
        createdAt: '2024-02-19T10:00:00Z',
        updatedAt: '2024-02-19T10:00:00Z'
      },
      {
        id: 'section2',
        postId: '1',
        title: 'コンポーネントの作成',
        content: 'コンポーネントは...',
        sortOrder: 2,
        createdAt: '2024-02-19T10:00:00Z',
        updatedAt: '2024-02-19T10:00:00Z'
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
        sortOrder: 1,
        createdAt: '2024-02-02T00:00:00Z',
        updatedAt: '2024-02-02T00:00:00Z',
      }
    ]
  }
];

const mockAIGenerations: AIGeneration[] = [
  {
    id: '1',
    userId: 'user1',
    postId: '1',
    prompt: 'ブログのアウトラインを生成してください',
    response: 'アウトライン案...',
    model: 'gpt-4-mini',
    createdAt: '2024-02-19T10:00:00Z',
    updatedAt: '2024-02-19T10:00:00Z'
  }
];

export function getMockBlogPosts(): BlogPost[] {
  return mockBlogPosts;
}

export function getMockBlogPost(postId: string): BlogPost | undefined {
  return mockBlogPosts.find(post => post.id === postId);
}

export function getMockAIGenerations(postId: string): AIGeneration[] {
  return mockAIGenerations.filter(gen => gen.postId === postId);
}