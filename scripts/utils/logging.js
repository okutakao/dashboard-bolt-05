import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ログディレクトリの設定
const LOG_DIR = path.join(process.cwd(), 'logs');
const ERROR_LOG_PATH = path.join(LOG_DIR, 'error.log');
const MEMORY_LOG_PATH = path.join(LOG_DIR, 'memory.log');
const PROCESS_LOG_PATH = path.join(LOG_DIR, 'process.log');

// ログディレクトリの作成
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// ログローテーション
const rotateLog = (logPath) => {
  try {
    const stats = fs.statSync(logPath);
    const fileSizeInMB = stats.size / (1024 * 1024);
    if (fileSizeInMB > 10) { // 10MB以上でローテーション
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const newPath = `${logPath}.${timestamp}`;
      fs.renameSync(logPath, newPath);
      fs.writeFileSync(logPath, ''); // 新しいログファイルを作成
    }
  } catch (error) {
    console.error(`ログローテーション中にエラーが発生: ${error.message}`);
  }
};

// エラーログを記録する関数
export const logError = (message, error = null) => {
  try {
    rotateLog(ERROR_LOG_PATH);
    const timestamp = new Date().toISOString();
    const logMessage = `${timestamp} - ${message}${error ? '\n' + error.stack : ''}\n`;
    fs.appendFileSync(ERROR_LOG_PATH, logMessage);
  } catch (err) {
    console.error('ログの書き込みに失敗:', err);
  }
};

// メモリログを記録する関数
export const logMemory = (memoryInfo) => {
  try {
    rotateLog(MEMORY_LOG_PATH);
    const timestamp = new Date().toISOString();
    const formattedMemory = {
      ...memoryInfo,
      heapUsed: Math.round(memoryInfo.heapUsed / 1024 / 1024 * 100) / 100 + 'MB',
      heapTotal: Math.round(memoryInfo.heapTotal / 1024 / 1024 * 100) / 100 + 'MB',
      rss: Math.round(memoryInfo.rss / 1024 / 1024 * 100) / 100 + 'MB'
    };
    fs.appendFileSync(MEMORY_LOG_PATH, `${timestamp} - ${JSON.stringify(formattedMemory)}\n`);
  } catch (err) {
    console.error('メモリログの書き込みに失敗:', err);
  }
};

// プロセス情報を記録する関数
export const logProcess = (processInfo) => {
  try {
    rotateLog(PROCESS_LOG_PATH);
    const timestamp = new Date().toISOString();
    fs.appendFileSync(PROCESS_LOG_PATH, `${timestamp} - ${JSON.stringify(processInfo)}\n`);
  } catch (err) {
    console.error('プロセスログの書き込みに失敗:', err);
  }
}; 