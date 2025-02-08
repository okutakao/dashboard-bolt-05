import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fetch from 'node-fetch';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// グローバルなエラーハンドリングの設定
process.on('uncaughtException', (error) => {
  console.error('予期せぬエラーが発生しました:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('未処理のPromise拒否:', reason);
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

// グレースフルシャットダウン関数
function shutdown() {
  // アクティブな接続を終了
  if (server) {
    server.close(() => {
      console.log('サーバーをシャットダウンしました。');
      process.exit(0);
    });

    // 10秒後に強制終了
    setTimeout(() => {
      console.error('グレースフルシャットダウンがタイムアウトしました。強制終了します。');
      process.exit(1);
    }, 10000);
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
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(express.json());

// APIキーの確認と整形
const apiKey = process.env.OPENAI_API_KEY?.replace(/[^\x20-\x7E]/g, '').trim();
if (!apiKey) {
  console.error('Error: OPENAI_API_KEY is not set in environment variables');
  process.exit(1);
}

// APIキーの形式を検証
if (!apiKey.startsWith('sk-')) {
  console.error('Error: Invalid OPENAI_API_KEY format. Key should start with "sk-"');
  process.exit(1);
}

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
  if (memoryUsagePercent > 80) {
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
    if (!cleanApiKey.startsWith('sk-')) {
      throw new Error('APIキーの形式が正しくありません');
    }
    
    console.log('使用するAPIキー:', cleanApiKey.substring(0, 10) + '...');
    
    const response = await fetchWithTimeout('https://api.openai.com/v1/chat/completions', {
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

    const response = await fetchWithTimeout('https://api.openai.com/v1/chat/completions', {
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

    const response = await fetchWithTimeout('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
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
      throw new Error(`記事構成生成に失敗: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    console.log('記事構成生成成功');
    
    // レスポンスの内容をJSONとしてパース
    const outlineContent = JSON.parse(data.choices[0].message.content);
    res.json(outlineContent);
  } catch (error) {
    console.error('Error in /api/generate-outline:', error);
    res.status(500).json({ 
      error: '記事構成生成エラー',
      details: error.message
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

const PORT = process.env.PORT || 3000;

// サーバーの起動処理の改善
const startServer = () => {
  try {
    const server = app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
      console.log('Environment variables:');
      console.log('- OPENAI_API_KEY:', apiKey ? `設定されています (${apiKey.substring(0, 10)}...)` : '設定されていません');
    });

    // Keep-Alive接続のタイムアウト設定
    server.keepAliveTimeout = 65000;
    server.headersTimeout = 66000;

    // グレースフルシャットダウンの設定
    process.on('SIGTERM', () => {
      console.log('SIGTERM received. Starting graceful shutdown...');
      server.close(() => {
        console.log('Server closed');
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      console.log('SIGINT received. Starting graceful shutdown...');
      server.close(() => {
        console.log('Server closed');
        process.exit(0);
      });
    });

    return server;
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// サーバーの起動
const server = startServer(); 