#!/bin/bash

# 既存のサーバープロセスを停止
echo "既存のプロセスを停止中..."
pkill -f "node server.js"
pkill -f "vite"

# 少し待機して確実にプロセスが終了するのを待つ
sleep 2

# バックエンドサーバーをバックグラウンドで起動
echo "バックエンドサーバーを起動中..."
npm run server &

# 少し待機してバックエンドサーバーの起動を確認
sleep 2

# フロントエンドサーバーを起動
echo "フロントエンドサーバーを起動中..."
npm run dev 