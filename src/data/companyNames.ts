/**
 * 日本語銘柄名の正規化および最新社名オーバーライドマッピング
 * 
 * TradingView Scanner API 等で取得される銘柄名は options: { lang: 'ja' } を指定しているため
 * 日本語で返却されますが、TradingView 内部の日本語マスタには
 * ・旧社名のまま（例: 7994 岡村製作所 → 現 オカムラ）
 * ・登記上の長大な旧名（例: 6995 東海理化電機製作所 → 東海理化）
 * ・略称が不自然（例: 5368 日本インシュレ → 日本インシュレーション、5363 東京窯業 → ＴＹＫ）
 * となっているものが存在します。
 * 本モジュールで最新の市場通称・正式社名に補正します。
 */

export const COMPANY_NAME_OVERRIDES: Record<string, string> = {
  '7994': 'オカムラ',               // 旧社名: 岡村製作所（2018年変更）
  '6995': '東海理化',               // 登記名: 東海理化電機製作所
  '5363': 'ＴＹＫ',                 // 旧社名: 東京窯業（1989年変更）
  '5368': '日本インシュレーション',   // TradingView略称: 日本インシュレ
  '4172': 'Ｈｉクラテス',           // TradingView表記: ＨＩクラテス
  '4725': 'ＣＡＣ Ｈｏｌｄｉｎｇｓ', // TradingView表記: ＣＡＣ　ＨＯＬＤＩＮＧＳ
};

/**
 * 銘柄コードと元の名称を受け取り、最新の正規化された銘柄名を返す
 */
export function normalizeCompanyName(code: string, rawName: string): string {
  if (COMPANY_NAME_OVERRIDES[code]) {
    return COMPANY_NAME_OVERRIDES[code];
  }
  if (!rawName) return rawName;

  // 英数字プレフィックスの除去（例: "TSE:7994 岡村" -> "岡村"）
  let cleaned = rawName.replace(/^[A-Z0-9\s:]+(?=[一-龥ぁ-んァ-ヶ])/, '').trim();
  
  // 連続する全角・半角スペースの整形
  cleaned = cleaned.replace(/[\s　]+/g, ' ').trim();

  return cleaned || rawName;
}
