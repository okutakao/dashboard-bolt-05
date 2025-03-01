import { WritingTone, OpenAIMessage } from './types';
import { ArticleStructure } from './models';

/**
 * OpenAI APIを呼び出す共通関数
 */
async function callOpenAIFunction(messages: OpenAIMessage[], options?: Record<string, any>, signal?: AbortSignal): Promise<string> {
  let retryCount = 0;
  const maxRetries = 3;
  const baseDelay = 1000;

  while (retryCount <= maxRetries) {
    try {
      if (signal?.aborted) {
        const error = new Error('AbortError');
        error.name = 'AbortError';
        throw error;
      }

      console.log(`🔄 APIリクエストを実行中... (試行: ${retryCount + 1}/${maxRetries + 1})`);
      console.log('リクエストの内容:', { messages, options });

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_FUNCTIONS_URL}/openai`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
        },
        body: JSON.stringify({ messages }),
        signal,
      });

      const data = await response.json();
      console.log('APIレスポンス:', data);

      if (!response.ok) {
        console.error('APIエラーレスポンス:', data);
        if (data.details) {
          console.error('エラー詳細:', data.details);
        }

        // レート制限エラーの場合
        if (data.details?.code === 'rate_limit_exceeded' && retryCount < maxRetries) {
          const delay = baseDelay * Math.pow(2, retryCount);
          console.log(`⏳ レート制限により待機中... ${delay}ms後にリトライします`);
          await new Promise(resolve => setTimeout(resolve, delay));
          retryCount++;
          continue;
        }

        throw new Error(data.error || 'APIリクエストが失敗しました');
      }

      if (!data.content) {
        throw new Error('APIレスポンスの形式が不正です');
      }

      console.log('✅ APIリクエスト成功');
      return data.content;

    } catch (error) {
      console.error('APIリクエストエラー:', error);
      
      if (error instanceof Error) {
        console.error('エラー詳細:', {
          name: error.name,
          message: error.message,
          stack: error.stack
        });

        // AbortErrorの判定を改善
        if (error.name === 'AbortError' || 
            error.message.includes('abort') || 
            error.message.includes('aborted') || 
            signal?.aborted) {
          const abortError = new Error('AbortError');
          abortError.name = 'AbortError';
          throw abortError;
        }
      }

      if (retryCount < maxRetries) {
        const delay = baseDelay * Math.pow(2, retryCount);
        console.log(`⏳ エラーが発生しました。${delay}ms後にリトライします (${retryCount + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        retryCount++;
        continue;
      }

      throw error;
    }
  }

  throw new Error('最大リトライ回数を超過しました');
}

/**
 * ChatGPTにメッセージを送信し、応答を取得する
 */
export async function sendChatMessage(message: string): Promise<string> {
  return callOpenAIFunction([{ role: "user" as const, content: message }]);
}

/**
 * システムプロンプトを含むチャット会話を送信する
 */
export async function sendChatMessageWithSystem(
  systemPrompt: string,
  userMessage: string
): Promise<string> {
  return callOpenAIFunction([
    { role: "system" as const, content: systemPrompt },
    { role: "user" as const, content: userMessage }
  ]);
}

/**
 * ブログのアウトラインを生成する
 */
export async function generateBlogOutline(theme: string, tone: WritingTone) {
  const messages: OpenAIMessage[] = [
    {
      role: "system" as const,
      content: "あなたはブログ記事の構成を提案するアシスタントです。以下の条件に従って、日本語で記事の構成を提案してください：\n- セクションタイトルは日本語で\n- 最後のセクションは必ずまとめや結論\n- 各セクションには推奨文字数を含める\n- セクション数は3〜5個程度"
    },
    {
      role: "user" as const,
      content: `テーマ: ${theme}
文体: ${tone}

以下の形式で記事の構成を提案してください：
{
  "sections": [
    {
      "title": "セクションタイトル（日本語で）",
      "description": "セクションの説明（100文字以内）",
      "recommendedLength": {
        "min": 最小文字数,
        "max": 最大文字数
      },
      "type": "main" | "conclusion"  // 最後のセクションは必ず"conclusion"
    }
  ],
  "estimatedTotalLength": {
    "min": 合計最小文字数,
    "max": 合計最大文字数
  },
  "estimatedReadingTime": "推定読了時間（分）",
  "targetAudience": "想定読者",
  "keywords": ["キーワード1", "キーワード2"]
}`
    }
  ];

  try {
    const response = await callOpenAIFunction(messages);
    return validateOutlineResponse(response);
  } catch (error) {
    console.error('OpenAI API error:', error);
    throw new Error('アウトライン生成に失敗しました');
  }
}

/**
 * セクションの内容を生成する
 * @param theme 記事のテーマ
 * @param sectionTitle セクションのタイトル
 * @param previousSections これまでに生成された前のセクションの内容
 * @param isLastSection このセクションが最後（まとめ）かどうか
 */
export async function generateBlogContent(
  theme: string,
  sectionTitle: string,
  previousSections: Array<{ title: string; content: string }> = [],
  isLastSection: boolean = false,
  signal?: AbortSignal
) {
  const maxRetries = 3;
  const retryDelay = 1000;
  const maxTokensPerRequest = 2500;
  const minLength = 800;
  const maxLength = 1200;

  const generateWithRetry = async (retryCount: number): Promise<string> => {
    try {
      if (signal?.aborted) {
        const error = new Error('AbortError');
        error.name = 'AbortError';
        throw error;
      }

      const previousContentsContext = previousSections
        .map(section => `${section.title}:\n${section.content}\n`)
        .join('\n');

      // 基本的な内容生成
      const response = await generateBaseContent(theme, sectionTitle, previousContentsContext, isLastSection, previousSections.length === 0, signal);
      
      // 生成された内容の後処理
      const processedContent = await postProcessContent(response, retryCount, signal);
      
      // 文字数チェック - エラーメッセージを表示せずに再試行
      if (processedContent.length < minLength || processedContent.length > maxLength) {
        if (retryCount < maxRetries - 1) {
          return generateWithRetry(retryCount + 1);
        }
        // 最大試行回数を超えた場合は、現在の内容をそのまま返す
        return processedContent;
      }

      return processedContent;

    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError' || error.message === 'AbortError') {
          const abortError = new Error('生成を中止しました');
          abortError.name = 'AbortError';
          throw abortError;
        }
        // APIレート制限エラーの場合
        if (error.message.includes('rate_limit') && retryCount < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, retryDelay * (retryCount + 1)));
          return generateWithRetry(retryCount + 1);
        }
      }
      throw error;
    }
  };

  // 基本的な内容を生成する関数
  const generateBaseContent = async (
    theme: string,
    sectionTitle: string,
    previousContentsContext: string,
    isLastSection: boolean,
    isFirstSection: boolean,
    signal?: AbortSignal
  ): Promise<string> => {
    if (signal?.aborted) {
      throw new Error('AbortError');
    }

    const systemPrompt = `あなたはブログ記事のセクションを生成するアシスタントです。
以下の条件に従って内容を生成してください：
- マークダウン形式で出力
- ${minLength}字から${maxLength}字の範囲で生成
- 段落は必ず「。」で終わるようにする
- 箇条書きの項目は完結した文で終わるようにする
- 文章全体が自然に完結するようにする
- テーマに関連する具体的な事例や数値データを含める
- 読者にとって実践的で有用な情報を提供する
- 論理的な展開を心がける
- 客観的な事実に基づいて説明する

${isLastSection ? 'このセクションは記事全体のまとめとして、内容を総括し、読者へのアクションプランを含めてください。' : 
  isFirstSection ? 'このセクションは記事の最初のセクションとして、テーマの背景と重要性を説明してください。' :
  '前のセクションの内容を踏まえつつ、このセクションの内容を展開してください。'}`;

    const messages: OpenAIMessage[] = [
      { role: "system" as const, content: systemPrompt },
      {
        role: "user" as const,
        content: `テーマ: ${theme}
セクションタイトル: ${sectionTitle}
${!isFirstSection && previousContentsContext ? '\n前のセクションの内容:\n' + previousContentsContext : ''}`
      }
    ];

    return callOpenAIFunction(messages, {
      max_tokens: maxTokensPerRequest,
      temperature: 0.7,
      presence_penalty: 0.3,
      frequency_penalty: 0.3
    }, signal);
  };

  // 生成された内容の後処理を行う関数
  const postProcessContent = async (content: string, retryCount: number, signal?: AbortSignal): Promise<string> => {
    if (signal?.aborted) {
      throw new Error('AbortError');
    }

    let processedContent = content;
    let needsAdjustment = false;

    // 文字数チェックと調整
    if (content.length < minLength || content.length > maxLength) {
      const adjustmentPrompt = `以下の文章を${minLength}字から${maxLength}字の範囲に調整してください。
現在の文字数: ${content.length}字
調整の際は、文章の一貫性と完結性を保ちながら、必要に応じて詳細の追加や削減を行ってください。

${content}`;

      if (retryCount < maxRetries - 1) {
        processedContent = await callOpenAIFunction([
          { role: "system" as const, content: "文章の長さを調整しつつ、内容の一貫性と完結性を保ってください。" },
          { role: "user" as const, content: adjustmentPrompt }
        ], signal);
        needsAdjustment = true;
      }
    }

    // 段落の終わり方をチェックと修正
    const paragraphs = processedContent.split(/\n\s*\n/).map(p => p.trim()).filter(p => p.length > 0);
    const hasInvalidEnding = paragraphs.some(p => {
      // 箇条書きやコードブロック、見出しは除外
      if (p.startsWith('- ') || p.startsWith('* ') || p.startsWith('```') || p.startsWith('#')) {
        return false;
      }
      return !p.endsWith('。') && !p.endsWith('」') && !p.endsWith('）') && !p.endsWith('！') && !p.endsWith('？');
    });

    if (hasInvalidEnding && retryCount < maxRetries - 1) {
      const adjustmentPrompt = `以下の文章の段落を適切に終わるように修正してください。
- 各段落は「。」「！」「？」「」」「）」のいずれかで終わるようにしてください
- 箇条書きやコードブロック、見出しは対象外です
- 文章の自然な流れを保ちながら修正してください

${processedContent}`;

      processedContent = await callOpenAIFunction([
        { role: "system" as const, content: "文章の完結性を保ちながら、段落の終わり方を適切に修正してください。" },
        { role: "user" as const, content: adjustmentPrompt }
      ], signal);
      needsAdjustment = true;
    }

    // 最終チェック
    if (needsAdjustment && retryCount < maxRetries - 1) {
      const finalCheckPrompt = `以下の文章を最終確認し、必要に応じて微調整してください：
- 文章の一貫性と完結性の確認
- 段落の適切な終わり方の確認
- 文字数が${minLength}字から${maxLength}字の範囲内であることの確認

${processedContent}`;

      processedContent = await callOpenAIFunction([
        { role: "system" as const, content: "最終確認と微調整を行います。" },
        { role: "user" as const, content: finalCheckPrompt }
      ], signal);
    }

    return processedContent;
  };

  return generateWithRetry(0);
}

/**
 * 記事全体を生成する（セクション間の連携を保ちながら生成）
 */
export async function generateArticleContent(
  title: string,
  theme: string,
  sections: Array<{ title: string; type: 'main' | 'conclusion' }>,
  tone: WritingTone
) {
  const structure: ArticleStructure = {
    introduction: {
      title: sections[0].title,
      content: '',
      targetLength: { min: 200, max: 300 }
    },
    mainSections: sections.slice(1, -1).map(section => ({
      title: section.title,
      content: '',
      targetLength: { min: 600, max: 800 }
    })),
    conclusion: {
      title: sections[sections.length - 1].title,
      content: '',
      targetLength: { min: 200, max: 300 },
      fullContext: ''
    }
  };

  console.log(`記事「${title}」の生成を開始します`);

  try {
    // 導入部の生成
    console.log('導入部の生成を開始...');
    const introMessages: OpenAIMessage[] = [
      {
        role: "system" as const,
        content: `あなたはブログ記事の導入部を生成するアシスタントです。
以下の条件に従って導入部を生成してください：
- 文体は${tone}を使用
- ${structure.introduction.targetLength.min}〜${structure.introduction.targetLength.max}文字
- 記事全体の概要を簡潔に説明
- 読者の興味を引く導入
- 記事の目的を明確に示す
- 必ず完結した形で終わらせる
- 途中で文章が切れないようにする`
      },
      {
        role: "user" as const,
        content: `タイトル: ${title}
テーマ: ${theme}
導入部のタイトル: ${structure.introduction.title}
上記の情報に基づいて、記事の導入部を生成してください。`
      }
    ];

    structure.introduction.content = await callOpenAIFunction(introMessages, {
      max_tokens: 1000,
      temperature: 0.7
    });
    console.log('導入部の生成が完了しました');

    // メインセクションの生成
    let previousContext = structure.introduction.content;
    for (let i = 0; i < structure.mainSections.length; i++) {
      const section = structure.mainSections[i];
      console.log(`メインセクション ${i + 1}/${structure.mainSections.length}「${section.title}」の生成を開始...`);

      const mainSectionMessages: OpenAIMessage[] = [
        {
          role: "system" as const,
          content: `あなたはブログ記事のメインセクションを生成するアシスタントです。
以下の条件に従って内容を生成してください：
- 文体は${tone}を使用
- ${section.targetLength.min}〜${section.targetLength.max}文字
- 前のセクションの内容を踏まえて展開
- 具体例や説明を含める
- 読みやすく、わかりやすい文章を心がける
- 次のセクションへの自然な繋がりを意識
- 必ず完結した形で終わらせる
- 途中で文章が切れないようにする`
        },
        {
          role: "user" as const,
          content: `タイトル: ${title}
テーマ: ${theme}
セクションタイトル: ${section.title}
前のセクションの内容:
${previousContext}

上記の情報に基づいて、このセクションの内容を生成してください。`
        }
      ];

      section.content = await callOpenAIFunction(mainSectionMessages, {
        max_tokens: 2000,
        temperature: 0.7
      });
      previousContext = section.content;
      console.log(`メインセクション ${i + 1} の生成が完了しました`);

      // セクション間に適度な待機時間を設定
      if (i < structure.mainSections.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    // まとめの生成（最終セクション）
    console.log('まとめセクションの生成を開始...');
    const fullContext = [
      structure.introduction.content,
      ...structure.mainSections.map(section => section.content)
    ].join('\n\n');

    structure.conclusion.fullContext = fullContext;
    const conclusionMessages: OpenAIMessage[] = [
      {
        role: "system" as const,
        content: `あなたはブログ記事のまとめセクションを生成するアシスタントです。
これは記事全体の最後のセクションとして、以下の条件に従って生成してください：
- 文体は${tone}を使用
- ${structure.conclusion.targetLength.min}〜${structure.conclusion.targetLength.max}文字
- 記事全体の要点を簡潔にまとめる
- これまでの内容を総括
- 読者への具体的なアクションや次のステップを提案
- 記事全体の結論を明確に示す
- 必ず完結した形で終わらせる
- 途中で文章が切れないようにする`
      },
      {
        role: "user" as const,
        content: `タイトル: ${title}
テーマ: ${theme}
まとめのタイトル: ${structure.conclusion.title}
これまでの記事の内容:
${fullContext}

上記の内容を踏まえて、記事全体のまとめとなる最終セクションを生成してください。
このセクションは記事全体の結論として、読者に明確なメッセージを残すように作成してください。`
      }
    ];

    structure.conclusion.content = await callOpenAIFunction(conclusionMessages, {
      max_tokens: 1000,
      temperature: 0.7
    });
    console.log('まとめセクションの生成が完了しました');

    // 生成された内容の検証
    const validateContent = (content: string, minLength: number, maxLength: number) => {
      if (!content || content.length < minLength) {
        throw new Error(`生成された内容が短すぎます（${content.length}文字）`);
      }
      if (content.length > maxLength) {
        throw new Error(`生成された内容が長すぎます（${content.length}文字）`);
      }
    };

    validateContent(structure.introduction.content, structure.introduction.targetLength.min, structure.introduction.targetLength.max);
    structure.mainSections.forEach(section => {
      validateContent(section.content, section.targetLength.min, section.targetLength.max);
    });
    validateContent(structure.conclusion.content, structure.conclusion.targetLength.min, structure.conclusion.targetLength.max);

    return {
      title,
      theme,
      sections: [
        { title: structure.introduction.title, content: structure.introduction.content, type: 'main' },
        ...structure.mainSections.map(section => ({
          title: section.title,
          content: section.content,
          type: 'main'
        })),
        { 
          title: structure.conclusion.title, 
          content: structure.conclusion.content,
          type: 'conclusion'
        }
      ]
    };

  } catch (error) {
    console.error('記事生成中にエラーが発生しました:', error);
    throw new Error('記事の生成に失敗しました: ' + (error as Error).message);
  }
}

// レスポンスの型定義
export interface GeneratedOutline {
  sections: {
    title: string;
    content: string;
    type: 'main' | 'conclusion';
    recommendedLength?: {
      min: number;
      max: number;
    };
  }[];
  estimatedTotalLength?: {
    min: number;
    max: number;
  };
  estimatedReadingTime?: number;
  targetAudience?: string;
  keywords?: string[];
}

// レスポンスのバリデーション
export function validateOutlineResponse(response: string): GeneratedOutline {
  try {
    const parsed = JSON.parse(response);
    if (!parsed.sections || !Array.isArray(parsed.sections)) {
      throw new Error('Invalid outline format');
    }

    // 最後のセクションがconclusion typeであることを確認
    const lastSection = parsed.sections[parsed.sections.length - 1];
    if (!lastSection || lastSection.type !== 'conclusion') {
      throw new Error('Last section must be a conclusion');
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
  const maxRetries = 3;
  const baseDelay = 1000;

  const generateWithRetry = async (attempt: number): Promise<string[]> => {
    try {
      const messages: OpenAIMessage[] = [
        {
          role: "system",
          content: "あなたはブログ記事のタイトルを生成する専門家です。SEOを意識した魅力的なタイトルを3つ提案してください。"
        },
        {
          role: "user",
          content: `以下の条件でブログ記事のタイトルを3つ提案してください：
          
テーマ: ${theme}
${content ? `内容: ${content}` : ''}

条件：
- 30文字以内
- SEOを意識した魅力的な表現
- 日本語で作成
- 具体的で分かりやすい表現
- 必ず3つのタイトルを提案
- 各タイトルは改行で区切る`
        }
      ];

      console.log('タイトル生成リクエストを送信:', { theme, content });
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_FUNCTIONS_URL}/openai`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
        },
        body: JSON.stringify({ messages })
      });

      const data = await response.json();
      console.log('タイトル生成レスポンス:', data);

      if (!response.ok) {
        throw new Error(data.error || 'APIリクエストが失敗しました');
      }

      const titles = data.content.split('\n').filter((title: string) => 
        title.trim() && title.length <= 30
      );

      console.log('生成されたタイトル:', titles);

      if (titles.length === 0) {
        throw new Error('有効なタイトルが生成されませんでした');
      }

      if (titles.length < 3) {
        throw new Error(`十分な数のタイトルが生成されませんでした（生成数: ${titles.length}）`);
      }

      return titles.slice(0, 3);
    } catch (error: unknown) {
      console.error('タイトル生成エラー:', error);
      
      if (error instanceof Error) {
        console.error('エラー詳細:', {
          name: error.name,
          message: error.message,
          stack: error.stack
        });
      }

      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt - 1);
        console.log(`エラーが発生しました。${delay}ms後に再試行します...（試行回数: ${attempt}/${maxRetries}）`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return generateWithRetry(attempt + 1);
      }
      
      const errorMessage = error instanceof Error ? error.message : '不明なエラーが発生しました';
      throw new Error(`タイトル生成に失敗しました: ${errorMessage}`);
    }
  };

  return generateWithRetry(1);
}