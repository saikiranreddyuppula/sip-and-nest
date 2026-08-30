CREATE TABLE coffee_types (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  sizes_json TEXT NOT NULL,
  price_cents INTEGER NOT NULL,
  available INTEGER DEFAULT 1,
  sort_order INTEGER,
  featured INTEGER DEFAULT 0
);

CREATE TABLE orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  number TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  contact TEXT NOT NULL,
  pickup_at TEXT NOT NULL,
  notes TEXT,
  status TEXT DEFAULT 'received',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  coffee_type_id INTEGER NOT NULL,
  size TEXT NOT NULL,
  qty INTEGER NOT NULL,
  price_cents INTEGER NOT NULL,
  note TEXT,
  FOREIGN KEY (order_id) REFERENCES orders(id),
  FOREIGN KEY (coffee_type_id) REFERENCES coffee_types(id)
);

CREATE TABLE messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  contact TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

INSERT INTO coffee_types (slug, name, category, description, sizes_json, price_cents, available, sort_order, featured) VALUES
('house-espresso', 'House Espresso', 'coffee', 'The daily shot. Dark chocolate, a little citrus, no fuss.', '[{"label":"2oz","cents":350},{"label":"4oz","cents":400}]', 350, 1, 10, 1),
('oat-cortado', 'Oat Cortado', 'coffee', 'Equal parts espresso and steamed oat. Silky, short, the one we drink behind the bar.', '[{"label":"4.5oz","cents":450},{"label":"6oz","cents":500}]', 450, 1, 20, 1),
('honey-latte', 'Honey Latte', 'coffee', 'Wildflower honey folded into whole milk. Soft, floral, a little gold on top.', '[{"label":"8oz","cents":520},{"label":"12oz","cents":580}]', 520, 1, 30, 1),
('cardamom-nested-mocha', 'Cardamom Nested Mocha', 'coffee', 'House mocha, crushed cardamom, a pinch of salt. Named for the nest — spice tucked into chocolate.', '[{"label":"8oz","cents":580},{"label":"12oz","cents":640}]', 580, 1, 40, 0),
('rotating-pour-over', 'Rotating Pour Over', 'coffee', 'Single origin, V60, whatever landed this week. Ask at the counter for the origin.', '[{"label":"10oz","cents":550},{"label":"12oz","cents":600}]', 550, 1, 50, 0),
('peach-cold-brew', 'Peach Cold Brew', 'coffee', 'Overnight brew, white peach, a little acid. Summer in a glass even in January.', '[{"label":"12oz","cents":550},{"label":"16oz","cents":620}]', 550, 1, 60, 0),
('maple-oat-dirty', 'Maple Oat Dirty', 'coffee', 'Cold brew, oat, maple, a shot. For the walk to the El.', '[{"label":"12oz","cents":600},{"label":"16oz","cents":670}]', 600, 1, 70, 0),
('chamomile-steam', 'Chamomile Steam', 'tea', 'Caffeine-free. Chamomile, oat, honey. For the afternoon nest.', '[{"label":"8oz","cents":480},{"label":"12oz","cents":540}]', 480, 1, 80, 0),
('olive-oil-cake', 'Olive Oil Cake', 'pastry', 'A thick slice. Citrus, olive oil, a crack of salt. Baked in the morning.', '[{"label":"slice","cents":650}]', 650, 1, 90, 0),
('morning-bun', 'Morning Bun', 'pastry', 'Laminated, cinnamon sugar, orange zest. Goes with the cortado.', '[{"label":"one","cents":475}]', 475, 1, 100, 0);
