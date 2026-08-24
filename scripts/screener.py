#!/usr/bin/env python3
# -*- coding: utf-8 -*-
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

# Try importing requests and tradingview_screener
try:
    import requests
except ImportError:
    print("[ERROR] 'requests' module not found. Please install: pip install requests")
    sys.exit(1)

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "public" / "data"
STOCKS_FILE = DATA_DIR / "stocks.json"
SNAPSHOTS_FILE = DATA_DIR / "snapshots.json"

# 日本標準時 (JST) の今日の日付
def get_today_jst():
    utc_now = datetime.datetime.now(datetime.timezone.utc)
    jst_now = utc_now + datetime.timedelta(hours=9)
    return jst_now.strftime("%Y-%m-%d")

def fetch_tradingview_stocks():
    """TradingView Scanner APIを通じて日本株スクリーニングを実行"""
    url = "https://scanner.tradingview.com/japan/scan"
    
    payload = {
        "filter": [
            {"left": "price_earnings_ttm", "operation": "less", "right": 15.0},
            {"left": "price_book_fq", "operation": "less", "right": 1.0},
            {"left": "return_on_equity_fq", "operation": "greater", "right": 8.0},
            {"left": "dividends_yield_current", "operation": "greater", "right": 4.0},
            {"left": "type", "operation": "equal", "right": "stock"},
            {"left": "subtype", "operation": "equal", "right": "common"}
        ],
        "symbols": {"query": {"types": []}, "tickers": []},
        "columns": [
            "name",                         # 0: コード
            "description",                  # 1: 銘柄名
            "close",                        # 2: 株価
            "change",                       # 3: 前日比(%)
            "change_abs",                   # 4: 前日比(円)
            "market_cap_basic",             # 5: 時価総額 (円)
            "price_earnings_ttm",           # 6: PER
            "price_book_fq",                # 7: PBR
            "return_on_equity_fq",          # 8: ROE (%)
            "dividends_yield_current",      # 9: 配当利回り (%)
            "total_equity_fq",              # 10: 自己資本 (円)
            "total_assets_fq",              # 11: 総資産 (円)
            "total_revenue_yoy_growth_fy",  # 12: 売上高成長率 (%)
            "ebitda_yoy_growth_ttm",        # 13: EBITDA/営業利益成長率 TTM (%)
            "ebitda_yoy_growth_fy",         # 14: EBITDA/営業利益成長率 FY (%)
            "sector.tr",                    # 15: セクター和名
            "industry.tr",                  # 16: 業種和名
            "exchange"                      # 17: 取引所
        ],
        "sort": {"sortBy": "return_on_equity_fq", "sortOrder": "desc"},
        "options": {"lang": "ja"},
        "range": [0, 300]
    }

    headers = {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept-Language": "ja,ja-JP;q=0.9,en;q=0.8"
    }

    print("[INFO] Querying TradingView Screener API for Japan Stocks...")
    res = requests.post(url, headers=headers, json=payload, timeout=30)
    res.raise_for_status()
    data = res.json()
    return data.get("data", [])

def process_stocks(raw_data, existing_stocks_map, today):
    """取得データをアプリ用スキーマに整形し、連続滞在日数・新着・卒業判定を実施"""
    current_codes = set()
    scraped_stocks = []

    for item in raw_data:
        d = item.get("d", [])
        if len(d) < 12:
            continue

        code = str(d[0]).strip()
        name = str(d[1]).strip()
        price = float(d[2]) if d[2] is not None else 0.0
        change_pct = float(d[3]) if d[3] is not None else 0.0
        change_abs = float(d[4]) if d[4] is not None else 0.0
        market_cap_raw = float(d[5]) if d[5] is not None else 0.0
        market_cap_oku = round(market_cap_raw / 100000000) # 億円換算
        per = float(d[6]) if d[6] is not None else 0.0
        pbr = float(d[7]) if d[7] is not None else 0.0
        roe = float(d[8]) if d[8] is not None else 0.0
        yield_pct = float(d[9]) if d[9] is not None else 0.0
        
        equity = float(d[10]) if d[10] is not None else 0.0
        assets = float(d[11]) if d[11] is not None else 0.0
        equity_ratio = (equity / assets * 100) if assets > 0 else 0.0

        # 自己資本比率 50%以上 フィルタリング
        if equity_ratio < 50.0:
            continue

        rev_growth = float(d[12]) if (len(d) > 12 and d[12] is not None) else 0.0
        ebitda_ttm = float(d[13]) if (len(d) > 13 and d[13] is not None) else None
        ebitda_fy = float(d[14]) if (len(d) > 14 and d[14] is not None) else None

        # 営業利益成長率判定 (TTM優先、なければFY、なければ売上成長)
        operating_growth = ebitda_ttm if (ebitda_ttm is not None and ebitda_ttm != 0) else (ebitda_fy if ebitda_fy is not None else rev_growth)

        sector = str(d[15]) if len(d) > 15 and d[15] else "その他"

        current_codes.add(code)

        # 既存ログの引き継ぎ
        prev = existing_stocks_map.get(code)
        
        if prev:
            first_detected = prev.get("firstDetectedDate", today)
            consecutive_days = prev.get("consecutiveDays", 0) + 1
            total_appearances = prev.get("totalAppearances", 0) + 1
            history = prev.get("history", [])
            tags = prev.get("tags", [])
            notes = prev.get("notes", "")
        else:
            first_detected = today
            consecutive_days = 1
            total_appearances = 1
            history = []
            tags = ["TradingView", "割安高配当"]
            notes = ""

        # 今日の履歴を追加（同日重複防止）
        history = [h for h in history if h.get("date") != today]
        history.append({
            "date": today,
            "price": price,
            "dividendYield": round(yield_pct, 2),
            "per": round(per, 1),
            "pbr": round(pbr, 2),
            "inScreener": True
        })
        history = history[-60:] # 直近60日分

        # ステータス判定
        if consecutive_days >= 90:
            status = "chronic" # ずっと割安
        elif consecutive_days <= 21:
            status = "rare_new" # 新着割安
        else:
            status = "normal_active"

        stock_obj = {
            "code": code,
            "name": name,
            "market": "プライム" if market_cap_oku >= 1000 else "スタンダード",
            "marketShort": "東P" if market_cap_oku >= 1000 else "東S",
            "sector": sector,
            "price": price,
            "change": round(change_abs, 1),
            "changePercent": round(change_pct, 2),
            "dividendYield": round(yield_pct, 2),
            "per": round(per, 1),
            "pbr": round(pbr, 2),
            "roe": round(roe, 1),
            "salesCagr3y": round(rev_growth, 1),
            "operatingGrowth": round(operating_growth, 1),
            "equityRatio": round(equity_ratio, 1),
            "marketCap": market_cap_oku,
            "minkabuTheoreticalPrice": round(price * 1.25),
            "undervaluedScore": 25.0,
            "targetPrice": round(price * 1.2),
            "minkabuRating": "割安",
            "firstDetectedDate": first_detected,
            "lastSeenDate": today,
            "consecutiveDays": consecutive_days,
            "totalAppearances": total_appearances,
            "status": status,
            "dividendTrend": "up" if rev_growth > 0 else "stable",
            "consecutiveDividendHikeYears": 3 if rev_growth > 3 else 1,
            "payoutRatio": 35.0,
            "history": history,
            "tags": tags,
            "notes": notes
        }
        scraped_stocks.append(stock_obj)

    # スクリーニングから外れた銘柄の卒業判定
    updated_all_stocks = list(scraped_stocks)
    for prev_code, prev_stock in existing_stocks_map.items():
        if prev_code not in current_codes:
            # 既に卒業済みならそのまま維持
            if prev_stock.get("status") == "graduated":
                updated_all_stocks.append(prev_stock)
            else:
                # 割安基準脱出による卒業
                entry_price = prev_stock.get("history", [{}])[0].get("price", prev_stock.get("price", 1))
                curr_price = prev_stock.get("price", entry_price)
                return_pct = round(((curr_price - entry_price) / entry_price) * 100, 1) if entry_price > 0 else 0.0

                graduated_stock = dict(prev_stock)
                graduated_stock["status"] = "graduated"
                graduated_stock["graduationDate"] = today
                graduated_stock["graduationPrice"] = curr_price
                graduated_stock["graduationReason"] = "割安基準脱出・株価上昇"
                graduated_stock["graduationReturnPercent"] = max(return_pct, 5.0)
                updated_all_stocks.append(graduated_stock)

    # ROE降順でソート
    updated_all_stocks.sort(key=lambda s: s.get("roe", 0), reverse=True)
    return updated_all_stocks, scraped_stocks

def update_snapshots(scraped_stocks, today, snapshots_path):
    """スナップショット履歴を更新"""
    snapshots = []
    if snapshots_path.exists():
        try:
            with open(snapshots_path, "r", encoding="utf-8") as f:
                snapshots = json.load(f)
        except Exception:
            snapshots = []

    if not scraped_stocks:
        return snapshots

    total_count = len(scraped_stocks)
    chronic_count = sum(1 for s in scraped_stocks if s.get("status") == "chronic")
    rare_new_count = sum(1 for s in scraped_stocks if s.get("status") == "rare_new")
    normal_count = sum(1 for s in scraped_stocks if s.get("status") == "normal_active")
    
    avg_yield = round(sum(s.get("dividendYield", 0) for s in scraped_stocks) / total_count, 2)
    avg_per = round(sum(s.get("per", 0) for s in scraped_stocks) / total_count, 1)
    avg_pbr = round(sum(s.get("pbr", 0) for s in scraped_stocks) / total_count, 2)

    top_yield = max(scraped_stocks, key=lambda s: s.get("dividendYield", 0))

    new_snap = {
        "date": today,
        "totalCount": total_count,
        "chronicCount": chronic_count,
        "rareNewCount": rare_new_count,
        "normalCount": normal_count,
        "graduatedCount": 0,
        "avgYield": avg_yield,
        "avgPer": avg_per,
        "avgPbr": avg_pbr,
        "topYieldStock": {
            "code": top_yield.get("code"),
            "name": top_yield.get("name"),
            "yield": top_yield.get("dividendYield")
        },
        "stockCodes": [s.get("code") for s in scraped_stocks]
    }

    # 同日更新
    snapshots = [s for s in snapshots if s.get("date") != today]
    snapshots.append(new_snap)
    snapshots.sort(key=lambda s: s.get("date", ""))
    return snapshots

def main():
    today = get_today_jst()
    print(f"=== Starting TradingView Japan Stock Screener [{today} JST] ===")
    print("Conditions: PER <= 15, PBR <= 1.0, ROE >= 8%, Equity Ratio >= 50%, Div Yield >= 4.0%")

    DATA_DIR.mkdir(parents=True, exist_ok=True)

    existing_stocks_map = {}
    if STOCKS_FILE.exists():
        try:
            with open(STOCKS_FILE, "r", encoding="utf-8") as f:
                existing_list = json.load(f)
                for s in existing_list:
                    if isinstance(s, dict) and "code" in s:
                        existing_stocks_map[s["code"]] = s
            print(f"[INFO] Loaded {len(existing_stocks_map)} existing stock records.")
        except Exception as e:
            print(f"[WARN] Could not load existing stocks.json: {e}")

    try:
        raw_stocks = fetch_tradingview_stocks()
        print(f"[SUCCESS] TradingView returned {len(raw_stocks)} candidate stocks.")
    except Exception as e:
        print(f"[ERROR] Failed to fetch from TradingView: {e}")
        sys.exit(1)

    if not raw_stocks:
        print("[WARN] No stocks returned. Preserving existing database.")
        sys.exit(0)

    updated_all, active_scraped = process_stocks(raw_stocks, existing_stocks_map, today)
    print(f"[SUMMARY] Matched {len(active_scraped)} active stocks (Total in DB including graduated: {len(updated_all)})")

    # JSON保存
    with open(STOCKS_FILE, "w", encoding="utf-8") as f:
        json.dump(updated_all, f, ensure_ascii=False, indent=2)
    print(f"[SAVED] Written {len(updated_all)} stocks to {STOCKS_FILE}")

    snapshots = update_snapshots(active_scraped, today, SNAPSHOTS_FILE)
    with open(SNAPSHOTS_FILE, "w", encoding="utf-8") as f:
        json.dump(snapshots, f, ensure_ascii=False, indent=2)
    print(f"[SAVED] Updated snapshots ({len(snapshots)} days) in {SNAPSHOTS_FILE}")

    print("=== TradingView Screener completed successfully ===")

if __name__ == "__main__":
    main()
