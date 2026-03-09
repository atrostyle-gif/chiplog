/**
 * ログ同期・画像同期のエラー表示用メッセージ（ユーザー向け）。
 * 生の Error.message を UI に出さず、ここで定義した文言を使う。
 */

/** ログ保存（Dexie への保存）失敗時 */
export const SAVE_FAILED =
  "保存に失敗しました。通信状況を確認して再試行してください。";

/** クラウド同期失敗時（保存後の同期・手動再同期） */
export const SYNC_FAILED =
  "同期に失敗しました。あとで再試行してください。";

/** クラウドのログ一覧取得失敗時 */
export const CLOUD_LOG_LIST_FAILED =
  "クラウドのログ一覧を取得できませんでした。あとで再試行してください。";

/** 画像アップロード失敗時 */
export const IMAGE_UPLOAD_FAILED = "画像のアップロードに失敗しました。";

/** 画像削除失敗時 */
export const IMAGE_DELETE_FAILED = "画像の削除に失敗しました。";

/**
 * バックグラウンド失敗時の詳細を console に出す（UI には出さない）。
 */
export function logSyncError(context: string, detail: unknown): void {
  console.error(`[sync] ${context}`, detail);
}
