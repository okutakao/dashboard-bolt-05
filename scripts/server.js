import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { logError, logMemory, logProcess } from '../scripts/utils/logging.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// グローバルなサーバーインスタンス
let server;

// シャットダウン中フラグ
let isShuttingDown = false;

// ログファイルのパスを設定
const LOG_DIR = path.join(process.cwd(), 'logs');
const ERROR_LOG_PATH = path.join(LOG_DIR, 'error.log');
const MEMORY_LOG_PATH = path.join(LOG_DIR, 'memory.log');
const PROCESS_LOG_PATH = path.join(LOG_DIR, 'process.log');

// ログディレクトリの作成を確認
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// メモリリーク対策の強化
const resourceManagement = {
  activeConnections: new Set(),
  requestCount: 0,
  lastCleanup: Date.now(),
  cleanupInterval: 60000, // 1分ごとにクリーンアップ

  // 接続の追跡
  trackConnection(req, res) {
    const id = Date.now() + Math.random();
    this.activeConnections.add(id);
    this.requestCount++;

    // リクエスト完了時のクリーンアップ
    res.on('finish', () => {
      this.activeConnections.delete(id);
    });

    // 定期的なクリーンアップの実行
    if (Date.now() - this.lastCleanup > this.cleanupInterval) {
      this.performCleanup();
    }
  },

  // リソースクリーンアップ
  async performCleanup() {
    this.lastCleanup = Date.now();
    this.activeConnections.clear();
    this.requestCount = 0;
    
    // 強制的なGCの実行
    if (global.gc) {
      global.gc();
    }
  }
};

// メモリ管理の設定を調整
const memoryManagement = {
  lastGC: Date.now(),
  gcInterval: 30000, // 30秒ごとにGCを検討
  warningThreshold: 70, // 警告閾値を70%に設定
  criticalThreshold: 80, // クリティカル閾値を80%に設定
  consecutiveHighMemory: 0, // 連続して高メモリ使用を検出した回数
  maxConsecutiveHighMemory: 3, // 許容する連続検出回数

  getMemoryUsage() {
    const used = process.memoryUsage();
    return {
      heapUsed: used.heapUsed,
      heapTotal: used.heapTotal,
      heapUsedPercent: (used.heapUsed / used.heapTotal) * 100, // heapTotalとの比較に修正
      rss: used.rss
    };
  },

  async forceGC() {
    if (!global.gc) {
      console.warn('ガベージコレクションが利用できません');
      return;
    }

    try {
      const beforeMemory = this.getMemoryUsage();
      global.gc();
      await new Promise(resolve => setTimeout(resolve, 1000));
      const afterMemory = this.getMemoryUsage();
      
      console.log('GC実行結果:', {
        before: beforeMemory,
        after: afterMemory,
        freed: Math.round((beforeMemory.heapUsed - afterMemory.heapUsed) / 1024 / 1024) + 'MB'
      });
      
      this.lastGC = Date.now();
      return afterMemory.heapUsedPercent < beforeMemory.heapUsedPercent;
    } catch (error) {
      console.error('GC実行中にエラーが発生:', error);
      return false;
    }
  },

  async checkMemory() {
    const memUsage = this.getMemoryUsage();
    console.log('メモリ使用状況:', memUsage);
    logMemory(memUsage);

    if (memUsage.heapUsedPercent > this.criticalThreshold) {
      this.consecutiveHighMemory++;
      console.warn(`警告: 深刻なメモリ使用量を検出 (${memUsage.heapUsedPercent.toFixed(2)}%) - 連続検出: ${this.consecutiveHighMemory}回目`);
      
      const gcSuccess = await this.forceGC();
      if (!gcSuccess && this.consecutiveHighMemory >= this.maxConsecutiveHighMemory) {
        console.error('エラー: 継続的な高メモリ使用を検出。制御された再起動を開始します。');
        logError('Critical Memory Usage - Initiating Controlled Restart');
        await this.performControlledRestart();
      }
    } else if (memUsage.heapUsedPercent > this.warningThreshold) {
      console.warn(`警告: 高メモリ使用量を検出 (${memUsage.heapUsedPercent.toFixed(2)}%)`);
      if (Date.now() - this.lastGC > this.gcInterval) {
        await this.forceGC();
      }
    } else {
      this.consecutiveHighMemory = 0;
    }
  },

  async performControlledRestart() {
    try {
      console.log('制御された再起動を開始します...');
      
      // アクティブなリクエストの完了を待機
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // クリーンアップの実行
      await cleanup();
      
      // 新しいプロセスを起動
      const { spawn } = await import('child_process');
      const args = process.argv.slice(1);
      
      const newProcess = spawn(process.argv[0], args, {
        detached: true,
        stdio: 'inherit',
        env: { ...process.env, RESTARTED: '1' }
      });
      
      newProcess.unref();
      
      // 現在のプロセスを終了
      setTimeout(() => process.exit(0), 1000);
    } catch (error) {
      console.error('制御された再起動に失敗:', error);
      process.exit(1);
    }
  }
};

// Express アプリケーションの設定
const app = express();

// ミドルウェアの追加
app.use((req, res, next) => {
  resourceManagement.trackConnection(req, res);
  next();
});

// CORSの設定
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
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

// メモリ使用量の監視を強化
const monitorMemoryUsage = () => {
  const used = process.memoryUsage();
  const status = {
    heapUsed: `${Math.round(used.heapUsed / 1024 / 1024 * 100) / 100} MB`,
    heapTotal: `${Math.round(used.heapTotal / 1024 / 1024 * 100) / 100} MB`,
    rss: `${Math.round(used.rss / 1024 / 1024 * 100) / 100} MB`,
    external: `${Math.round(used.external / 1024 / 1024 * 100) / 100} MB`
  };
  
  console.log('Memory Usage:', status);
  
  // メモリ使用量が閾値を超えた場合は警告
  const heapUsedPercent = (used.heapUsed / used.heapTotal) * 100;
  if (heapUsedPercent > 80) {
    console.warn(`Warning: High memory usage detected: ${heapUsedPercent.toFixed(2)}%`);
    fs.appendFileSync('error.log', `${new Date().toISOString()} - High memory usage: ${heapUsedPercent.toFixed(2)}%\n`);
  }
};

// プロセス情報の記録
const logProcessInfo = () => {
  const processInfo = {
    pid: process.pid,
    ppid: process.ppid,
    platform: process.platform,
    version: process.version,
    uptime: process.uptime(),
    cwd: process.cwd(),
    execPath: process.execPath,
    memoryUsage: process.memoryUsage()
  };
  
  console.log('Process Information:', processInfo);
  logProcess(processInfo);
};

// 定期的なヘルスチェックの間隔を短縮
setInterval(() => {
  const status = getHealthStatus();
  console.log('Health Check:', status);
  monitorMemoryUsage();
  logProcessInfo();
}, 10000); // 10秒ごとにチェック

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

// サーバーを起動
const startServer = async () => {
  // Node.jsのGCを有効化
  try {
    const v8 = await import('v8');
    const totalHeapSize = v8.getHeapStatistics().total_available_size;
    console.log(`利用可能なヒープサイズ: ${Math.round(totalHeapSize / 1024 / 1024)}MB`);
  } catch (error) {
    console.warn('V8統計情報の取得に失敗しました:', error);
  }

  // サーバーの起動
  server = app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log('Environment variables:');
    console.log(`- OPENAI_API_KEY: ${apiKey ? '設定されています (' + apiKey.substring(0, 10) + '...)' : '設定されていません'}`);
  });

  // Keep-Alive接続のタイムアウト設定
  server.keepAliveTimeout = 65000;
  server.headersTimeout = 66000;
};

startServer(); 

// クリーンアップ処理の統合
const cleanup = async () => {
  console.log('クリーンアップ処理を開始...');
  
  try {
    // インターバルをクリア
    clearInterval(memoryCheckInterval);
    
    // リソース管理のクリーンアップ
    if (resourceManagement) {
      await resourceManagement.performCleanup();
    }
    
    // 最後のGC実行
    if (memoryManagement) {
      await memoryManagement.forceGC();
    }
    
    // サーバーの終了
    if (server) {
      await new Promise((resolve, reject) => {
        server.close((err) => {
          if (err) {
            console.error('サーバー終了中にエラーが発生:', err);
            reject(err);
          } else {
            console.log('サーバーを正常に終了しました');
            resolve();
          }
        });
      });
    }
    
    console.log('クリーンアップ処理が完了しました');
  } catch (error) {
    console.error('クリーンアップ中にエラーが発生:', error);
    throw error;
  }
};

// シグナルハンドリングの統一
['SIGTERM', 'SIGINT', 'SIGUSR2'].forEach((signal) => {
  process.on(signal, async () => {
    console.log(`${signal}を受信しました。グレースフルシャットダウンを開始します...`);
    await cleanup();
    process.exit(0);
  });
});

// エラーハンドリングの強化
process.on('uncaughtException', async (error) => {
  console.error('予期せぬエラーが発生しました:', error);
  logError(`Uncaught Exception: ${error.stack}`);
  await cleanup();
  process.exit(1);
});

process.on('unhandledRejection', async (reason, promise) => {
  console.error('未処理のPromise拒否:', reason);
  logError(`Unhandled Rejection: ${reason}`);
  await cleanup();
  process.exit(1);
});

// メモリ使用量の定期チェック
const memoryCheckInterval = setInterval(async () => {
  await memoryManagement.checkMemory();
}, 10000); 