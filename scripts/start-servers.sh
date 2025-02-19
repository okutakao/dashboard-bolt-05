#!/bin/bash

# ログディレクトリの作成
mkdir -p logs

# ポートが使用中かどうかをチェックする関数
check_port() {
  local port=$1
  if lsof -i ":$port" > /dev/null; then
    echo "警告: ポート $port は既に使用されています"
    local pid=$(lsof -t -i ":$port")
    if [ ! -z "$pid" ]; then
      echo "ポート $port を使用しているプロセス(PID: $pid)を強制終了します..."
      kill -9 $pid
      sleep 2
    fi
  fi
}

# 既存のプロセスをクリーンアップ
cleanup_processes() {
  echo "$(date): 既存のプロセスをクリーンアップします..."
  pkill -f "node scripts/server.js" || true
  pkill -f "vite" || true
  rm -f .backend.pid
  check_port 3000
  check_port 5173
  sleep 2
}

# フロントエンド起動関数
start_frontend() {
  echo "$(date): フロントエンドサーバーを起動します..."
  npm run dev &
  local frontend_pid=$!
  echo $frontend_pid > .frontend.pid
  
  # フロントエンドサーバーの起動を待機
  local max_attempts=30
  local attempt=0
  while ! lsof -i :5173 > /dev/null && [ $attempt -lt $max_attempts ]; do
    sleep 1
    attempt=$((attempt + 1))
    echo "フロントエンド起動待機中... ($attempt/$max_attempts)"
  done

  if ! lsof -i :5173 > /dev/null; then
    echo "エラー: フロントエンドサーバーの起動に失敗しました"
    return 1
  fi

  echo "フロントエンドサーバーが起動しました (PID: $frontend_pid)"
  return 0
}

# バックエンド起動関数
start_backend() {
  echo "$(date): バックエンドサーバーを起動します..."
  
  # 環境変数の設定
  export NODE_ENV=development
  export NODE_OPTIONS="--max-old-space-size=512 --expose-gc"
  
  # サーバー起動
  node scripts/server.js >> logs/server.log 2>&1 &
  
  # PIDファイルが作成されるまで待機
  local max_attempts=30
  local attempt=0
  while [ ! -f .backend.pid ] && [ $attempt -lt $max_attempts ]; do
    sleep 1
    attempt=$((attempt + 1))
    echo "バックエンドPIDファイル作成待機中... ($attempt/$max_attempts)"
  done

  if [ ! -f .backend.pid ]; then
    echo "エラー: バックエンドPIDファイルが作成されませんでした"
    return 1
  fi

  local PID=$(cat .backend.pid)
  if ! ps -p $PID > /dev/null; then
    echo "エラー: バックエンドプロセスの起動に失敗しました"
    rm -f .backend.pid
    return 1
  fi

  echo "バックエンドサーバーが起動しました (PID: $PID)"
  return 0
}

# サーバー監視関数
monitor_servers() {
  local backend_failures=0
  local frontend_failures=0
  local max_failures=3

  while true; do
    # バックエンドの監視
    if [ -f .backend.pid ]; then
      local backend_pid=$(cat .backend.pid)
      if ! ps -p $backend_pid > /dev/null || ! curl -s http://localhost:3000/health > /dev/null; then
        backend_failures=$((backend_failures + 1))
        echo "$(date): バックエンドがダウンしています（試行 $backend_failures/$max_failures）"
        
        if [ $backend_failures -ge $max_failures ]; then
          echo "$(date): バックエンドの最大再試行回数を超えました"
          cleanup_processes
          exit 1
        fi
        
        start_backend
      else
        backend_failures=0
      fi
    fi

    # フロントエンドの監視
    if [ -f .frontend.pid ]; then
      local frontend_pid=$(cat .frontend.pid)
      if ! ps -p $frontend_pid > /dev/null || ! lsof -i :5173 > /dev/null; then
        frontend_failures=$((frontend_failures + 1))
        echo "$(date): フロントエンドがダウンしています（試行 $frontend_failures/$max_failures）"
        
        if [ $frontend_failures -ge $max_failures ]; then
          echo "$(date): フロントエンドの最大再試行回数を超えました"
          cleanup_processes
          exit 1
        fi
        
        start_frontend
      else
        frontend_failures=0
      fi
    fi

    sleep 10
  done
}

# メイン処理
echo "$(date): サーバー起動プロセスを開始します..."

# 既存のプロセスをクリーンアップ
cleanup_processes

# バックエンドサーバーを起動
if ! start_backend; then
  echo "$(date): バックエンド初期起動に失敗しました"
  cleanup_processes
  exit 1
fi

# フロントエンドサーバーを起動
if ! start_frontend; then
  echo "$(date): フロントエンド初期起動に失敗しました"
  cleanup_processes
  exit 1
fi

# 監視を開始
monitor_servers 