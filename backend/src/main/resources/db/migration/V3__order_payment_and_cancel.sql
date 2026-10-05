-- Orders are paid at the counter when created: record how, and when an order was cancelled.

ALTER TABLE orders
    ADD COLUMN payment_method VARCHAR(20) NOT NULL DEFAULT 'CASH'
        CHECK (payment_method IN ('CASH', 'TRANSFER'));

ALTER TABLE orders ADD COLUMN cancelled_at TIMESTAMPTZ;

-- Reports and the daily order list filter by shop, status and time.
CREATE INDEX idx_orders_shop_status_created ON orders (shop_id, status, created_at);
