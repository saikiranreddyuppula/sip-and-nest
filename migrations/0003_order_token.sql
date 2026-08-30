-- Order numbers are sequential (row id plus a fixed offset), so
-- /order/thanks?n=SN-1042 could be walked to read another customer's name,
-- pickup time, items and free-text note. Every order now carries an
-- unguessable token that the receipt URL must also present.
--
-- Existing rows are backfilled rather than grandfathered in: leaving them with
-- a NULL token would keep every order placed so far readable by anyone who can
-- count. Receipt links handed out before this migration stop working, which is
-- the right trade for a page that shows a real customer's details.
ALTER TABLE orders ADD COLUMN token TEXT;

UPDATE orders
SET token = lower(hex(randomblob(16)))
WHERE token IS NULL;
