# 画像正本における blob_key の将来設計

## 目的

現在は `image_url`（表示用 URL）から Blob の key をクエリパラムで取り出し、Blob 削除に利用している。  
将来、URL 形式が変わる（CDN・署名付き URL・パス変更など）場合でも、「画像の表示 URL」と「Blob の実体識別子」を分離して安全に扱えるようにするための設計メモである。

**今回の扱い**: 本実装は行わず、方針と影響範囲を docs に明文化する。

---

## A. 将来的に持ちたいカラム案

**テーブル**: `chiplog_chip_images`（Turso）

| カラム | 型 | 説明 |
|--------|-----|------|
| chip_id | TEXT | PK。チップ一意識別子。 |
| image_url | TEXT | 表示用 URL（CDN/署名URL に変更可能）。null = 画像なし。 |
| blob_key | TEXT | Blob 実体の識別子（Netlify Blobs の key）。null 許容。将来追加。 |
| updated_at | TEXT | 最終更新日時。 |

- **image_url**: 配信・表示用。形式変更してもフロントの表示ロジックだけ変えればよい。
- **blob_key**: 削除・cleanup 用。形式は `chips/<chip_id>/<suffix>` を維持する想定。URL に依存しない。
- 既存データは `blob_key = NULL` のまま運用し、新規保存時のみ `blob_key` を埋める移行が可能。

---

## B. 現在の実装と影響範囲

### 現在のテーブル定義

- `netlify/functions/init-chiplog-db.ts`: `chip_id`, `image_url`, `updated_at` のみ。

### 影響を受けるファイル（blob_key 導入時）

| ファイル | 役割 | 変更内容 |
|----------|------|----------|
| init-chiplog-db.ts | スキーマ | `blob_key TEXT` を追加（ALTER または新規環境のみ）。 |
| upload-chip-image.ts | アップロード | Blob 保存後に `key` を Turso に保存。INSERT/UPDATE に `blob_key` を追加。 |
| upsert-chip-image-url.ts | URL 更新 | image_url に加え blob_key を受け取り保存。削除時は blob_key = null。 |
| get-chip-image-url.ts | 1件取得 | レスポンスに `blob_key` を含めるかはオプション。削除時は key が必要なら blob_key を返す。 |
| list-chip-image-urls.ts | 一覧取得 | 必要なら `blob_key` を返す（cleanup 用）。表示には image_url のみ使う。 |
| delete-chip-image-blob.ts | Blob 削除 | 現状は body の `key` をそのまま使用。将来は「blob_key があればそれを使い、無ければ image_url から key を取り出す」などのフォールバックが可能。 |
| src/lib/cloudChipImageUrlClient.ts | 型・map | ChipImageUrlItem に `blob_key?: string \| null` を追加するか。map は image_url ベースのままでも可。 |
| src/lib/cloudImageClient.ts | 削除 | getBlobKeyFromImageUrl は blob_key があればそれを使い、無い場合のフォールバックとして残す。 |
| ChipDetail / SelectChip | UI | 表示は image_url のみ使用。blob_key は削除・API 層で利用するため、現状は変更不要。 |

---

## C. 今回実装を見送る理由

1. **スキーマ変更が伴う**: 既存 Turso への ALTER または新規デプロイでのマイグレーションが必要。
2. **全 Function と client の型・入出力が変わる**: upload / upsert / get / list のリクエスト・レスポンスに blob_key を載せる必要があり、影響範囲が広い。
3. **現状でも運用可能**: image_url から key を取り出す方式で、明示削除時の Blob 削除は実装済み。URL 形式を変えない限り問題にならない。
4. **「将来を安全にする整理」が目的**: 今回は設計の方向性と影響範囲を残し、実際のカラム追加は URL 形式変更や cleanup 実装と合わせて行うのがよい。

---

## D. 将来実装する際の手順案

1. **Turso**: `chiplog_chip_images` に `blob_key TEXT` を追加（NULL 許容）。既存行は NULL のまま。
2. **upload-chip-image**: Blob 保存後の `key` を、image_url とともに Turso に保存（blob_key に key を入れる）。
3. **upsert-chip-image-url**: image_url を null にするときは blob_key も null に。呼び出し側で blob_key を渡せるようにする。
4. **get-chip-image-url / list-chip-image-urls**: レスポンスに `blob_key` を含める（オプション）。フロントは表示に image_url のみ使用。
5. **Blob 削除**: フロントは「blob_key があればそれを delete に渡し、無ければ getBlobKeyFromImageUrl(image_url) で key を求める」とする。後方互換を保てる。
6. **client 型**: ChipImageUrlItem に `blob_key?: string | null` を追加。chipImageUrlItemsToMap は従来どおり image_url ベースで Map を組み、blob_key は削除時のみ参照するなど、最小限の変更に留める。

---

## E. まとめ

- **いま**: blob_key は持たず、image_url から key を取り出す現行方式のまま運用する。
- **方針**: 将来は「image_url + blob_key を正本で持つ」形にし、表示は image_url、削除・cleanup は blob_key を優先する。
- **影響**: 上記 B のファイル群。既存の三値 state・表示ロジック・エラー表示は変えず、API と型の拡張で対応する。
