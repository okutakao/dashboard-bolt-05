export type WritingTone = 'casual' | 'business' | 'academic';

export type OpenAIMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export type BlogSection = {
  title: string;
  content: string;
  type: 'main' | 'conclusion';
};

export interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
  error?: {
    message: string;
  };
} 