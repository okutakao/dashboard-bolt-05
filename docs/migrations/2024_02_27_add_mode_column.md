# データベースマイグレーション履歴

## 2024-02-27: blog_postsテーブルにmodeカラムを追加

### 変更内容
- `blog_posts`テーブルに`mode`カラムを追加
  - データ型: VARCHAR(10)
  - デフォルト値: 'simple'
  - NOT NULL制約あり

### 実行したSQL
```sql
ALTER TABLE blog_posts
ADD COLUMN mode VARCHAR(10) DEFAULT 'simple' NOT NULL;

-- 既存のレコードに対してデフォルト値を設定
UPDATE blog_posts SET mode = 'simple' WHERE mode IS NULL;
```

### 変更理由
- ブログ投稿の作成モードを管理するため
- 'simple'モードと'context'モードの2種類をサポート
- TypeScriptの型定義との整合性を確保

### 影響範囲
- 新規ブログ投稿の作成機能
- 既存の投稿は全て'simple'モードとして設定

### 確認項目
- [x] 新規投稿の作成が正常に動作
- [x] 既存の投稿の表示が正常
- [x] TypeScriptの型エラーが解消 