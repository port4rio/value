import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../public/data');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// 実際のスクリーニング結果データセット（ROE降順）
import { INITIAL_STOCKS, MOCK_SNAPSHOTS } from '../src/data/mockStocks.ts';

const STOCKS_FILE = path.join(DATA_DIR, 'stocks.json');
const SNAPSHOTS_FILE = path.join(DATA_DIR, 'snapshots.json');

fs.writeFileSync(STOCKS_FILE, JSON.stringify(INITIAL_STOCKS, null, 2), 'utf-8');
fs.writeFileSync(SNAPSHOTS_FILE, JSON.stringify(MOCK_SNAPSHOTS, null, 2), 'utf-8');

console.log(`Successfully seeded ${INITIAL_STOCKS.length} screening stocks to ${DATA_DIR}`);
