import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';

// メモリ使用量の監視間隔（ミリ秒）
const MEMORY_CHECK_INTERVAL = 30000; // 30秒

// メモリ使用量の閾値（バイト）
const MEMORY_THRESHOLD = 450 * 1024 * 1024; // 450MB

// ログファイルの設定
const LOG_DIR = 'logs';
const SERVER_LOG_FILE = path.join(LOG_DIR, 'server.log');
const ERROR_LOG_FILE = path.join(LOG_DIR, 'error.log');
const MEMORY_LOG_FILE = path.join(LOG_DIR, 'memory.log');

// ログディレクトリの作成
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR);
}

// ログ出力関数
function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${type}] ${message}\n`;
  
  // コンソールに出力
  console.log(logMessage);
  
  // ファイルに出力
  try {
    const logFile = type === 'error' ? ERROR_LOG_FILE : SERVER_LOG_FILE;
    fs.appendFileSync(logFile, logMessage);
  } catch (err) {
    console.error('ログファイルの書き込みに失敗:', err);
  }
}

// メモリ使用量のログ出力
function logMemoryUsage() {
  const used = process.memoryUsage();
  const message = `Memory Usage - RSS: ${Math.round(used.rss / 1024 / 1024)}MB, Heap: ${Math.round(used.heapUsed / 1024 / 1024)}MB/${Math.round(used.heapTotal / 1024 / 1024)}MB`;
  
  try {
    fs.appendFileSync(MEMORY_LOG_FILE, `${new Date().toISOString()} - ${message}\n`);
  } catch (err) {
    console.error('メモリログの書き込みに失敗:', err);
  }
  
  // メモリ使用量が閾値を超えた場合
  if (used.rss > MEMORY_THRESHOLD) {
    log('メモリ使用量が閾値を超えました。ガベージコレクションを実行します。', 'warn');
    if (global.gc) {
      global.gc();
    }
  }
}

// 定期的なメモリ監視
setInterval(logMemoryUsage, MEMORY_CHECK_INTERVAL);

// プロセスIDの保存
const PID_FILE = '.backend.pid';

// 未処理のエラーをキャッチ
process.on('uncaughtException', (error) => {
  log(`未処理のエラーが発生しました: ${error.stack || error.message}`, 'error');
  // エラーログを書き込んでから終了
  setTimeout(() => {
    process.exit(1);
  }, 1000);
});

process.on('unhandledRejection', (reason, promise) => {
  log(`未処理のPromise rejectionが発生しました: ${reason}`, 'error');
});

// 終了シグナルのハンドリング
process.on('SIGTERM', () => {
  log('SIGTERMを受信しました');
  shutdown();
});

process.on('SIGINT', () => {
  log('SIGINTを受信しました');
  shutdown();
});

dotenv.config();

const app = express();

// CORSの設定
app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 600 // 10分
}));

// プリフライトリクエストの処理
app.options('*', cors());

app.use(express.json());

// リクエストロギングミドルウェア
app.use((req, res, next) => {
  log(`${req.method} ${req.url}`, 'request');
  next();
});

// 環境変数の検証
if (!process.env.OPENAI_API_KEY) {
  console.error('Error: OPENAI_API_KEY is not set in environment variables');
  process.exit(1);
}

// APIキーの確認
const apiKey = process.env.OPENAI_API_KEY;

// OpenAI APIのベースURL
const OPENAI_API_BASE_URL = 'https://api.openai.com/v1';

// ヘルスチェックエンドポイントの強化
app.get('/health', (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    pid: process.pid
  };
  res.json(health);
});

// エラーハンドリングミドルウェア
app.use((err, req, res, next) => {
  console.error('エラーが発生しました:', err);
  res.status(500).json({
    error: 'サーバーエラーが発生しました',
    message: err.message
  });
});

// タイトル生成エンドポイント
app.post('/api/generate-title', async (req, res) => {
  try {
    const { theme, content } = req.body;
    
    if (!theme && !content) {
      throw new Error('テーマまたは内容が必要です');
    }

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
3. [タイトル3]`
      }
    ];

    const response = await fetch(`${OPENAI_API_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages,
        temperature: 0.8,
        max_tokens: 500,
        n: 1
      })
    });

    if (!response.ok) {
      throw new Error(`タイトル生成に失敗: ${response.statusText}`);
    }

    const data = await response.json();
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

    const messages = [
      {
        role: "system",
        content: "ブログ記事の構成を提案してください。"
      },
      {
        role: "user",
        content: `テーマ: ${theme}
文体: ${tone || 'カジュアル'}

以下の形式で記事の構成を提案してください：
{
  "sections": [
    {
      "title": "セクションタイトル",
      "description": "セクションの説明（100文字以内）",
      "recommendedLength": "推奨文字数"
    }
  ],
  "estimatedReadingTime": "推定読了時間",
  "targetAudience": "想定読者",
  "keywords": ["キーワード1", "キーワード2"]
}`
      }
    ];

    const response = await fetch(`${OPENAI_API_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages,
        temperature: 0.7,
        max_tokens: 1000,
        n: 1
      })
    });

    if (!response.ok) {
      throw new Error(`記事構成生成に失敗: ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    const result = JSON.parse(content);
    res.json(result);
  } catch (error) {
    console.error('Error in /api/generate-outline:', error);
    res.status(500).json({ 
      error: '記事構成生成エラー',
      details: error.message
    });
  }
});

// チャット完了エンドポイント
app.post('/api/chat/completions', async (req, res) => {
  try {
    const response = await fetch(`${OPENAI_API_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(req.body)
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Error in /api/chat/completions:', error);
    res.status(500).json({ 
      error: 'APIエラーが発生しました',
      details: error.message
    });
  }
});

// サーバーの起動
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  // サーバー起動後にPIDファイルを作成
  try {
    fs.writeFileSync(PID_FILE, process.pid.toString());
    log(`PIDファイルを作成しました: ${process.pid}`);
  } catch (err) {
    log(`PIDファイルの作成に失敗: ${err}`, 'error');
    // PIDファイルが作成できない場合は起動を中止
    process.exit(1);
  }

  log(`サーバーが起動しました: http://localhost:${PORT}`);
  log(`プロセスID: ${process.pid}`);
  logMemoryUsage();
});

// サーバーのエラーハンドリング
server.on('error', (error) => {
  log(`サーバーエラーが発生しました: ${error}`, 'error');
  shutdown();
});

// 正常なシャットダウンの処理
const shutdown = () => {
  log('サーバーをシャットダウンしています...');
  
  // PIDファイルの削除
  try {
    fs.unlinkSync(PID_FILE);
  } catch (err) {
    log(`PIDファイルの削除に失敗: ${err}`, 'error');
  }
  
  server.close(() => {
    log('サーバーが正常にシャットダウンしました');
    process.exit(0);
  });
  
  // 強制シャットダウンのタイマー
  setTimeout(() => {
    log('強制シャットダウンを実行します', 'warn');
    process.exit(1);
  }, 10000); // 10秒後に強制終了
};