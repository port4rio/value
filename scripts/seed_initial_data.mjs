import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../public/data');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initial mock stocks data to seed
const initialStocks = [
  {
    code: '5401',
    name: '日本製鉄',
    market: 'プライム',
    sector: '鉄鋼',
    price: 3180,
    change: -15,
    changePercent: -0.47,
    dividendYield: 4.85,
    per: 7.2,
    pbr: 0.61,
    roe: 8.9,
    equityRatio: 52.4,
    marketCap: 29800,
    minkabuTheoreticalPrice: 4850,
    undervaluedScore: 52.5,
    targetPrice: 3900,
    minkabuRating: '割安',
    firstDetectedDate: '2025-05-12',
    lastSeenDate: '2026-08-22',
    consecutiveDays: 467,
    totalAppearances: 467,
    status: 'chronic',
    entryPrice: 2950,
    dividendTrend: 'stable',
    consecutiveDividendHikeYears: 0,
    payoutRatio: 35.0,
    notes: '万年PBR1倍割れの代表格。高い配当利回りと堅実な利益を維持するも、市況敏感株・USスチール買収懸念等で割安圏に長期間滞留。',
    tags: ['万年PBR0.6倍', '高配当4.8%', '鉄鋼大手', '自社株買い期待'],
    history: [
      { date: '2026-02-01', price: 3050, dividendYield: 5.08, per: 7.0, pbr: 0.58, inScreener: true },
      { date: '2026-04-01', price: 3120, dividendYield: 4.96, per: 7.1, pbr: 0.60, inScreener: true },
      { date: '2026-06-01', price: 3240, dividendYield: 4.78, per: 7.4, pbr: 0.62, inScreener: true },
      { date: '2026-08-01', price: 3160, dividendYield: 4.90, per: 7.2, pbr: 0.60, inScreener: true },
      { date: '2026-08-22', price: 3180, dividendYield: 4.85, per: 7.2, pbr: 0.61, inScreener: true },
    ]
  },
  {
    code: '8058',
    name: '三菱商事',
    market: 'プライム',
    sector: '卸売業',
    price: 3050,
    change: 22,
    changePercent: 0.73,
    dividendYield: 3.61,
    per: 11.2,
    pbr: 0.98,
    roe: 14.5,
    equityRatio: 52.0,
    marketCap: 128000,
    minkabuTheoreticalPrice: 4100,
    undervaluedScore: 34.4,
    targetPrice: 3600,
    minkabuRating: '割安',
    firstDetectedDate: '2026-08-10',
    lastSeenDate: '2026-08-23',
    consecutiveDays: 13,
    totalAppearances: 13,
    status: 'rare_new',
    entryPrice: 2980,
    dividendTrend: 'increasing',
    consecutiveDividendHikeYears: 9,
    payoutRatio: 40.0,
    notes: '累進配当方針を明言する総合商社トップ。自社株買いに極めて積極的でPBR1倍是正が目前。',
    tags: ['累進配当', '商社大手', '新着割安', '連続増配9年'],
    history: [
      { date: '2026-08-10', price: 2980, dividendYield: 3.69, per: 10.9, pbr: 0.95, inScreener: true },
      { date: '2026-08-23', price: 3050, dividendYield: 3.61, per: 11.2, pbr: 0.98, inScreener: true }
    ]
  }
];

const initialSnapshots = [
  {
    date: '2026-08-23',
    totalCount: 48,
    chronicCount: 18,
    rareNewCount: 12,
    normalCount: 18,
    graduatedCount: 4,
    avgYield: 4.12,
    avgPer: 8.9,
    avgPbr: 0.72,
    topYieldStock: {
      code: '5401',
      name: '日本製鉄',
      yield: 4.85
    },
    stockCodes: ['5401', '8058']
  }
];

fs.writeFileSync(path.join(DATA_DIR, 'stocks.json'), JSON.stringify(initialStocks, null, 2), 'utf-8');
fs.writeFileSync(path.join(DATA_DIR, 'snapshots.json'), JSON.stringify(initialSnapshots, null, 2), 'utf-8');
fs.writeFileSync(path.join(DATA_DIR, 'ai_summaries.json'), JSON.stringify({}, null, 2), 'utf-8');

console.log('Seed data written successfully to public/data/');
