#!/bin/bash

# エラーが発生したら即座に終了
set -e

# 関数: プロセスの終了
kill_process() {
    local port=$1
    local pid=$(lsof -ti :$port)
    if [ ! -z "$pid" ]; then
        echo "ポート $port のプロセス($pid)を終了します..."
        kill -15 $pid 2>/dev/null || true
        sleep 2
        kill -9 $pid 2>/dev/null || true
    fi
}

# 関数: サーバーの状態確認
check_server() {
    local port=$1
    local max_attempts=30
    local attempt=1

    while [ $attempt -le $max_attempts ]; do
        if curl -s http://localhost:$port/health >/dev/null; then
            return 0
        fi
        echo "サーバー(ポート:$port)の起動を待機中... 試行回数: $attempt/$max_attempts"
        sleep 1
        attempt=$((attempt + 1))
    done
    return 1
}

# 既存のプロセスを停止
echo "既存のプロセスを停止中..."
kill_process 3000
kill_process 5173

# 少し待機
sleep 2

# バックエンドサーバーを起動
echo "バックエンドサーバーを起動中..."
node server.js > server.log 2>&1 &
backend_pid=$!

# バックエンドサーバーの起動を待機
echo "バックエンドサーバーの起動を待機中..."
if check_server 3000; then
    echo "バックエンドサーバーが正常に起動しました"
else
    echo "バックエンドサーバーの起動に失敗しました"
    exit 1
fi

# フロントエンドサーバーを起動
echo "フロントエンドサーバーを起動中..."
npm run dev

# エラーハンドリング
trap 'kill_process 3000; kill_process 5173' EXIT 