# Blob ストレージの扱い仕様（画像差し替え・明示削除・orphan）

画像の表示用 URL と実体は Turso（chiplog_chip_images）と Netlify Blobs で管理している。  
差し替え時・明示削除時・orphan の扱いを仕様として固定し、将来の事故を防ぐ。

---

## 1. 画像差し替え時（新画像で上書きする場合）

### 基本方針

- **差し替え時は旧 Blob を即削除しない。**
- 新画像の「Blob 保存 → Turso 更新（image_url / 将来は blob_key）→ Dexie 更新 → UI 反映」を優先する。
- 旧 Blob は **orphan**（どの行からも参照されない Blob）として一時的に残ることを許容する。
- 旧 Blob の削除は、将来の **orphan cleanup** の対象とする（本仕様では実装しない）。

### 理由

- 差し替えフロー中に旧 Blob 削除を入れると、失敗時の扱い（Turso は新 URL、Blob は旧のみ削除済みなど）が複雑になる。
- 新画像の保存・参照更新の成功を最優先し、ストレージの後片付けは別タスクに分離する。

### 現在の実装との整合

- `upload-chip-image` は新 key（`chips/<chipId>/<Date.now()>.ext`）で Blob を保存し、Turso を新 image_url で上書きするだけ。旧 Blob の削除は呼ばない。
- 本仕様どおりであり、変更不要。

---

## 2. 明示削除時（ユーザーが「写真を削除」を押した場合）

### 基本方針

- **参照解除を先に完了させ、その後に Blob 物理削除を試みる。**
  - Turso: 当該 chip_id の image_url（と将来の blob_key）を null にする。
  - Dexie: 当該チップの imageUrl を null にする。
  - UI: no-image 表示にする。
- 上記のあと、削除対象の Blob key が分かれば `delete-chip-image-blob` を呼ぶ。
- **Blob 削除が失敗しても、UI や DB は巻き戻さない。** 参照解除は成功したものとして扱う。
- Blob 削除失敗時は、当該 Blob は orphan として残ることを許容し、console にログを出すのみとする。

### 現在の実装との整合

- ChipDetail の `handleImageDelete`: `upsertChipImageUrl(chip.id, null)` → `upsertChip(..., imageUrl: null)` → `setCloudImageUrl(null)` のあと、`getBlobKeyFromImageUrl(旧 url)` で key を取り、`deleteChipImageBlob(key)` を fire-and-forget で呼んでいる。
- Blob 削除失敗時は `logSyncError` のみで、UI は削除完了のまま。
- 本仕様どおりであり、変更不要。

---

## 3. Orphan Blob と将来の cleanup

### 定義

- **Orphan Blob**: どの chiplog_chip_images の行からも参照されていない Blob（key がどの image_url / blob_key にも一致しないもの）。

### 発生しうるケース

- 画像差し替え後、旧 Blob が残ったまま。
- 明示削除で参照解除は成功したが、Blob 物理削除が失敗した場合。

### 今回の扱い

- **orphan Blob の自動削除（cleanup）は実装しない。**
- 将来、別の Netlify Function や運用タスクで「参照中一覧と照合して orphan だけ削除する」処理を入れる想定とする。

### 将来 cleanup を実装する場合の前提メモ

- **参照一覧の取得**: chiplog_chip_images の全行から、有効な image_url または blob_key に対応する Blob key 一覧を取得する。
  - 現在は image_url から `key` クエリをパースして key を取り出す。
  - 将来 blob_key を持てば、blob_key 非 null の一覧をそのまま key 一覧として使える。
- **照合**: Blob store の key 一覧を列挙し、上記「参照中 key 一覧」に含まれないものを orphan とみなす。
- **削除**: orphan と判定した key についてのみ `store.delete(key)` を実行する。
- **updated_at**: 参照側の updated_at と Blob の更新日時がずれうるため、「一定期間参照されなかった key」を orphan とみなすなどのポリシーを決めておくと安全。

---

## まとめ

| シナリオ | 旧 Blob / 対象 Blob | 方針 |
|----------|----------------------|------|
| 画像差し替え | 旧 Blob | 即削除しない。orphan 許容。将来 cleanup 対象。 |
| 明示削除 | 削除した画像の Blob | 参照解除成功後に削除を試みる。失敗時は orphan 許容。UI は巻き戻さない。 |
| Orphan cleanup | 参照されていない Blob | 今回は実装しない。blob_key の保存・参照一覧との照合など、将来別タスクで検討。 |

現在の実装は上記仕様と整合している。
