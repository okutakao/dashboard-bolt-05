# 新規コンポーザー向け開発指示ガイド

## 👋 はじめに

このガイドは、AIブログ記事作成支援システムの新規コンポーザー向けの開発指示をまとめたものです。
開発を始める前に、このガイドを必ずお読みください。

## 📚 参照すべきドキュメント

開発を始める前に、以下のドキュメントを必ず順番に確認してください：

1. [`DEVELOPMENT_GUIDE.md`](./DEVELOPMENT_GUIDE.md)
   - プロジェクトの全体像
   - 開発環境のセットアップ手順
   - コーディング規約
   - トラブルシューティング

2. [`ai_prompting_guide.md`](./ai_prompting_guide.md)
   - AIへの指示方法
   - プロンプトの設計方法
   - 出力形式の指定方法

3. [`COMPREHENSIVE_GUIDE.md`](./COMPREHENSIVE_GUIDE.md)
   - 技術仕様の詳細
   - エラーハンドリング戦略
   - パフォーマンス最適化方針

## 🔧 実装時の重要ポイント

### 1. エラーハンドリング
- タイムアウト処理（30秒）を適切に実装
- メモリ使用量の監視（閾値: 80%）
- グレースフルシャットダウンの実装
- エラーログの適切な記録

### 2. パフォーマンス最適化
- 不要なレンダリングの防止
- APIコールの最適化
- メモリリークの防止
- 適切なキャッシュ戦略の実装

### 3. セキュリティ対策
- 環境変数の適切な管理
- APIキーの安全な取り扱い
- ユーザー認証の適切な実装
- XSS/CSRF対策の実装

## 💻 コーディング規約

### 1. 基本方針
- TypeScriptの型定義を適切に使用
- コンポーネントの適切な分割
- 再利用可能なコードの作成
- コメントの適切な記述

### 2. ファイル構成
```typescript
src/
  ├── components/     // UIコンポーネント
  ├── contexts/       // Reactコンテキスト
  ├── hooks/          // カスタムフック
  ├── lib/           // ユーティリティ関数
  └── types/         // 型定義
```

### 3. コミットメッセージ
```
feat: 新機能の追加
fix: バグ修正
docs: ドキュメントの更新
style: コードスタイルの修正
refactor: リファクタリング
```

## 🚀 実装の流れ

1. 環境構築
   ```bash
   npm install
   cp .env.example .env
   ```

2. 開発サーバーの起動
   ```bash
   ./start-servers.sh
   ```

3. 実装とテスト
   - コードの実装
   - ユニットテストの作成
   - E2Eテストの実行

4. レビュー前チェック
   - リンター実行: `npm run lint`
   - 型チェック: `npm run type-check`
   - テスト実行: `npm run test`

## ⚠️ 注意事項

1. **セキュリティ**
   - 環境変数は`.env`で管理
   - APIキーは絶対にコミットしない
   - 機密情報の取り扱いに注意

2. **パフォーマンス**
   - 大きな状態更新は最適化
   - 不要なレンダリングを防止
   - APIコールは適切にキャッシュ

3. **品質管理**
   - コードレビューは必須
   - テストカバレッジの維持
   - ドキュメントの更新

## 🔍 レビュー基準

1. **機能要件**
   - 仕様通りの動作
   - エラーハンドリングの適切さ
   - パフォーマンスの確保

2. **非機能要件**
   - コードの可読性
   - 保守性の確保
   - セキュリティ対策

3. **ドキュメント**
   - コメントの適切さ
   - README/CHANGELOGの更新
   - APIドキュメントの更新

## 📞 サポート

問題が発生した場合は、以下を確認してください：

1. [`DEVELOPMENT_GUIDE.md`](./DEVELOPMENT_GUIDE.md)のトラブルシューティングセクション
2. プロジェクトのイシュートラッカー
3. 開発チームへの問い合わせ

## 🎯 成功の指標

1. **コード品質**
   - リンターエラーなし
   - テストカバレッジ80%以上
   - 型エラーなし

2. **パフォーマンス**
   - レスポンスタイム200ms以内
   - メモリ使用率80%以下
   - エラー発生率1%以下

3. **ユーザー体験**
   - UI/UXの一貫性
   - 適切なエラーメッセージ
   - スムーズな操作感 