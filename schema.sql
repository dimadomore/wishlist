-- Wishlist bookings. Одна строка = один человек, занявший один подарок.
-- mode: 'full'  — дарит целиком (такой подарок закрыт для остальных)
--       'split' — скидывается (участников может быть много)

CREATE TABLE IF NOT EXISTS bookings (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id TEXT NOT NULL,
  name       TEXT NOT NULL,
  -- name в нижнем регистре, посчитанный в JS: встроенный lower() в SQLite
  -- работает только с латиницей и «Максим»/«максим» считает разными именами.
  name_key   TEXT NOT NULL,
  mode       TEXT NOT NULL CHECK (mode IN ('full', 'split')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Один человек не может занять один и тот же подарок дважды.
CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_product_name
  ON bookings (product_id, name_key);

CREATE INDEX IF NOT EXISTS idx_bookings_product
  ON bookings (product_id);
