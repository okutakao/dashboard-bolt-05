# OpenAI API 連携トラブルシューティング記録

## 発生した問題

1. APIリクエストヘッダーの不正な文字エラー
2. サーバー接続の問題
3. フロントエンドへのアクセス拒否

## 原因と解決策

### 1. APIリクエストヘッダーの問題

#### 原因
- APIキーに不正な文字や空白が含まれていた
- Authorization ヘッダーの設定が適切でなかった

#### 解決策
```javascript
// server.jsの修正
const apiKey = process.env.OPENAI_API_KEY?.replace(/[^\x20-\x7E]/g, '').trim();

// APIキーの検証を追加
if (!apiKey.startsWith('sk-')) {
  throw new Error('APIキーの形式が正しくありません');
}

// ヘッダーの設定を最適化
headers: {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${cleanApiKey}`
}
```

### 2. サーバー接続の問題

#### 原因
- バックエンドサーバー（Express）とフロントエンドサーバー（Vite）の両方が必要
- プロセス管理が適切でなかった

#### 解決策
1. バックエンドサーバーの起動確認
   ```bash
   node server.js  # ポート3000で起動
   ```

2. フロントエンドサーバーの起動確認
   ```bash
   npm run dev     # ポート5173で起動
   ```

### 3. フロントエンドアクセスの問題

#### 原因
- Viteの開発サーバーがローカルホストのみに制限されていた
- ネットワークアクセスが許可されていなかった

#### 解決策
`vite.config.ts`の設定を修正：
```typescript
export default defineConfig({
  // ...
  server: {
    host: true,      // すべてのネットワークアクセスを許可
    port: 5173,
    strictPort: true,
  }
});
```

## 最終的な動作確認

1. バックエンドサーバー（Express）: http://localhost:3000
   - OpenAI APIとの通信を担当
   - APIキーの適切な処理と検証を実装

2. フロントエンドサーバー（Vite）: http://localhost:5173
   - ユーザーインターフェースの提供
   - バックエンドとの適切な通信

## 教訓

1. APIキーの処理
   - 不正な文字の除去
   - 適切な形式の検証
   - セキュアな環境変数の管理

2. サーバー構成
   - フロントエンドとバックエンドの役割の明確化
   - 適切なCORS設定
   - プロセス管理の重要性

3. 開発環境の設定
   - 適切なネットワークアクセス設定
   - ポート管理
   - エラーハンドリングの重要性 