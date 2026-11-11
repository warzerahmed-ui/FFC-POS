-- ========================================================
-- Cloudflare D1 Database Schema for Fresh Chicken ERP & POS
-- ========================================================

-- 1. هەڵگرتنی داتای سیستەم بە شێوەی کلیل و وەشان (D1 Cloud State Sync)
CREATE TABLE IF NOT EXISTS app_state (
    state_key TEXT PRIMARY KEY,
    payload TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- 2. تۆمارکردن و سنووردارکردنی هەوڵە هەڵەکانی لۆگین (Rate Limiting)
CREATE TABLE IF NOT EXISTS login_attempts (
    ip TEXT NOT NULL,
    ts INTEGER NOT NULL
);
