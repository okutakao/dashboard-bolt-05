# サーバー起動ガイド

## 前提条件
- Node.js v18.0.0以上（推奨: v20.x.x）
- npm v8.0.0以上（推奨: v10.x.x）

## 環境構築（初回のみ）

1. プロジェクトのクローン後、依存関係をインストール：
```bash
npm install
```

2. 環境変数の設定：
- `.env`ファイルが存在することを確認
- 以下の環境変数が正しく設定されていることを確認：
  ```
  VITE_SUPABASE_URL=https://[YOUR-PROJECT-ID].supabase.co
  VITE_SUPABASE_ANON_KEY=[YOUR-ANON-KEY]
  VITE_APP_URL=http://localhost:5173
  VITE_SUPABASE_FUNCTIONS_URL=https://[YOUR-PROJECT-ID].supabase.co/functions/v1
  OPENAI_API_KEY=[YOUR-OPENAI-API-KEY]
  ```

## サーバーの起動手順

### 1. 既存のプロセスの停止
まず、既存のプロセスが実行中の場合は、それらを停止します：
```bash
pkill -f vite && pkill -f "node scripts/server.js" || true
```

### 2. 一括起動（推奨）
すべてのサーバーを一度に起動する場合：
```bash
npm run start-all
```

このコマンドは以下の処理を順番に実行します：
1. 既存のプロセスの停止
2. バックエンドサーバーの起動
3. フロントエンドサーバーの起動

### 3. 個別起動（必要な場合）
個別に起動する必要がある場合は、以下の順序で実行：

1. バックエンドサーバーの起動：
```bash
node scripts/server.js > logs/server.log 2>&1 &
```

2. フロントエンドサーバーの起動：
```bash
npm run dev
```

## 動作確認

1. バックエンドサーバー：
   - URL: http://localhost:3000
   - 正常性確認: curl http://localhost:3000/health

2. フロントエンドサーバー：
   - URL: http://localhost:5173
   - 正常性確認: ブラウザでアクセス

## プロセス管理

### プロセスの確認
```bash
# 実行中のNode.jsプロセスの確認
ps aux | grep node

# 実行中のViteプロセスの確認
ps aux | grep vite
```

### ログの監視
```bash
# バックエンドサーバーのログ
tail -f logs/server.log

# フロントエンドサーバーのログ
tail -f dev.log
```

## トラブルシューティング

### 1. ポートが既に使用されている場合
以下のコマンドで該当のポートを使用しているプロセスを終了：
```bash
# バックエンドサーバー (3000)
lsof -ti :3000 | xargs kill -9

# フロントエンドサーバー (5173)
lsof -ti :5173 | xargs kill -9
```

### 2. ネットワークの問題
```bash
# ポートの利用状況確認
netstat -an | grep LISTEN

# DNSの確認
ping 127.0.0.1
```

### 3. メモリ不足の問題
```bash
# メモリ使用状況の確認
free -h  # Linux
vm_stat  # Mac
```

## サーバーの停止手順

1. すべてのサーバーを停止：
```bash
pkill -f vite && pkill -f "node scripts/server.js" || true
```

2. 正常に停止されたことの確認：
```bash
lsof -i :3000   # バックエンドサーバー
lsof -i :5173   # フロントエンドサーバー
```

## 注意事項
- サーバーの起動は必ず上記の順序で行う
- 環境変数の設定は必ず確認する
- メモリ使用量に注意する（8GB以上を推奨）
- 各サービスの起動完了を確認してから次のステップに進む
- ログは定期的に確認する
- 開発中は`server.log`と`dev.log`を監視することを推奨

## トラブル発生時のチェックリスト
1. ポートの使用状況確認
2. ログファイルの確認
3. メモリ使用量の確認
4. 環境変数の設定確認
5. ネットワーク接続の確認 