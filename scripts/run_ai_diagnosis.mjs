/**
 * scripts/run_ai_diagnosis.mjs
 * 
 * 土曜朝 9:07 JST 自動実行: スクリーニング銘柄の AI 決算・財務サマリー一括診断スクリプト
 * 
 * ■ 目的:
 *   - 平日は決算短信の要約に gemini 3.5 flash lite (または gemini-2.5-flash-lite / @google/genai) を使用しているため、
 *     API無料枠に余裕がある土曜日の朝 (09:07 JST) に、現在スクリーニングに残っている上位銘柄を一括AI診断する。
 * 
 * ■ 二重処理防止 & レートリミット対策:
 *   - 既に直近7日以内にAI診断が完了している銘柄はスキップ。
 *   - 無料枠の Rate Limit (15 RPM) を厳守するため、1銘柄あたり 4.5秒のウェイトを設ける。
 *   - GEMINI_API_KEY が未設定の場合は安全にモックサマリーを生成して終了。
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.resolve(__dirname, '../public/data');
const STOCKS_FILE = path.join(DATA_DIR, 'stocks.json');
const AI_SUMMARIES_FILE = path.join(DATA_DIR, 'ai_summaries.json');

const getTodayJST = () => {
  const formatter = new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  return formatter.format(new Date()).replace(/\//g, '-');
};

const today = getTodayJST();
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
  console.log(`[AI DIAGNOSIS] Starting Saturday Batch AI Diagnosis at ${today} (JST)...`);

  if (!fs.existsSync(STOCKS_FILE)) {
    console.error(`[ERROR] Stocks file not found at ${STOCKS_FILE}. Please run daily screener first.`);
    return;
  }

  const stocks = JSON.parse(fs.readFileSync(STOCKS_FILE, 'utf-8'));
  const activeStocks = stocks.filter(s => s.status !== 'graduated');
  console.log(`[INFO] Found ${activeStocks.length} active screened stocks to evaluate.`);

  let aiSummaries = {};
  if (fs.existsSync(AI_SUMMARIES_FILE)) {
    try {
      aiSummaries = JSON.parse(fs.readFileSync(AI_SUMMARIES_FILE, 'utf-8'));
    } catch (e) {
      console.error('[WARN] Failed to parse ai_summaries.json. Starting fresh.', e);
    }
  }

  const apiKey = process.env.GEMINI_API_KEY;
  let ai = null;
  if (apiKey) {
    ai = new GoogleGenAI({ apiKey });
    console.log('[INFO] Gemini API client initialized.');
  } else {
    console.warn('[WARN] GEMINI_API_KEY is not set. Will use heuristic algorithm to generate summaries.');
  }

  let processedCount = 0;
  let skippedCount = 0;

  for (const stock of activeStocks) {
    const existingSummary = aiSummaries[stock.code];

    // 二重処理防止: 既に今日または直近7日以内に診断済みならスキップ
    if (existingSummary && existingSummary.updatedAt) {
      const daysDiff = (new Date(today) - new Date(existingSummary.updatedAt)) / (1000 * 60 * 60 * 24);
      if (daysDiff < 7) {
        skippedCount++;
        continue;
      }
    }

    console.log(`[DIAGNOSING] (${processedCount + 1}/${activeStocks.length}) ${stock.code} ${stock.name}...`);

    let summaryData = null;

    if (ai) {
      const candidateModels = process.env.GEMINI_MODEL 
        ? [process.env.GEMINI_MODEL] 
        : ['gemini-3.5-flash-lite', 'gemini-3.6-flash', 'gemini-2.5-flash-lite', 'gemini-2.0-flash'];
      
      const prompt = `あなたは日本株のプロのバリュー高配当株アナリストです。
以下の銘柄の財務指標と割安データを分析し、JSONフォーマットのみで簡潔に出力してください。

【対象銘柄データ】
- 銘柄: ${stock.name} (${stock.code}) / 市場: ${stock.market} / 業種: ${stock.sector}
- 現在株価: ${stock.price}円 / 理論株価: ${stock.minkabuTheoreticalPrice || stock.price * 1.25}円 (割安度: +${stock.undervaluedScore || 25}%)
- 配当利回り: ${stock.dividendYield}% / 連続増配年数: ${stock.consecutiveDividendHikeYears || 0}年 / 配当性向: ${stock.payoutRatio || 35}%
- PBR: ${stock.pbr}倍 / PER: ${stock.per}倍 / ROE: ${stock.roe || 8.5}% / 自己資本比率: ${stock.equityRatio || 55}%
- 営業利益成長率: ${stock.operatingGrowth || 0}% / 売上成長率: ${stock.salesCagr3y || 0}%
- スクリーニング滞在日数: ${stock.consecutiveDays}日 (${stock.status === 'chronic' ? '90日以上ずっと割安放置' : '直近の新着割安'})

【出力JSONスキーマ】
{
  "valuationReason": "なぜ割安に放置されているかの背景（100文字程度）",
  "dividendSafety": "配当の持続性・財務健全性の評価（100文字程度）",
  "catalyst": "今後株価が見直されるカタリスト（東証PBR改革・増配・自社株買い等）（80文字程度）",
  "riskFactor": "投資上の注意点・懸念リスク（80文字程度）",
  "healthScore": 85, // 0〜100の総合健全度スコア (数値)
  "aiVerdict": "積極買い検討" // または "押し目買い" / "様子見" / "減配警戒"
}`;

      for (const modelName of candidateModels) {
        try {
          const response = await ai.models.generateContent({
            model: modelName,
            contents: prompt,
            config: {
              responseMimeType: 'application/json'
            }
          });

          const text = typeof response.text === 'function' ? response.text() : (response.text || response.candidates?.[0]?.content?.parts?.[0]?.text || '');
          const parsed = JSON.parse(text);
          summaryData = {
            code: stock.code,
            name: stock.name,
            model: modelName,
            updatedAt: today,
            ...parsed
          };
          // 成功したらループを抜ける
          break;
        } catch (err) {
          console.warn(`[WARN] Gemini model ${modelName} failed for ${stock.code}:`, err.message);
        }
      }
    }

    // フォールバック（API未設定またはエラー時）
    if (!summaryData) {
      const isHighHealth = stock.equityRatio >= 50 && stock.pbr < 1.0;
      summaryData = {
        code: stock.code,
        name: stock.name,
        updatedAt: today,
        valuationReason: `${stock.sector}セクター全体の低PBR（${stock.pbr}倍）傾向と、市場の認知不足により割安圏で推移。`,
        dividendSafety: `自己資本比率${stock.equityRatio}%と財務余力があり、配当利回り${stock.dividendYield}%の維持可能性は高い水準。`,
        catalyst: '東証の資本コスト経営要請を受けた自社株買い・増配発表やPBR1倍是正への取り組み。',
        riskFactor: '市況変動による売上減速や資材価格高騰に伴う利益率圧迫。',
        healthScore: isHighHealth ? 82 : 74,
        aiVerdict: stock.consecutiveDays >= 90 ? '長期保有・配当狙い' : '新着割安・押し目注目'
      };
    }

    aiSummaries[stock.code] = summaryData;
    processedCount++;

    // レートリミット回避の待機 (土曜日朝の余裕を持ったペース)
    if (ai) {
      await sleep(4500);
    }
  }

  // 結果を ai_summaries.json に保存
  fs.writeFileSync(AI_SUMMARIES_FILE, JSON.stringify(aiSummaries, null, 2), 'utf-8');
  console.log(`[SAVED] AI Summaries updated: ${processedCount} generated, ${skippedCount} skipped (already fresh).`);
}

main().catch(err => {
  console.error('[FATAL] AI Diagnosis batch failed:', err);
  process.exit(1);
});
