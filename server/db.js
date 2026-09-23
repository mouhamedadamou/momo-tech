const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const dbDir = path.join(__dirname, '..', 'database');
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

const db = new Database(path.join(dbDir, 'momo-tech.db'));
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS orders (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    offer_id            TEXT NOT NULL,
    offer_label         TEXT NOT NULL,
    offer_category      TEXT NOT NULL,
    price               INTEGER NOT NULL,
    uid                 TEXT NOT NULL,
    player_name         TEXT,
    whatsapp            TEXT NOT NULL,
    email               TEXT,
    payment_method      TEXT NOT NULL,
    transaction_ref     TEXT NOT NULL,
    proof_filename      TEXT NOT NULL,
    proof_original_name TEXT,
    status              TEXT NOT NULL DEFAULT 'En attente',
    internal_note       TEXT DEFAULT '',
    created_at          TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at          TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
  CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at);
`);

module.exports = db;
