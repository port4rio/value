export const DAILY_WORKFLOW_YML = `# .github/workflows/daily_screen.yml
# みんかぶ「割安高配当」日次自動スクリーニング＆GitHub Pages自動更新ワークフロー
name: Daily Minkabu Screener & Deploy

on:
  schedule:
    # 毎週月〜金曜日 日本時間 15:37 (UTC 06:37) 東京市場引け(15:30)直後に自動実行
    - cron: '37 6 * * 1-5'
  workflow_dispatch: # GitHub管理画面からいつでも手動実行可能（二重カウント防止設計）

permissions:
  contents: write
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: false

jobs:
  scrape-and-update:
    runs-on: ubuntu-latest
    steps:
      - name: リポジトリをチェックアウト
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Node.js 20のセットアップ
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: 依存パッケージをインストール
        run: npm install

      - name: みんかぶ割安高配当スクリーニングを実行 (15:37 JST)
        run: node scripts/fetch_minkabu.mjs
        env:
          TZ: 'Asia/Tokyo'

      - name: 差分データをGitリポジトリにコミット＆プッシュ
        run: |
          git config --local user.email "github-actions[bot]@users.noreply.github.com"
          git config --local user.name "github-actions[bot]"
          mkdir -p public/data
          git add -A public/data
          if git diff --staged --quiet; then
            echo "本日のデータに変更はありませんでした（二重実行時は既存データ保持）。"
          else
            git commit -m "chore(data): 割安高配当スクリーニング日次データ自動更新 [$(date +'%Y-%m-%d')]"
            git push
          fi

      - name: 静的サイトをビルド
        run: npm run build

      - name: GitHub Pages用アーティファクトのアップロード
        uses: actions/upload-pages-artifact@v3
        with:
          path: './dist'

      - name: GitHub Pagesにデプロイ
        uses: actions/deploy-pages@v4
`;

export const WEEKEND_AI_WORKFLOW_YML = `# .github/workflows/weekend_ai_diagnosis.yml
# スクリーニング銘柄の週末一括AI診断ワークフロー
name: Weekend AI Financial Diagnosis & Deploy

on:
  schedule:
    # 毎週土曜日 日本時間 09:07 (UTC 00:07) に実行
    # 平日(決算短信要約)で消費した無料枠が空いている週末朝に一括診断
    - cron: '7 0 * * 6'
  workflow_dispatch: # 手動実行トリガー（直近診断済み銘柄は自動スキップ）

permissions:
  contents: write
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: false

jobs:
  ai-diagnosis:
    runs-on: ubuntu-latest
    steps:
      - name: リポジトリをチェックアウト
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Node.js 20のセットアップ
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: 依存パッケージをインストール
        run: npm install

      - name: スクリーニング銘柄のAI決算・財務サマリーを一括生成
        run: node scripts/run_ai_diagnosis.mjs
        env:
          TZ: 'Asia/Tokyo'
          GEMINI_API_KEY: \${{ secrets.GEMINI_API_KEY }}

      - name: AI診断データをコミット＆プッシュ
        run: |
          git config --local user.email "github-actions[bot]@users.noreply.github.com"
          git config --local user.name "github-actions[bot]"
          mkdir -p public/data
          git add -A public/data/ai_summaries.json
          if git diff --staged --quiet; then
            echo "AI診断データに変更はありませんでした。"
          else
            git commit -m "chore(ai): 週末銘柄AI財務診断サマリー自動更新 [$(date +'%Y-%m-%d')]"
            git push
          fi

      - name: 静的サイトをビルド
        run: npm run build

      - name: GitHub Pages用アーティファクトのアップロード
        uses: actions/upload-pages-artifact@v3
        with:
          path: './dist'

      - name: GitHub Pagesにデプロイ
        uses: actions/deploy-pages@v4
`;

export const SCRAPER_SCRIPT = `// scripts/fetch_minkabu.mjs
/**
 * みんかぶ「割安高配当」銘柄スクリーニング自動取得 & 履歴差分集計スクリプト
 * 
 * 条件: PER<=15, PBR<=1.0, 利回り>=3.0%, 自己資本>=50%, 3年売上成長>=2%, ROE>=8%
 * 巡回: page 1〜3 (ROE降順、上位約50〜60銘柄)
 * 実行: 平日 15:37 JST (二重カウント防止 & ユーザーエージェント偽装済み)
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.resolve(__dirname, '../public/data');
const STOCKS_FILE = path.join(DATA_DIR, 'stocks.json');
const SNAPSHOTS_FILE = path.join(DATA_DIR, 'snapshots.json');

const today = new Intl.DateTimeFormat('ja-JP', {
  timeZone: 'Asia/Tokyo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
}).format(new Date()).replace(/\\//g, '-');

// みんかぶ検索URL生成 (page 1〜3)
const buildSearchUrl = (page) => {
  return \`https://minkabu.jp/stock/search?view=result&page=\${page}&sort_key=roe&order=desc&minimum_purchase_price[0]=min&minimum_purchase_price[1]=max&market_capitalization[0]=min&market_capitalization[1]=max&per[0]=min&per[1]=15&pbr[0]=min&pbr[1]=1&dividend_yield[0]=3&dividend_yield[1]=max&capital_adequacy_ratio[0]=50&capital_adequacy_ratio[1]=max&sales_cagr_3y[0]=2&sales_cagr_3y[1]=max&roe[0]=8&roe[1]=max\`;
};
`;

export const GITHUB_SETUP_STEPS = [
  {
    step: 1,
    title: 'リポジトリにコードをプッシュ',
    description: 'GitHubリポジトリ（port4rio/value）にプロジェクトコード一式をプッシュします。'
  },
  {
    step: 2,
    title: 'Pagesデプロイソースを「GitHub Actions」に設定',
    description: 'リポジトリの [Settings] > [Pages] > [Build and deployment] で [Source] を「GitHub Actions」に切り替えます。'
  },
  {
    step: 3,
    title: 'Actions書き込み権限の付与',
    description: '[Settings] > [Actions] > [General] > [Workflow permissions] で「Read and write permissions」を有効にして保存します。'
  },
  {
    step: 4,
    title: 'GEMINI_API_KEYの登録（土曜AI診断用）',
    description: '[Settings] > [Secrets and variables] > [Actions] に「GEMINI_API_KEY」を追加すれば、土曜9:07に無料枠で自動AI診断が行われます。'
  }
];

export const WORKFLOW_YML = DAILY_WORKFLOW_YML;
