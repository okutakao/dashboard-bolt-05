# サーバー起動ガイド

## 前提条件
- Node.js v18.0.0以上（推奨: v20.x.x）
- npm v8.0.0以上（推奨: v10.x.x）
- Docker Desktop v4.0.0以上
  - Mac: Docker Desktop for Mac
  - Windows: Docker Desktop for Windows
  - Linux: Docker Engine

## 環境構築（初回のみ）

1. プロジェクトのクローン後、依存関係をインストール：
```bash
npm install
```

2. 環境変数の設定：
- `.env`ファイルが存在することを確認
- 以下の環境変数が正しく設定されていることを確認：
  ```
  VITE_SUPABASE_URL=http://127.0.0.1:54321
  VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
  VITE_APP_URL=http://localhost:5173
  VITE_SUPABASE_FUNCTIONS_URL=http://localhost:54321/functions/v1
  OPENAI_API_KEY=your_openai_api_key
  ```

3. Dockerの起動確認：
- Mac/Windows: Docker Desktopが起動していることを確認
- Linux: Docker Engineが起動していることを確認
  ```bash
  docker info  # Dockerの状態確認
  ```

## サーバーの起動手順

### 1. 既存のプロセスの停止
まず、既存のプロセスが実行中の場合は、それらを停止します：
```bash
npm run supabase:stop && pkill -f vite && pkill -f "node scripts/server.js" || true
```

### 2. 一括起動（推奨）
すべてのサーバーを一度に起動する場合：
```bash
npm run start-all
```

このコマンドは以下の処理を順番に実行します：
1. 既存のプロセスの停止
2. Supabaseの起動
3. バックエンドサーバーの起動
4. フロントエンドサーバーの起動

### 3. 個別起動（必要な場合）
個別に起動する必要がある場合は、以下の順序で実行：

1. Supabaseの起動：
```bash
npm run supabase:start
```

2. バックエンドサーバーの起動：
```bash
node scripts/server.js > server.log 2>&1 &
```

3. フロントエンドサーバーの起動：
```bash
npm run dev
```

## 動作確認

1. Supabase：
   - 管理画面: http://127.0.0.1:54323
   - API: http://127.0.0.1:54321
   - 正常性確認: curl http://127.0.0.1:54321/health

2. バックエンドサーバー：
   - URL: http://localhost:3000
   - 正常性確認: curl http://localhost:3000/health

3. フロントエンドサーバー：
   - URL: http://localhost:5173
   - 正常性確認: ブラウザでアクセス

## プロセス管理

### プロセスの確認
```bash
# 実行中のNode.jsプロセスの確認
ps aux | grep node

# 実行中のViteプロセスの確認
ps aux | grep vite

# Dockerコンテナの確認
docker ps
```

### ログの監視
```bash
# バックエンドサーバーのログ
tail -f server.log

# フロントエンドサーバーのログ
tail -f dev.log

# Supabaseのログ
docker logs -f supabase_db_1
docker logs -f supabase_api_1
```

## トラブルシューティング

### 1. ポートが既に使用されている場合
以下のコマンドで該当のポートを使用しているプロセスを終了：
```bash
# Supabase (54321)
lsof -ti :54321 | xargs kill -9

# バックエンドサーバー (3000)
lsof -ti :3000 | xargs kill -9

# フロントエンドサーバー (5173)
lsof -ti :5173 | xargs kill -9
```

### 2. Dockerの問題
Dockerが正常に動作していない場合：

#### Mac/Windows
- Docker Desktopを再起動
- メモリ割り当ての確認（推奨: 8GB以上）

#### Linux
```bash
# Dockerの再起動
sudo service docker restart
# または
sudo systemctl restart docker
```

### 3. ネットワークの問題
```bash
# ポートの利用状況確認
netstat -an | grep LISTEN

# DNSの確認
ping 127.0.0.1
```

### 4. メモリ不足の問題
```bash
# メモリ使用状況の確認
free -h  # Linux
vm_stat  # Mac
```

## サーバーの停止手順

1. すべてのサーバーを停止：
```bash
npm run supabase:stop && pkill -f vite && pkill -f "node scripts/server.js" || true
```

2. 正常に停止されたことの確認：
```bash
lsof -i :54321  # Supabase
lsof -i :3000   # バックエンドサーバー
lsof -i :5173   # フロントエンドサーバー
```

3. Dockerコンテナの確認：
```bash
docker ps  # 実行中のコンテナ確認
docker ps -a  # 停止したコンテナも含めて確認
```

## 注意事項
- サーバーの起動は必ず上記の順序で行う
- 環境変数の設定は必ず確認する
- Dockerが起動していることを確認する
- メモリ使用量に注意する（8GB以上を推奨）
- 各サービスの起動完了を確認してから次のステップに進む
- ログは定期的に確認する
- 開発中は`server.log`と`dev.log`を監視することを推奨

## トラブル発生時のチェックリスト
1. Dockerの状態確認
2. ポートの使用状況確認
3. ログファイルの確認
4. メモリ使用量の確認
5. 環境変数の設定確認
6. ネットワーク接続の確認 