#!/bin/bash

# 既存のプロセスを停止
echo "既存のプロセスを停止中..."
pkill -f "node server.js"
pkill -f "vite"

# 少し待機して確実にプロセスが終了するのを待つ
sleep 2

# バックエンドサーバーをバックグラウンドで起動し、ログを記録
echo "バックエンドサーバーを起動中..."
node server.js > server.log 2>&1 &

# バックエンドサーバーの起動を待機
echo "バックエンドサーバーの起動を待機中..."
sleep 5

# バックエンドサーバーの起動確認
if ! curl -s http://localhost:3000/health > /dev/null; then
    echo "バックエンドサーバーの起動に失敗しました。ログを確認してください。"
    exit 1
fi

echo "バックエンドサーバーが正常に起動しました"

# フロントエンドサーバーを起動
echo "フロントエンドサーバーを起動中..."
npm run dev 