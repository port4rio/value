export const DAILY_WORKFLOW_YML = `# .github/workflows/daily_screen.yml
# TradingView「割安高配当・高ROE・財務健全」日次自動スクリーニング＆GitHub Pages自動更新ワークフロー
name: Daily TradingView Stock Screener & Deploy

on:
  schedule:
    # 毎週月〜金曜日 日本時間 15:37 (UTC 06:37) 東京市場大引け(15:30)直後に自動スクリーニング
    - cron: '37 6 * * 1-5'
  workflow_dispatch: # GitHub Actions管理画面からいつでも手動実行可能

permissions:
  contents: write
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: false

jobs:
  screen-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - name: リポジトリをチェックアウト
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Python 3.10のセットアップ
        uses: actions/setup-python@v5
        with:
          python-version: '3.10'

      - name: Python依存ライブラリのインストール (tradingview-screener)
        run: |
          python -m pip install --upgrade pip
          pip install requests pandas tradingview-screener

      - name: TradingView日本株スクリーニング実行 (PER<=15, PBR<=1, ROE>=8%, 自己資本比率>=50%, 配当>=4%, 営業利益成長>=1%)
        run: python scripts/screener.py
        env:
          TZ: 'Asia/Tokyo'

      - name: 差分データをGitリポジトリに自動コミット＆プッシュ
        run: |
          git config --local user.email "github-actions[bot]@users.noreply.github.com"
          git config --local user.name "github-actions[bot]"
          mkdir -p public/data
          git add -A public/data
          if git diff --staged --quiet; then
            echo "本日のデータに変更はありませんでした。"
          else
            git commit -m "chore(data): TradingView割安高配当スクリーニング日次自動更新 [$(date +'%Y-%m-%d')]"
            git push
          fi

      - name: Node.js 20のセットアップ
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: 依存パッケージのインストール
        run: npm install

      - name: 静的サイトをビルド
        run: npm run build

      - name: GitHub Pages用アーティファクトのアップロード
        uses: actions/upload-pages-artifact@v3
        with:
          path: './dist'

      - name: GitHub Pagesに自動デプロイ
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

export const SCRAPER_SCRIPT = `# scripts/screener.py
"""
TradingView 日本株スクリーナー (Python / tradingview-screener)

スクリーニング条件:
- 日本株 (東証上場 普通株)
- 予想/実績 PER 15倍以下
- 実績 PBR 1倍以下
- ROE (自己資本利益率) 8%以上
- 自己資本比率 50%以上
- 配当利回り 4%以上
- 営業利益・利益成長率 1%以上
"""

import os
import sys
import json
import datetime
from pathlib import Path
import requests

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "public" / "data"
STOCKS_FILE = DATA_DIR / "stocks.json"
SNAPSHOTS_FILE = DATA_DIR / "snapshots.json"

def get_today_jst():
    utc_now = datetime.datetime.now(datetime.timezone.utc)
    jst_now = utc_now + datetime.timedelta(hours=9)
    return jst_now.strftime("%Y-%m-%d")

# [TradingView日本株スキャン処理実行...]
`;

export const GITHUB_SETUP_STEPS = [
  {
    step: 1,
    title: 'リポジトリに workflow とスクリプトをコミット',
    description: '`.github/workflows/daily_screen.yml` と `scripts/screener.py` をリポジトリにプッシュします。'
  },
  {
    step: 2,
    title: 'GitHub Pages の Build and deployment を設定',
    description: 'リポジトリの「Settings」>「Pages」を開き、Build and deployment の Source を「GitHub Actions」に設定します。'
  },
  {
    step: 3,
    title: 'Actions 権限（Read and write permissions）の確認',
    description: '「Settings」>「Actions」>「General」最下部の「Workflow permissions」を「Read and write permissions」にして Save します。'
  },
  {
    step: 4,
    title: 'Actions タブから手動実行で即座に初回反映',
    description: '「Actions」タブから「Daily TradingView Stock Screener & Deploy」を選択し「Run workflow」をクリックします。'
  }
];
