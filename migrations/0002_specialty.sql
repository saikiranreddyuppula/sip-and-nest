ALTER TABLE coffee_types ADD COLUMN image TEXT;

DELETE FROM order_items;
DELETE FROM coffee_types;

INSERT INTO coffee_types (slug, name, category, description, sizes_json, price_cents, available, sort_order, featured, image) VALUES
('espresso-martini', 'Espresso Martini', 'specialty', 'Vodka-style cafe cocktail. Espresso, foam, three beans.', '[{"label":"5oz","cents":1200}]', 1200, 1, 10, 1, '/img/espresso-martini.webp'),
('shaken-espresso', 'Brown Sugar Shaken Espresso', 'specialty', 'Iced, shaken, brown sugar.', '[{"label":"12oz","cents":650},{"label":"16oz","cents":720}]', 650, 1, 20, 1, '/img/shaken-espresso.webp'),
('pistachio-cortado', 'Pistachio Cortado', 'specialty', 'Short, pistachio foam.', '[{"label":"4.5oz","cents":550}]', 550, 1, 30, 0, '/img/pistachio-cortado.webp'),
('spanish-latte', 'Spanish Latte', 'coffee', 'Condensed milk, cinnamon.', '[{"label":"8oz","cents":550},{"label":"12oz","cents":620}]', 550, 1, 40, 0, '/img/spanish-latte.webp'),
('affogato', 'Affogato', 'specialty', 'Vanilla gelato, hot espresso.', '[{"label":"one","cents":700}]', 700, 1, 50, 0, '/img/affogato.webp'),
('espresso-tonic', 'Espresso Tonic', 'specialty', 'Tonic, espresso, citrus.', '[{"label":"12oz","cents":600}]', 600, 1, 60, 0, '/img/espresso-tonic.webp'),
('dirty-chai', 'Dirty Chai', 'coffee', 'Chai, espresso, cinnamon.', '[{"label":"8oz","cents":550},{"label":"12oz","cents":620}]', 550, 1, 70, 0, '/img/dirty-chai.webp'),
('tiramisu', 'Tiramisu', 'pastry', 'Cocoa, espresso-soaked.', '[{"label":"slice","cents":750}]', 750, 1, 80, 0, '/img/tiramisu.webp');
