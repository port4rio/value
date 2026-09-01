import { Stock } from '../types/stock';

export interface HoldingItem {
  code: string;
  shares: number;
  avgPrice: number;
  addedAt: string;
  notes?: string;
}

/**
 * 銘柄ごとの詳細分析・相談用ChatGPTプロンプトを生成
 */
export function generateStockConsultationPrompt(stock: Stock, holding?: HoldingItem): string {
  const isHolding = holding && holding.shares > 0;
  
  const holdingInfo = isHolding 
    ? `\n【私の保有状況】\n- 保有株数: ${holding.shares.toLocaleString()} 株\n- 取得単価: ¥${holding.avgPrice.toLocaleString()}\n- 現在損益: ¥${((stock.price - holding.avgPrice) * holding.shares).toLocaleString()} (${(((stock.price - holding.avgPrice) / holding.avgPrice) * 100).toFixed(2)}%)\n- 年間受取配当見込: ¥${Math.round((holding.shares * stock.price * (stock.dividendYield / 100))).toLocaleString()}`
    : '';

  return `あなたは日本株のバリュー投資および高配当株投資に精通したプロのアナリストです。
以下の「割安高配当・財務健全スクリーニング」に該当する個別銘柄のデータに基づき、詳細な企業分析と投資アドバイスを論理的・客観的に提供してください。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【対象銘柄データ】
- 銘柄コード: ${stock.code}
- 銘柄名: ${stock.name} (${stock.market} / ${stock.sector})
- 現在株価: ¥${stock.price.toLocaleString()} (前日比: ${stock.change >= 0 ? '+' : ''}${stock.change}円 / ${stock.changePercent >= 0 ? '+' : ''}${stock.changePercent}%)
- 予想配当利回り: ${stock.dividendYield.toFixed(2)}%
- 実績PBR: ${stock.pbr.toFixed(2)}倍
- 予想PER: ${stock.per.toFixed(1)}倍
- 自己資本比率: ${stock.equityRatio.toFixed(1)}% (ROE: ${stock.roe.toFixed(1)}%)
- 配当性向: ${stock.payoutRatio.toFixed(1)}%
- 連続増配年数: ${stock.consecutiveDividendHikeYears > 0 ? `${stock.consecutiveDividendHikeYears}期連続増配` : '安定維持'}
- みんかぶ理論株価: ¥${stock.minkabuTheoreticalPrice.toLocaleString()} (割安度: +${stock.undervaluedScore.toFixed(1)}%)
- アナリスト目標株価: ¥${stock.targetPrice.toLocaleString()}
- スクリーニング分類: ${stock.status === 'chronic' ? `ずっと割安放置 (${stock.consecutiveDays}日間滞在)` : stock.status === 'rare_new' ? `珍しく割安 (${stock.consecutiveDays}日目新着)` : stock.status === 'graduated' ? `割安卒業 (+${stock.graduationReturnPercent}%達成)` : '通常スクリーニング'}
- 特徴・メモ: ${stock.notes || 'なし'}${holdingInfo}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

【質問・分析してほしい項目】
1. **事業モメンタムとバリュエーション評価**:
   - なぜこの銘柄は現在割安（低PBR/低PER/高配当）に放置されているのか？
   - 単なる「バリュートラップ（割安の罠）」なのか、それとも「市場の過小評価（見直し余地大）」なのか？
2. **配当の安全性と減配リスク診断**:
   - 自己資本比率、配当性向、事業の景気敏感度から見て、今後減配されるリスクはどの程度あるか？
   - 今後の増配余力や株主還元強化（自社株買い、DOE採用等）の可能性はあるか？
3. **東証PBR改革・カタリスト（上昇のきっかけ）**:
   - PBR1倍割れ改善に向けた施策や、適正株価への回帰シナリオはどう考えられるか？
4. **具体的な投資判断・エントリー戦略**:
   - ${isHolding ? '現在の保有を継続/買い増し/一部利確・損切りのどれが適切か？' : '現在値での新規買いエントリーは推奨できるか？どの価格帯なら安心して買えるか？'}
   - 今後注視すべき決算発表のチェックポイント

専門用語をわかりやすく解説しながら、実践的な見解を述べてください。`;
}

/**
 * 保有ポートフォリオ全体の診断用ChatGPTプロンプトを生成
 */
export function generatePortfolioConsultationPrompt(
  items: { stock: Stock; holding: HoldingItem }[]
): string {
  const totalValue = items.reduce((sum, item) => sum + item.stock.price * item.holding.shares, 0);
  const totalCost = items.reduce((sum, item) => sum + item.holding.avgPrice * item.holding.shares, 0);
  const totalProfit = totalValue - totalCost;
  const totalProfitPercent = totalCost > 0 ? (totalProfit / totalCost) * 100 : 0;
  const totalAnnualDividend = items.reduce(
    (sum, item) => sum + item.holding.shares * item.stock.price * (item.stock.dividendYield / 100),
    0
  );
  const weightedYield = totalValue > 0 ? (totalAnnualDividend / totalValue) * 100 : 0;

  const stockListText = items.map((item, idx) => {
    const s = item.stock;
    const h = item.holding;
    const value = s.price * h.shares;
    const weight = totalValue > 0 ? ((value / totalValue) * 100).toFixed(1) : '0';
    return `${idx + 1}. 【${s.code}】${s.name} (${s.sector})
   - 保有株数: ${h.shares}株 | 取得単価: ¥${h.avgPrice.toLocaleString()} | 現在値: ¥${s.price.toLocaleString()}
   - 評価額: ¥${Math.round(value).toLocaleString()} (比率: ${weight}%) | 損益: ${s.price >= h.avgPrice ? '+' : ''}${(((s.price - h.avgPrice) / h.avgPrice) * 100).toFixed(1)}%
   - 配当利回り: ${s.dividendYield.toFixed(2)}% | PBR: ${s.pbr.toFixed(2)}倍 | PER: ${s.per.toFixed(1)}倍 | 自己資本: ${s.equityRatio.toFixed(0)}%`;
  }).join('\n');

  return `あなたは日本株ポートフォリオ運用・配当株投資の専任アドバイザーです。
「port4rio」で管理している私の保有ポートフォリオデータに基づき、リスク分散、配当の持続性、リバランス戦略について総合的な診断をお願いします。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【ポートフォリオ全体概要】
- 保有銘柄数: ${items.length} 銘柄
- 投資元本: ¥${Math.round(totalCost).toLocaleString()}
- 現在評価額: ¥${Math.round(totalValue).toLocaleString()}
- トータル損益: ${totalProfit >= 0 ? '+' : ''}¥${Math.round(totalProfit).toLocaleString()} (${totalProfitPercent >= 0 ? '+' : ''}${totalProfitPercent.toFixed(2)}%)
- 年間受取配当見込額: ¥${Math.round(totalAnnualDividend).toLocaleString()} / 年
- ポートフォリオ加重平均利回り: ${weightedYield.toFixed(2)}%
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

【保有銘柄明細】
${stockListText}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

【診断してほしい項目】
1. **セクター分散とリスク耐性**:
   - 業種や景気敏感株・ディフェンシブ株の偏りはないか？
   - 円高/円安、金利上昇、景気後退などのマクロ環境変化に対する脆弱性はどこにあるか？
2. **配当持続力・減配リスク評価**:
   - 保有銘柄の中に減配が懸念される危険な銘柄はないか？
   - 累進配当や増配が期待できるコア銘柄とサブ銘柄の比率は適切か？
3. **ポートフォリオ改善・リバランス提案**:
   - 次に買い増しを検討すべき銘柄や、逆に比率を落とすべき銘柄はあるか？
   - ポートフォリオの守りと攻めのバランスを良くするための具体的なアドバイス

親切で具体的かつ論理的なアドバイスをお願いします。`;
}

/**
 * ChatGPTを開くためのURLエンコード
 */
export function buildChatGPTUrl(prompt: string): string {
  return `https://chatgpt.com/?q=${encodeURIComponent(prompt)}`;
}
