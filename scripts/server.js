import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fetch from 'node-fetch';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// グローバルなエラーハンドリングの設定
process.on('uncaughtException', (error) => {
  console.error('予期せぬエラーが発生しました:', error);
  // エラーログを記録（絶対パスを使用）
  const errorLogPath = new URL('error.log', import.meta.url).pathname;
  fs.appendFileSync(errorLogPath, `${new Date().toISOString()} - Uncaught Exception:\n${error.stack}\n\n`);
  // 3秒後に安全に終了
  setTimeout(() => {
    process.exit(1);
  }, 3000);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('未処理のPromise拒否:', reason);
  // エラーログを記録（絶対パスを使用）
  const errorLogPath = new URL('error.log', import.meta.url).pathname;
  fs.appendFileSync(errorLogPath, `${new Date().toISOString()} - Unhandled Rejection:\n${reason}\n\n`);
});

// プロセスシグナルのハンドリング
process.on('SIGTERM', () => {
  console.log('SIGTERMを受信しました。グレースフルシャットダウンを開始します...');
  shutdown();
});

process.on('SIGINT', () => {
  console.log('SIGINTを受信しました。グレースフルシャットダウンを開始します...');
  shutdown();
});

// グローバルなサーバーインスタンス
let server;

// グレースフルシャットダウン関数
function shutdown() {
  // アクティブな接続を終了
  if (server) {
    console.log('アクティブな接続を終了中...');
    server.close(() => {
      console.log('サーバーをシャットダウンしました。');
      process.exit(0);
    });

    // 3秒後に強制終了（タイムアウト時間を短縮）
    setTimeout(() => {
      console.log('強制シャットダウンを実行します。');
      process.exit(0);
    }, 3000);
  } else {
    console.log('サーバーインスタンスが見つかりません。直ちに終了します。');
    process.exit(0);
  }
}

dotenv.config();

const app = express();

// CORSの設定
app.use(cors({
  origin: function(origin, callback) {
    // 開発環境からのリクエストをすべて許可
    const allowedOrigins = ['http://localhost:5173', 'http://localhost:5174'];
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'],
  credentials: true
}));

app.use(express.json());

// APIキーの確認と整形
const apiKey = process.env.OPENAI_API_KEY?.replace(/[^\x20-\x7E]/g, '').trim();
if (!apiKey) {
  console.error('Error: OPENAI_API_KEY is not set in environment variables');
  process.exit(1);
}

// APIキーの形式を検証（sk-proj-で始まるキーも許可）
if (!apiKey.startsWith('sk-') && !apiKey.startsWith('sk-proj-')) {
  console.error('Error: Invalid OPENAI_API_KEY format. Key should start with "sk-" or "sk-proj-"');
  process.exit(1);
}

// OpenAI APIのベースURL
const OPENAI_API_BASE_URL = 'https://api.openai.com/v1';

// サーバーの状態監視
let isServerHealthy = true;
let lastError = null;

// ヘルスチェック用の詳細情報
const getHealthStatus = () => ({
  status: isServerHealthy ? 'ok' : 'error',
  apiKeySet: !!apiKey,
  lastError: lastError ? {
    message: lastError.message,
    timestamp: new Date().toISOString()
  } : null,
  uptime: process.uptime(),
  memory: process.memoryUsage()
});

// 定期的なヘルスチェック
setInterval(() => {
  const status = getHealthStatus();
  console.log('Health Check:', status);
  
  // メモリ使用量が高い場合は警告
  const memoryUsagePercent = (status.memory.heapUsed / status.memory.heapTotal) * 100;
  if (memoryUsagePercent > 90) {
    console.warn(`High memory usage: ${memoryUsagePercent.toFixed(2)}%`);
  }
}, 60000); // 1分ごとにチェック

// エラーハンドリングの強化
const handleError = (error, req) => {
  lastError = error;
  isServerHealthy = false;
  console.error('Error occurred:', {
    timestamp: new Date().toISOString(),
    path: req.path,
    method: req.method,
    error: {
      message: error.message,
      stack: error.stack
    }
  });
  
  // 5分後に状態をリセット
  setTimeout(() => {
    isServerHealthy = true;
    lastError = null;
  }, 300000);
};

// リクエストタイムアウトの設定
const TIMEOUT = 30000; // 30秒

// タイムアウト付きのfetchラッパー関数
async function fetchWithTimeout(url, options) {
  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, TIMEOUT);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeout);
    return response;
  } catch (error) {
    clearTimeout(timeout);
    throw error;
  }
}

// ヘルスチェックエンドポイントの強化
app.get('/health', (req, res) => {
  const status = getHealthStatus();
  res.json(status);
});

// トークン検証エンドポイント
app.get('/api/validate-token', async (req, res) => {
  try {
    console.log('トークン検証を開始します...');
    console.log('使用するAPIキー:', apiKey.substring(0, 10) + '...');
    
    const response = await fetchWithTimeout('https://api.openai.com/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey.trim()}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('トークン検証エラー:', errorData);
      throw new Error(`トークン検証に失敗しました: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    console.log('トークン検証成功:', data);
    res.json({ status: 'valid', models: data });
  } catch (error) {
    console.error('トークン検証中にエラーが発生:', error);
    res.status(500).json({
      status: 'invalid',
      error: error.message,
      details: error.stack
    });
  }
});

// チャット完了エンドポイントの改善
app.post('/api/chat/completions', async (req, res) => {
  try {
    const { messages } = req.body;
    
    console.log('リクエストを受信:', JSON.stringify(req.body, null, 2));
    
    // APIキーの検証と整形
    if (!apiKey || typeof apiKey !== 'string') {
      throw new Error('有効なAPIキーが設定されていません');
    }
    
    const cleanApiKey = apiKey.replace(/[^\x20-\x7E]/g, '').trim();
    if (!cleanApiKey.startsWith('sk-') && !cleanApiKey.startsWith('sk-proj-')) {
      throw new Error('APIキーの形式が正しくありません');
    }
    
    console.log('使用するAPIキー:', cleanApiKey.substring(0, 10) + '...');
    
    const response = await fetchWithTimeout(`${OPENAI_API_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${cleanApiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: messages,
        temperature: 0.7,
        max_tokens: 1000,
        n: 1,
        stream: false
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenAI APIエラーレスポンス:', errorData);
      throw new Error(`APIリクエストが失敗: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    console.log('OpenAI API リクエスト成功');
    res.json(data);
  } catch (error) {
    console.error('Error in /api/chat/completions:', error);
    res.status(500).json({ 
      error: 'APIエラーが発生しました',
      details: error.message,
      stack: error.stack
    });
  }
});

// タイトル生成エンドポイント
app.post('/api/generate-title', async (req, res) => {
  try {
    const { theme, content } = req.body;
    
    if (!theme && !content) {
      throw new Error('テーマまたは内容が必要です');
    }

    console.log('タイトル生成リクエストを受信:', { theme, content: content?.substring(0, 100) + '...' });
    
    const messages = [
      {
        role: "system",
        content: "あなたはブログ記事のタイトルを生成する専門家です。SEOを意識した魅力的なタイトルを3つ提案してください。"
      },
      {
        role: "user",
        content: `以下の条件でブログ記事のタイトルを3つ提案してください：
        
テーマ: ${theme || '指定なし'}
内容の一部: ${content ? content.substring(0, 500) + '...' : '指定なし'}

条件：
- 読者の興味を引く魅力的なタイトル
- SEOを意識した検索されやすいタイトル
- 30文字以内
- 記事の価値が伝わるタイトル
- 日本語で提案

形式：
1. [タイトル1]
2. [タイトル2]
3. [タイトル3]
`
      }
    ];

    const response = await fetchWithTimeout(`${OPENAI_API_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: messages,
        temperature: 0.8,
        max_tokens: 500,
        n: 1,
        stream: false
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`タイトル生成に失敗: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    console.log('タイトル生成成功');
    res.json(data);
  } catch (error) {
    console.error('Error in /api/generate-title:', error);
    res.status(500).json({ 
      error: 'タイトル生成エラー',
      details: error.message
    });
  }
});

// 記事構成生成エンドポイント
app.post('/api/generate-outline', async (req, res) => {
  try {
    const { theme, tone } = req.body;
    
    if (!theme) {
      throw new Error('テーマが必要です');
    }

    console.log('記事構成生成リクエストを受信:', { theme, tone });
    
    const messages = [
      {
        role: "system",
        content: "あなたはブログ記事の構成を提案する専門家です。読者が理解しやすく、SEOに効果的な記事構成を提案してください。"
      },
      {
        role: "user",
        content: `以下の条件でブログ記事の構成を提案してください：
        
テーマ: ${theme}
文体: ${tone || 'カジュアル'}

条件：
- 読者が理解しやすい流れ
- SEOを意識した構成
- 3〜5個のセクション
- 各セクションに推奨文字数
- 具体的で実用的な内容

形式：
{
  "sections": [
    {
      "title": "セクションタイトル",
      "description": "セクションの説明",
      "recommendedLength": "推奨文字数"
    }
  ],
  "estimatedReadingTime": "推定読了時間",
  "targetAudience": "想定読者",
  "keywords": ["キーワード1", "キーワード2", ...]
}`
      }
    ];

    const response = await fetchWithTimeout(`${OPENAI_API_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey.trim()}`
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: messages,
        temperature: 0.7,
        max_tokens: 1000,
        n: 1,
        stream: false
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenAI APIエラーレスポンス:', errorData);
      throw new Error(`記事構成生成に失敗: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    console.log('OpenAI API リクエスト成功:', data);

    try {
      const content = data.choices[0].message.content;
      const parsedContent = JSON.parse(content);
      res.json(parsedContent);
    } catch (parseError) {
      console.error('JSONパースエラー:', parseError);
      throw new Error('APIレスポンスの形式が不正です');
    }
  } catch (error) {
    console.error('Error in /api/generate-outline:', error);
    lastError = error;
    isServerHealthy = false;
    res.status(500).json({ 
      error: '記事構成生成エラー',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 記事本文生成エンドポイント
app.post('/api/generate-content', async (req, res) => {
  try {
    const { title, theme, outline, tone } = req.body;
    
    if (!title || !theme || !outline) {
      throw new Error('タイトル、テーマ、アウトラインは必須です');
    }

    console.log('記事本文生成リクエストを受信:', { title, theme, tone });
    
    const messages = [
      {
        role: "system",
        content: "あなたは専門的な記事ライターです。与えられたテーマとアウトラインに基づいて、読者を惹きつける記事を生成してください。"
      },
      {
        role: "user",
        content: `以下の条件で記事を生成してください：

タイトル: ${title}
テーマ: ${theme}
文体: ${tone || 'カジュアル'}
アウトライン:
${JSON.stringify(outline, null, 2)}

条件：
- 各セクションの推奨文字数に従う
- ${tone === 'casual' ? 'カジュアルで親しみやすい文体' : tone === 'business' ? 'ビジネス向けの簡潔で明確な文体' : '学術的で客観的な文体'}を使用
- 読者の興味を引く具体例を含める
- 文章は自然で読みやすくする
- 各セクションの内容は前後のセクションと自然に繋がるようにする

形式：
{
  "sections": [
    {
      "title": "セクションタイトル",
      "content": "セクションの内容"
    }
  ]
}`
      }
    ];

    const response = await fetchWithTimeout(`${OPENAI_API_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: messages,
        temperature: 0.7,
        max_tokens: 2000,
        n: 1,
        stream: false
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`記事本文生成に失敗: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    console.log('記事本文生成成功');
    
    try {
      // 制御文字を除去してからJSONをパース
      const cleanContent = data.choices[0].message.content.replace(/[\x00-\x1F\x7F-\x9F]/g, '');
      console.log('生成されたコンテンツ:', cleanContent);
      const generatedContent = JSON.parse(cleanContent);
      res.json(generatedContent);
    } catch (parseError) {
      console.error('JSONパースエラー:', parseError);
      console.error('生のコンテンツ:', data.choices[0].message.content);
      throw new Error('生成されたコンテンツの形式が不正です');
    }
  } catch (error) {
    console.error('Error in /api/generate-content:', error);
    res.status(500).json({ 
      error: '記事本文生成エラー',
      details: error.message,
      stack: error.stack
    });
  }
});

// エラーハンドリングミドルウェア
app.use((err, req, res, next) => {
  console.error('サーバーエラー:', err);
  res.status(500).json({
    error: 'サーバーエラーが発生しました',
    details: err.message
  });
});

// サーバーの起動
const PORT = process.env.PORT || 3000;
server = app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log('Environment variables:');
  console.log(`- OPENAI_API_KEY: ${apiKey ? '設定されています (' + apiKey.substring(0, 10) + '...)' : '設定されていません'}`);
});

// Keep-Alive接続のタイムアウト設定
server.keepAliveTimeout = 65000;
server.headersTimeout = 66000; 