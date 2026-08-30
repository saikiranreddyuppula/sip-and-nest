-- listOrderLines re-derived the drink name by joining order_items to
-- coffee_types, so removing a drink from the menu shrank every past receipt
-- that contained it and quietly reduced its total. Migration 0002 already
-- deleted the whole menu once. A receipt should be a record of what was
-- ordered, not a re-derivation from a menu that moves.
ALTER TABLE order_items ADD COLUMN name TEXT;

UPDATE order_items
SET name = (SELECT c.name FROM coffee_types c WHERE c.id = order_items.coffee_type_id)
WHERE name IS NULL;
