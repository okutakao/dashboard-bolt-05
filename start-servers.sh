#!/bin/bash

# エラーが発生したら即座に終了
set -e

# ログファイルの設定
LOG_FILE="server.log"

# ログ出力関数
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

# 既存のプロセスを終了
log "既存のプロセスを終了します..."
pkill -f "node|vite|npm" || true
sleep 2

# ログファイルの初期化
echo "" > "$LOG_FILE"
log "サーバー起動スクリプトを開始します..."

# バックエンドサーバーを起動
log "バックエンドサーバーを起動中..."
NODE_ENV=development node server.js >> "$LOG_FILE" 2>&1 &
sleep 3

# フロントエンドサーバーを起動
log "フロントエンドサーバーを起動中..."
npm run dev >> "$LOG_FILE" 2>&1 &
sleep 3

log "全てのサーバーが起動しました"
echo "フロントエンド: http://localhost:5173"
echo "バックエンド: http://localhost:3000"
echo "ログファイル: $LOG_FILE"

# スクリプトを終了させない
wait 