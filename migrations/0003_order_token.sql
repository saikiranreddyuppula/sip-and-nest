-- Order numbers are sequential (id + offset), so /order/thanks?n=SN-1042 could be
-- walked to read another customer's name, items and free-text note. New orders
-- carry an unguessable token that the receipt URL must also present.
ALTER TABLE orders ADD COLUMN token TEXT;
