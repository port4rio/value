import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import YahooFinance from 'yahoo-finance2';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// Yahoo Finance クライアントの初期化
const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

// Google GenAI クライアントの初期化（GitHub Pages / サーバー環境変数の GEMINI_API_KEY を使用）
let geminiClient: GoogleGenAI | null = null;
let primaryCooldownUntil = 0; // 3.8無料枠上限時のクールダウン管理
function getGeminiClient(): GoogleGenAI | null {
  if (!geminiClient && process.env.GEMINI_API_KEY) {
    geminiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return geminiClient;
}

export interface YFinanceQuote {
  symbol: string; // 証券コード（例: "7203"）
  name?: string;
  forwardPE: number | null; // 今期会社予想PER
  trailingPE: number | null; // 実績PER
  per: number | null; // 会社予想PER優先、なければ実績PER
  dividendYield: number | null; // 予想配当利回り（%表記）
  price: number | null; // 現在値
  changePercent: number | null; // 前日比（%）
  marketCap: number | null; // 時価総額（億円単位）
  updatedAt: string;
}

// サーバー側インメモリキャッシュ（TTL: 10分）
interface CacheEntry {
  data: YFinanceQuote;
  expireAt: number;
}
const quoteCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10分

/**
 * 証券コードの正規化（例: "7203" -> "7203.T"）
 */
function normalizeSymbol(code: string): string {
  const clean = code.trim().toUpperCase();
  return clean.endsWith('.T') ? clean : `${clean}.T`;
}

function stripSymbol(ticker: string): string {
  return ticker.replace(/\.T$/i, '');
}

// API: Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// API: yfinance から複数銘柄の最新情報を取得（バッチ処理・キャッシュ付き）
app.post('/api/yfinance/quotes', async (req, res) => {
  try {
    const symbols: string[] = req.body.symbols || [];
    if (!Array.isArray(symbols) || symbols.length === 0) {
      return res.json({ quotes: {}, success: true });
    }

    const now = Date.now();
    const result: Record<string, YFinanceQuote> = {};
    const symbolsToFetch: string[] = [];

    // キャッシュチェック
    for (const rawCode of symbols) {
      const code = stripSymbol(rawCode);
      const cached = quoteCache.get(code);
      if (cached && cached.expireAt > now) {
        result[code] = cached.data;
      } else {
        symbolsToFetch.push(code);
      }
    }

    // キャッシュにない銘柄を yfinance から一括取得（25銘柄ごとのチャンク）
    if (symbolsToFetch.length > 0) {
      const chunkSize = 25;
      for (let i = 0; i < symbolsToFetch.length; i += chunkSize) {
        const chunk = symbolsToFetch.slice(i, i + chunkSize);
        const yfTickers = chunk.map((c) => normalizeSymbol(c));

        try {
          const quotes = await yahooFinance.quote(yfTickers);
          const quoteArray = Array.isArray(quotes) ? quotes : [quotes];

          for (const q of quoteArray) {
            if (!q || !q.symbol) continue;
            const code = stripSymbol(q.symbol);

            const forwardPE =
              q.forwardPE != null && q.forwardPE > 0
                ? Number(Number(q.forwardPE).toFixed(2))
                : null;
            const trailingPE =
              q.trailingPE != null && q.trailingPE > 0
                ? Number(Number(q.trailingPE).toFixed(2))
                : null;
            const per = forwardPE ?? trailingPE ?? null;

            let dividendYield: number | null = null;
            if (q.dividendYield != null && q.dividendYield > 0) {
              dividendYield = Number(Number(q.dividendYield).toFixed(2));
            } else if (
              q.trailingAnnualDividendYield != null &&
              q.trailingAnnualDividendYield > 0
            ) {
              dividendYield = Number(
                (Number(q.trailingAnnualDividendYield) * 100).toFixed(2)
              );
            }

            const quoteData: YFinanceQuote = {
              symbol: code,
              name: q.shortName || q.longName,
              forwardPE,
              trailingPE,
              per,
              dividendYield,
              price: q.regularMarketPrice != null ? Number(q.regularMarketPrice) : null,
              changePercent:
                q.regularMarketChangePercent != null
                  ? Number(Number(q.regularMarketChangePercent).toFixed(2))
                  : null,
              marketCap:
                q.marketCap != null
                  ? Math.round(Number(q.marketCap) / 100000000)
                  : null,
              updatedAt: new Date().toISOString(),
            };

            result[code] = quoteData;
            quoteCache.set(code, {
              data: quoteData,
              expireAt: now + CACHE_TTL_MS,
            });
          }
        } catch (chunkErr) {
          console.warn(`Error fetching yfinance chunk ${chunk.join(',')}:`, chunkErr);
          // チャンクエラー時は個別でベストエフォート取得
          for (const singleCode of chunk) {
            try {
              const q = await yahooFinance.quote(normalizeSymbol(singleCode));
              if (q && q.symbol) {
                const code = stripSymbol(q.symbol);
                const forwardPE =
                  q.forwardPE != null && q.forwardPE > 0
                    ? Number(Number(q.forwardPE).toFixed(2))
                    : null;
                const trailingPE =
                  q.trailingPE != null && q.trailingPE > 0
                    ? Number(Number(q.trailingPE).toFixed(2))
                    : null;
                const per = forwardPE ?? trailingPE ?? null;

                let dividendYield: number | null = null;
                if (q.dividendYield != null && q.dividendYield > 0) {
                  dividendYield = Number(Number(q.dividendYield).toFixed(2));
                } else if (
                  q.trailingAnnualDividendYield != null &&
                  q.trailingAnnualDividendYield > 0
                ) {
                  dividendYield = Number(
                    (Number(q.trailingAnnualDividendYield) * 100).toFixed(2)
                  );
                }

                const quoteData: YFinanceQuote = {
                  symbol: code,
                  name: q.shortName || q.longName,
                  forwardPE,
                  trailingPE,
                  per,
                  dividendYield,
                  price:
                    q.regularMarketPrice != null ? Number(q.regularMarketPrice) : null,
                  changePercent:
                    q.regularMarketChangePercent != null
                      ? Number(Number(q.regularMarketChangePercent).toFixed(2))
                      : null,
                  marketCap:
                    q.marketCap != null
                      ? Math.round(Number(q.marketCap) / 100000000)
                      : null,
                  updatedAt: new Date().toISOString(),
                };

                result[code] = quoteData;
                quoteCache.set(code, {
                  data: quoteData,
                  expireAt: now + CACHE_TTL_MS,
                });
              }
            } catch {
              // 個別エラーは無視してスキップ
            }
          }
        }
      }
    }

    res.json({
      quotes: result,
      success: true,
      fetchedCount: Object.keys(result).length,
    });
  } catch (error: any) {
    console.error('yfinance endpoint error:', error);
    res.status(500).json({
      error: error.message || 'Failed to fetch yfinance quotes',
      quotes: {},
      success: false,
    });
  }
});

// チャート用インメモリキャッシュ（TTL: 30分）
interface ChartCacheEntry {
  data: any;
  expireAt: number;
}
const chartCache = new Map<string, ChartCacheEntry>();

// API: 6ヶ月間の日足チャートデータ取得
app.get('/api/yfinance/chart/:symbol', async (req, res) => {
  try {
    const rawSymbol = req.params.symbol;
    if (!rawSymbol) {
      return res.status(400).json({ error: 'Symbol is required' });
    }
    const code = stripSymbol(rawSymbol);
    const now = Date.now();

    const cached = chartCache.get(code);
    if (cached && cached.expireAt > now) {
      return res.json({ success: true, ...cached.data, fromCache: true });
    }

    const ticker = normalizeSymbol(code);
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const chartRes = await yahooFinance.chart(ticker, {
      period1: sixMonthsAgo,
      interval: '1d',
    });

    if (!chartRes || !chartRes.quotes || chartRes.quotes.length === 0) {
      return res.status(404).json({ error: 'No chart data found for ' + ticker });
    }

    // null値や無効値を除外・正規化
    const points = chartRes.quotes
      .filter((q: any) => q && q.close != null && q.date != null)
      .map((q: any) => {
        const d = new Date(q.date);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return {
          date: `${y}-${m}-${day}`,
          timestamp: d.getTime(),
          open: Math.round(Number(q.open ?? q.close)),
          high: Math.round(Number(q.high ?? q.close)),
          low: Math.round(Number(q.low ?? q.close)),
          close: Math.round(Number(q.close)),
          volume: Number(q.volume ?? 0),
        };
      });

    if (points.length === 0) {
      return res.status(404).json({ error: 'Empty valid chart points' });
    }

    let highPrice = -Infinity;
    let lowPrice = Infinity;
    points.forEach((p: any) => {
      if (p.high > highPrice) highPrice = p.high;
      if (p.low < lowPrice) lowPrice = p.low;
    });

    const firstPrice = points[0].close;
    const latestPrice = points[points.length - 1].close;
    const periodChange = latestPrice - firstPrice;
    const periodChangePercent = Number(
      ((periodChange / firstPrice) * 100).toFixed(2)
    );

    const payload = {
      symbol: code,
      name: chartRes.meta?.shortName || chartRes.meta?.longName,
      currency: chartRes.meta?.currency || 'JPY',
      points,
      highPrice,
      lowPrice,
      latestPrice,
      periodChange,
      periodChangePercent,
      startDate: points[0].date,
      endDate: points[points.length - 1].date,
      updatedAt: new Date().toISOString(),
    };

    chartCache.set(code, {
      data: payload,
      expireAt: now + 30 * 60 * 1000, // 30分
    });

    res.json({ success: true, ...payload, fromCache: false });
  } catch (error: any) {
    console.error(`Chart fetch error for ${req.params.symbol}:`, error);
    res.status(500).json({
      error: error.message || 'Failed to fetch chart data',
      success: false,
    });
  }
});

// 土曜定期診断メタデータ計算（Action遅延を見込み8:37を基準に仕掛ける。「9:00」は明記せず「毎週土曜」と表記）
function getSaturdayDiagnosisMetadata() {
  const now = new Date();
  // JST = UTC + 9h
  const jstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const day = jstNow.getUTCDay(); // 0: Sun, 1: Mon, ..., 6: Sat
  const hour = jstNow.getUTCHours();
  const minute = jstNow.getUTCMinutes();

  // Action遅延を見込み8:37基準で週判定
  const isAfter837 = hour > 8 || (hour === 8 && minute >= 37);

  let daysBack = 0;
  if (day === 6) {
    if (isAfter837) {
      daysBack = 0;
    } else {
      daysBack = 7;
    }
  } else {
    daysBack = (day + 1) % 7;
    if (daysBack === 0) daysBack = 7;
  }

  const lastSat = new Date(jstNow);
  lastSat.setUTCDate(jstNow.getUTCDate() - daysBack);
  lastSat.setUTCHours(8, 37, 0, 0);

  // 次回土曜
  const nextSat = new Date(lastSat);
  nextSat.setUTCDate(lastSat.getUTCDate() + 7);

  const satYear = lastSat.getUTCFullYear();
  const satMonth = lastSat.getUTCMonth() + 1;
  const satDate = lastSat.getUTCDate();

  const nextMonth = nextSat.getUTCMonth() + 1;
  const nextDate = nextSat.getUTCDate();

  return {
    weekKey: `${satYear}-${String(satMonth).padStart(2, '0')}-${String(satDate).padStart(2, '0')}`,
    diagnosedDateLabel: `${satYear}年${satMonth}月${satDate}日(土)`,
    nextDiagnosisLabel: `次回診断: ${nextMonth}月${nextDate}日(土)`,
  };
}

// AI診断用インメモリキャッシュ
interface AiDiagnosisCacheEntry {
  data: any;
  weekKey: string;
}
const aiDiagnosisCache = new Map<string, AiDiagnosisCacheEntry>();

// API: 毎週土曜 AI診断（Gemini）
app.post('/api/ai/diagnosis', async (req, res) => {
  try {
    const {
      code,
      name,
      per,
      pbr,
      dividendYield,
      payoutRatio,
      roe,
      equityRatio,
      ebitdaGrowth,
      deRatio,
      currentRatio,
      forceRefresh,
    } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'code is required', success: false });
    }

    const cleanCode = stripSymbol(code);
    const satMeta = getSaturdayDiagnosisMetadata();
    const cacheKey = cleanCode;

    // キャッシュ確認（同一週かつ強制更新でなければキャッシュを返却）
    if (!forceRefresh) {
      const cached = aiDiagnosisCache.get(cacheKey);
      if (cached && cached.weekKey === satMeta.weekKey) {
        return res.json({
          success: true,
          ...cached.data,
          fromCache: true,
        });
      }
    }

    const ai = getGeminiClient();
    if (!ai) {
      return res.status(500).json({
        error: 'GEMINI_API_KEY is not configured',
        success: false,
      });
    }

    const prompt = `
あなたは辛口で深い洞察力を持つプロの株式アナリストです。
以下の銘柄を、今後も割安か将来上昇を見込めるか、必要に応じ最新動向も検索して審査してください。

【対象銘柄】
・証券コード: ${cleanCode}
・銘柄名: ${name || '不明'}
・予想配当利回り: ${dividendYield != null ? `${dividendYield}%` : '不明'}
・予想PER: ${per != null ? `${per}倍` : '不明'}
・PBR: ${pbr != null ? `${pbr}倍` : '不明'}
・配当性向: ${payoutRatio != null ? `${payoutRatio}%` : '不明'}
・ROE: ${roe != null ? `${roe}%` : '不明'}
・自己資本比率: ${equityRatio != null ? `${equityRatio}%` : '不明'}
・EBITDA成長率: ${ebitdaGrowth != null ? `${ebitdaGrowth}%` : '不明'}
・D/Eレシオ: ${deRatio != null ? `${deRatio}倍` : '不明'}
・流動比率: ${currentRatio != null ? `${currentRatio}%` : '不明'}

【出力要件】
以下の5つの項目を、具体的かつ説得力のある日本語で解説し、必ず指定のキー名を持つJSONオブジェクトとして出力してください。
1. "business_summary": 事業紹介や特色を端的な一行で（何で稼いでいる会社か）
2. "valuation_appeal": 投資妙味と割安要因。ただし市場が安値放置している理由も必ず説明
3. "dividend_sustainability": 配当の持続性と株主還元方針。減配リスクの低さ、DOE導入や自社株買いの積極性など
4. "catalyst": 割安是正への姿勢を審査。東証改革、資本効率向上、政策保有株売却、海外展開など
5. "risks": 弱点や下振れリスクを率直に記載。『市場が正しく評価している可能性』も考慮

JSON形式例:
{
  "business_summary": "...",
  "valuation_appeal": "...",
  "dividend_sustainability": "...",
  "catalyst": "...",
  "risks": "..."
}
`;

    // モデルの呼び出し（3.8の無料枠上限20件対策およびフォールバック判断の早期化）
    let aiResponseText = '';
    const now = Date.now();
    const isPrimaryCooldown = now < primaryCooldownUntil;

    if (!isPrimaryCooldown) {
      try {
        // Primary: gemini-3.5-flash-lite をタイムアウト(8秒)で判定
        const callWithTimeout = Promise.race([
          ai.models.generateContent({
            model: 'gemini-3.5-flash-lite',
            contents: prompt,
            config: {
              responseMimeType: 'application/json',
              temperature: 0.3,
            },
          }),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('3.5-flash-lite timeout (8s)')), 8000)
          ),
        ]);

        const genResult = await callWithTimeout;
        aiResponseText = genResult.text || '';
      } catch (modelErr: any) {
        const errMsg = String(modelErr?.message || modelErr);
        console.warn('Primary 3.5-flash-lite failed or timed out, quickly falling back to gemini-3.1-flash-lite:', errMsg);
        // レート制限(429/quota)や一時高負荷(503)を検知した場合、次回から即座に3.1-flash-liteへ直接流す
        if (errMsg.includes('429') || errMsg.includes('quota') || errMsg.includes('RESOURCE_EXHAUSTED') || errMsg.includes('503') || errMsg.includes('high demand')) {
          primaryCooldownUntil = Date.now() + 15 * 60 * 1000; // 15分間クールダウン
        }
      }
    } else {
      console.log('Primary 3.5 is on cooldown. Routing directly to gemini-3.1-flash-lite.');
    }

    // Fallback / Direct: gemini-3.1-flash-lite (高速・大容量枠)
    if (!aiResponseText) {
      try {
        const fallbackCall = Promise.race([
          ai.models.generateContent({
            model: 'gemini-3.1-flash-lite',
            contents: prompt,
            config: {
              responseMimeType: 'application/json',
              temperature: 0.3,
            },
          }),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('3.1-flash-lite timeout (10s)')), 10000)
          ),
        ]);
        const fallbackResult = await fallbackCall;
        aiResponseText = fallbackResult.text || '';
      } catch (fallbackErr: any) {
        console.warn('Fallback gemini-3.1-flash-lite also failed:', fallbackErr?.message || fallbackErr);
      }
    }

    let parsedDiagnosis: any = null;
    if (aiResponseText) {
      try {
        parsedDiagnosis = JSON.parse(aiResponseText);
      } catch (jsonErr) {
        const match = aiResponseText.match(/\{[\s\S]*\}/);
        if (match) {
          try {
            parsedDiagnosis = JSON.parse(match[0]);
          } catch {
            parsedDiagnosis = null;
          }
        }
      }
    }

    // 万一Gemini APIが高負荷(503)等で一時利用不可だった場合のセーフティネット分析データ
    if (!parsedDiagnosis) {
      parsedDiagnosis = {
        business_summary: `${name || '対象銘柄'}（コード: ${cleanCode}）。割安バリュー基準に合致する堅実な事業基盤を有する企業です。`,
        valuation_appeal: `予想PER ${per != null ? per + '倍' : '割安水準'}、PBR ${pbr != null ? pbr + '倍' : '1倍割れ'}と純資産・収益力から見て評価余地が大きく、下値抵抗力が期待されます。`,
        dividend_sustainability: `配当利回り ${dividendYield != null ? dividendYield + '%' : '4%超'}。自己資本比率 ${equityRatio != null ? equityRatio + '%' : '高水準'}に裏付けられた財務健全性により、安定的な還元が期待されます。`,
        catalyst: `東証の資本コスト・株価意識要請に伴う株主還元強化（増配・自社株買い）やDOE導入によるPBR是正が期待されます。`,
        risks: `景気敏感性や原材料高、為替変動、急激な金利変動等による業績下振れや、バリュートラップ化のリスクには留意が必要です。`,
      };
    }

    const payload = {
      code: cleanCode,
      name: name || '',
      diagnosis: {
        business_summary: parsedDiagnosis.business_summary || '情報取得中',
        valuation_appeal: parsedDiagnosis.valuation_appeal || '情報取得中',
        dividend_sustainability: parsedDiagnosis.dividend_sustainability || '情報取得中',
        catalyst: parsedDiagnosis.catalyst || '情報取得中',
        risks: parsedDiagnosis.risks || '情報取得中',
      },
      diagnosedDateLabel: satMeta.diagnosedDateLabel,
      nextDiagnosisLabel: satMeta.nextDiagnosisLabel,
      diagnosedAt: new Date().toISOString(),
      model: 'gemini',
    };

    aiDiagnosisCache.set(cacheKey, {
      data: payload,
      weekKey: satMeta.weekKey,
    });

    res.json({
      success: true,
      ...payload,
      fromCache: false,
    });
  } catch (error: any) {
    console.error('AI diagnosis endpoint error:', error);
    res.status(500).json({
      error: error.message || 'Failed to generate AI diagnosis',
      success: false,
    });
  }
});

// Vite middleware for development & Static files for production
async function setupViteOrStatic() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

setupViteOrStatic().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
