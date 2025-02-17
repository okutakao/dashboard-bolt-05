# 開発ガイド

## プロジェクト概要
このプロジェクトは、AIを活用したブログ記事作成支援システムです。TypeScriptとReactを使用したモダンなWebアプリケーションで、以下の主要機能を提供します：

- ユーザー認証（Supabase Auth）
- ブログ記事の作成・編集・管理
- AIによる記事生成支援（OpenAI API使用）
- マークダウンエクスポート機能

## システム構成図
```
[フロントエンド]     [バックエンド]        [外部サービス]
React (Vite) -----> Express Server -----> OpenAI API
     |                    |
     |                    |
     +-------------------> Supabase
        (Auth & DB)
```

## 重要なファイル一覧

### プロジェクト管理
- `CHANGELOG.md`: プロジェクトの変更履歴
  - バージョン管理
  - 機能追加・改善の記録
  - セキュリティ対策の履歴

- `PROJECT_ANALYSIS.md`: プロジェクトの詳細分析
  - プロジェクト概要
  - 実装済み機能一覧
  - 技術スタックの説明
  - 今後の改善点

### 環境設定
- `.env`: 環境変数設定ファイル（必須の設定）
  ```env
  VITE_SUPABASE_URL=your-supabase-url
  VITE_SUPABASE_ANON_KEY=your-anon-key
  OPENAI_API_KEY=your-openai-key
  VITE_OPENAI_API_KEY=${OPENAI_API_KEY}
  NODE_ENV=development
  ```

- `API_TOKEN_GUIDE.md`: APIトークン管理ガイド
  - トークンの取得方法
  - 更新手順
  - セキュリティ対策

### 開発環境
- `package.json`: プロジェクトの依存関係
  - 主要パッケージ:
    - React 18.3.1
    - TypeScript 5.5.3
    - Vite 5.4.2
    - Tailwind CSS 3.4.1
    - Supabase Auth UI React 0.4.7

- `start-servers.sh`: サーバー起動スクリプト
  - バックエンド（ポート3000）
  - フロントエンド（ポート5173）
  - 環境チェックと自動再起動

### コアコンポーネント
- `src/App.tsx`: メインアプリケーション
  - ルーティングロジック
  - 認証状態管理
  - ダークモード対応

- `src/components/`: UIコンポーネント
  - `AuthForm.tsx`: 認証フォーム
    - ログイン/サインアップ
    - エラーハンドリング
  - `BlogPostForm.tsx`: ブログ投稿フォーム
    - AI支援機能統合
    - リアルタイムプレビュー
  - `BlogPostList.tsx`: 記事一覧
    - ドラッグ&ドロップ対応
    - フィルタリング機能

### バックエンド
- `server.js`: バックエンドサーバー
  - OpenAI API連携
    - チャット完了エンドポイント
    - タイトル生成
    - 記事構成生成
  - エラーハンドリング
  - レート制限

### データベース（Supabase）
- テーブル構造:
  ```sql
  blog_posts (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES auth.users,
    title TEXT,
    theme TEXT,
    tone TEXT,
    status TEXT,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
  )

  blog_sections (
    id UUID PRIMARY KEY,
    post_id UUID REFERENCES blog_posts,
    title TEXT,
    content TEXT,
    order INTEGER,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
  )
  ```

## 開発フロー

1. 環境設定
   - リポジトリのクローン
   ```bash
   git clone [repository-url]
   cd [project-directory]
   ```
   
   - 依存関係のインストール
   ```bash
   npm install
   ```
   
   - `.env`ファイルの設定
   ```bash
   cp .env.example .env
   # .envファイルを編集して必要な値を設定
   ```

2. 開発サーバーの起動
   ```bash
   ./start-servers.sh
   ```
   - バックエンド: http://localhost:3000
   - フロントエンド: http://localhost:5173

3. コード変更
   - 変更を実装
   - `npm run lint`でコード品質チェック
   - `CHANGELOG.md`の更新

4. コミット
   ```bash
   git add .
   git commit -m "feat/fix/docs: 変更の説明"
   ```

## デバッグ方法
1. フロントエンド
   - Reactデバッグツール
   - コンソールログ
   - 状態管理の確認

2. バックエンド
   - サーバーログの確認
   - APIレスポンスの監視
   - エラーハンドリングの検証

## 注意事項

### セキュリティ
- 環境変数は必ず`.env`ファイルで管理
- APIキーは`API_TOKEN_GUIDE.md`の手順に従って取得
- 機密情報は絶対にコミットしない

### 開発規約
- コミットメッセージは明確に記述
- 重要な変更は必ず`CHANGELOG.md`に記録
- コンポーネントの追加・変更は`PROJECT_ANALYSIS.md`に反映
- TypeScriptの型定義を適切に使用

### パフォーマンス
- 不要なレンダリングを避ける
- 大きな状態更新は最適化
- APIコールは適切にキャッシュ

## トラブルシューティング

### よくある問題と解決方法
1. サーバー起動エラー
   - ポートの競合確認
   - プロセス終了の確認
   - 環境変数の検証

2. API接続エラー
   - トークンの有効性確認
   - CORS設定の確認
   - ネットワーク接続の確認

3. ビルドエラー
   - 依存関係の更新
   - キャッシュのクリア
   - TypeScript型エラーの修正 