# プロジェクト構造分析

## プロジェクト概要
このプロジェクトは、React + TypeScript + Viteを使用したモダンなWebアプリケーションです。Supabaseをバックエンドとして利用し、ブログ投稿機能を中心とした機能を提供しています。

## 技術スタック
- フロントエンド: React + TypeScript
- ビルドツール: Vite
- スタイリング: Tailwind CSS
- バックエンド: Supabase
- その他: ESLint, PostCSS

## ディレクトリ構造

### ルートディレクトリ
```
├── src/                  # ソースコード
├── docs/                 # ドキュメント
├── supabase/            # Supabase関連ファイル
├── config/              # 設定ファイル
├── node_modules/        # 依存パッケージ
└── public/              # 静的ファイル
```

### src ディレクトリ
```
src/
├── components/          # Reactコンポーネント
├── contexts/           # Reactコンテキスト
├── hooks/              # カスタムフック
├── lib/                # ユーティリティ関数
├── App.tsx             # メインアプリケーション
├── main.tsx           # エントリーポイント
├── types.ts           # 型定義
└── supabase.ts        # Supabase設定
```

### 主要コンポーネント
- `BlogPostDetail.tsx`: ブログ投稿の詳細表示
- `BlogPostForm.tsx`: ブログ投稿フォーム
- `BlogPostList.tsx`: ブログ投稿一覧
- `BlogPostStatusToggle.tsx`: 投稿ステータス切り替え
- `BlogPostPreview.tsx`: ブログプレビュー
- `BlogContent.tsx`: ブログコンテンツ表示
- `BlogOutline.tsx`: ブログ概要
- `AuthForm.tsx`: 認証フォーム

## 設定ファイル
- `package.json`: プロジェクト依存関係
- `tsconfig.json`: TypeScript設定
- `vite.config.ts`: Vite設定
- `tailwind.config.js`: Tailwind CSS設定
- `eslint.config.js`: ESLint設定

## 認証・セキュリティ
- `.env`: 環境変数
- `API_TOKEN_GUIDE.md`: APIトークンガイド
- `AuthContext.tsx`: 認証状態管理

## 特徴的な機能
1. ブログ投稿管理システム
   - 投稿作成・編集
   - プレビュー機能
   - ステータス管理
   - アウトライン表示

2. ユーザー認証システム
   - Supabase認証統合
   - セッション管理

3. テーマ切り替え機能
   - ダークモード対応
   - カスタムテーマ設定

4. レスポンシブデザイン
   - Tailwind CSSによるモバイルフレンドリーUI

## 開発環境
- Node.js
- npm/yarn
- TypeScript
- Vite開発サーバー

## データベース構造
Supabaseを使用し、以下のテーブルが実装されています：
- ブログ投稿
- ユーザー情報
- メタデータ

## デプロイメント
- 開発環境: `npm run dev`
- ビルド: `npm run build`
- プロダクション: `npm run serve` 