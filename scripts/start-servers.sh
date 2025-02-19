#!/bin/bash

# ログディレクトリの作成
mkdir -p logs

# 既存のプロセスを停止
pkill -f "node scripts/server.js" || true
sleep 1

# サーバー起動（環境変数を設定）
NODE_ENV=development \
NODE_OPTIONS="--max-old-space-size=512 --expose-gc" \
node scripts/server.js > logs/server.log 2>&1 &

# フロントエンド起動
npm run dev 