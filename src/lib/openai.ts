import { WritingTone } from '../types';
import { createClient } from '@supabase/supabase-js';

// Supabaseクライアントの初期化
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: false
    }
  }
);

// Edge Functions URLの設定
const FUNCTIONS_URL = `${import.meta.env.VITE_SUPABASE_FUNCTIONS_URL}/openai`;

/**
 * OpenAI APIを呼び出す共通関数
 */
async function callOpenAIFunction(messages: any[]) {
  let retryCount = 0;
  const maxRetries = 3;
  const baseDelay = 1000; // 1秒

  while (retryCount < maxRetries) {
    try {
      console.log('Calling OpenAI Function...');
      console.log('Messages:', messages);

      const { data, error } = await supabase.functions.invoke('openai', {
        body: { 
          messages,
          options: {
            temperature: 0.7,
            top_p: 0.9,
            frequency_penalty: 0.0,
            presence_penalty: 0.0
          }
        }
      });

      if (error) {
        console.error('Supabase Functions Error:', error);
        if (error.message?.includes('rate_limit_exceeded')) {
          // レート制限エラーの場合は再試行
          const delay = baseDelay * Math.pow(2, retryCount);
          console.log(`Rate limit exceeded. Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          retryCount++;
          continue;
        }
        throw error;
      }

      console.log('API Response:', data);
      return data.content;
    } catch (error) {
      console.error('API Call Error:', error);
      
      if (retryCount < maxRetries - 1) {
        retryCount++;
        const delay = baseDelay * Math.pow(2, retryCount);
        console.log(`Retrying in ${delay}ms... (Attempt ${retryCount + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      throw new Error('APIリクエストが失敗しました: ' + (error as Error).message);
    }
  }

  throw new Error('最大リトライ回数を超えました');
}

/**
 * ChatGPTにメッセージを送信し、応答を取得する
 */
export async function sendChatMessage(message: string): Promise<string> {
  return callOpenAIFunction([{ role: "user", content: message }]);
}

/**
 * システムプロンプトを含むチャット会話を送信する
 */
export async function sendChatMessageWithSystem(
  systemPrompt: string,
  userMessage: string
): Promise<string> {
  return callOpenAIFunction([
    { role: "system", content: systemPrompt },
    { role: "user", content: userMessage }
  ]);
}

/**
 * ブログのアウトラインを生成する
 */
export async function generateBlogOutline(theme: string, tone: WritingTone) {
  try {
    const messages = [
      {
        role: "system",
        content: `あなたはブログ記事のアウトライン生成を支援するアシスタントです。
以下の条件に従ってアウトラインを生成してください：
- 文体は${tone}を使用
- 3-5個のセクションを提案
- 各セクションにはタイトルと簡単な説明を含める
- JSONフォーマットで返答（以下の形式）：
{
  "sections": [
    {
      "title": "セクションタイトル",
      "content": "セクションの説明"
    }
  ]
}`
      },
      {
        role: "user",
        content: `テーマ: ${theme}
上記のテーマについて、ブログ記事のアウトラインを生成してください。`
      }
    ];

    const response = await callOpenAIFunction(messages);
    return validateOutlineResponse(response);
  } catch (error) {
    console.error('OpenAI API error:', error);
    throw new Error('アウトライン生成に失敗しました');
  }
}

/**
 * セクションの内容を生成する
 */
export async function generateSectionContent(
  theme: string,
  sectionTitle: string,
  tone: WritingTone
) {
  try {
    const messages = [
      {
        role: "system",
        content: `あなたはブログ記事のセクション内容を生成するアシスタントです。
以下の条件に従って内容を生成してください：
- 文体は${tone}を使用
- マークダウン形式で出力
- 300-500文字程度
- 具体例や説明を含める
- 読みやすく、わかりやすい文章を心がける`
      },
      {
        role: "user",
        content: `テーマ: ${theme}
セクションタイトル: ${sectionTitle}
上記のテーマとセクションタイトルに基づいて、セクションの内容を生成してください。`
      }
    ];

    return await callOpenAIFunction(messages);
  } catch (error) {
    console.error('OpenAI API error:', error);
    throw new Error('セクション内容の生成に失敗しました');
  }
}

/**
 * 記事全体を生成する（セクションごとに分割して生成）
 */
export async function generateArticleContent(
  title: string,
  theme: string,
  sections: Array<{ title: string }>,
  tone: WritingTone
) {
  const generatedSections = [];
  const errors = [];
  let currentSection = 1;
  const totalSections = sections.length;

  console.log(`記事「${title}」の生成を開始します（全${totalSections}セクション）`);

  // 各セクションを順番に生成
  for (const section of sections) {
    try {
      console.log(`セクション ${currentSection}/${totalSections}「${section.title}」の生成を開始...`);
      
      const messages = [
        {
          role: "system",
          content: `あなたはブログ記事のセクション内容を生成するアシスタントです。
以下の条件に従って内容を生成してください：
- 文体は${tone}を使用
- マークダウン形式で出力
- 300-500文字程度
- 具体例や説明を含める
- 読みやすく、わかりやすい文章を心がける`
        },
        {
          role: "user",
          content: `タイトル: ${title}
テーマ: ${theme}
セクションタイトル: ${section.title}
上記の情報に基づいて、セクションの内容を生成してください。`
        }
      ];

      const content = await callOpenAIFunction(messages);
      
      generatedSections.push({
        title: section.title,
        content
      });

      console.log(`セクション ${currentSection}/${totalSections} の生成が完了しました`);
      
      // セクション間に少し待機時間を入れる（APIの負荷を考慮）
      if (currentSection < totalSections) {
        console.log('次のセクションの生成まで少々お待ちください...');
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      currentSection++;

    } catch (error: any) {
      console.error(`セクション「${section.title}」の生成中にエラーが発生しました:`, error);
      errors.push({
        sectionTitle: section.title,
        error: error.message || '不明なエラーが発生しました'
      });
    }
  }

  // エラーがあった場合の処理
  if (errors.length > 0) {
    const errorMessage = `以下のセクションの生成に失敗しました：\n${
      errors.map(e => `- ${e.sectionTitle}: ${e.error}`).join('\n')
    }`;
    console.error(errorMessage);
    throw new Error(errorMessage);
  }

  console.log(`記事「${title}」の全セクション（${totalSections}個）の生成が完了しました`);

  return {
    title,
    theme,
    sections: generatedSections
  };
}

// レスポンスの型定義
export interface GeneratedOutline {
  sections: {
    title: string;
    content: string;
  }[];
}

// レスポンスのバリデーション
export function validateOutlineResponse(response: string): GeneratedOutline {
  try {
    const parsed = JSON.parse(response);
    if (!parsed.sections || !Array.isArray(parsed.sections)) {
      throw new Error('Invalid outline format');
    }
    return parsed;
  } catch (error) {
    console.error('Response validation error:', error);
    throw new Error('生成されたアウトラインの形式が不正です');
  }
}

/**
 * タイトルを生成する
 */
export async function generateTitle(theme: string, content?: string): Promise<string[]> {
  try {
    const messages = [
      {
        role: "system",
        content: "あなたはブログ記事のタイトルを生成する専門家です。SEOを意識した魅力的なタイトルを3つ提案してください。"
      },
      {
        role: "user",
        content: `以下の条件でブログ記事のタイトルを3つ提案してください：
        
テーマ: ${theme}
${content ? `内容の一部: ${content}\n` : ''}
条件：
- 読者の興味を引く魅力的なタイトル
- SEOを意識した検索されやすいタイトル
- 30文字以内
- 記事の価値が伝わるタイトル
- 日本語で提案

形式：
1. [タイトル1]
2. [タイトル2]
3. [タイトル3]`
      }
    ];

    const response = await callOpenAIFunction(messages);
    
    // レスポンスからタイトルを抽出
    const titles = response
      .split('\n')
      .filter(line => line.trim().startsWith('1.') || line.trim().startsWith('2.') || line.trim().startsWith('3.'))
      .map(line => line.replace(/^\d+\.\s*\[?|\]?$/g, '').trim());

    return titles;
  } catch (error) {
    console.error('OpenAI API error:', error);
    throw new Error('タイトル生成に失敗しました');
  }
}