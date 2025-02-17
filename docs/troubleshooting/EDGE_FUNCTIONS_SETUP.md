# Edge Functions セットアップのトラブルシューティング

## 発生した問題と解決方法

### 1. メモリ不足の問題
- **症状**: Edge Functions実行時に以下のエラーが発生
  ```bash
  error running container: exit 137
  ```
- **原因**: Dockerコンテナのメモリ制限
- **解決策**: `DOCKER_MEMORY=8g`を指定して実行
  ```bash
  DOCKER_MEMORY=8g supabase functions serve openai-test --env-file ./supabase/functions/openai-test/.env --no-verify-jwt --debug
  ```

### 2. 環境変数の読み込み問題
- **症状**: `OPENAI_API_KEY is not set`エラーが発生
- **原因**: Edge Functionsが`.env`ファイルを自動で読み込まない
- **解決策**: `--env-file`オプションで環境変数ファイルを明示的に指定
  ```bash
  supabase functions serve openai-test --env-file ./supabase/functions/openai-test/.env
  ```

### 3. APIリクエストフォーマットの問題
- **症状**: 
  1. `Unexpected end of JSON input`エラー
  2. `Invalid request format: messages array is required`エラー
- **解決策**: OpenAI Chat APIの仕様に合わせてリクエストフォーマットを修正
  ```json
  {
    "messages": [
      {
        "role": "user",
        "content": "Hello, how are you?"
      }
    ]
  }
  ```

## 動作確認方法

### 1. Edge Functions起動
```bash
DOCKER_MEMORY=8g supabase functions serve openai-test --env-file ./supabase/functions/openai-test/.env --no-verify-jwt --debug
```

### 2. エンドポイントテスト
```bash
curl -i -X POST \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Hello, how are you?"}]}' \
  http://127.0.0.1:54321/functions/v1/openai-test
```

## 正常動作の確認ポイント
1. Edge Functionsが起動している
2. 環境変数が正しく読み込まれている
3. OpenAI APIとの通信が機能している
4. エンドポイントが期待通りのレスポンスを返している

## 今後の注意点
1. Edge Functions起動時は必ず十分なメモリを割り当てる
2. 環境変数ファイルは明示的に指定する
3. APIリクエストは正しいフォーマットで送信する
4. エラーハンドリングの改善を検討する

## 関連ファイル
- `supabase/functions/openai-test/.env`: OpenAI APIキーの設定
- `package.json`: スクリプトコマンドの定義
- `docs/architecture/SYSTEM_ARCHITECTURE.md`: システム全体の構成

## 参考コマンド
### 開発サーバー起動
```bash
npm run dev
```
実行結果:
```
vite-react-typescript-starter@0.0.0 dev
> vite
  VITE v5.4.14  ready in 69 ms
  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

### Edge Functions起動
```bash
npm run functions:serve
``` 