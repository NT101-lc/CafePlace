-- Menu categories become their own table so the owner can choose their display order,
-- and menu items get an optional image (stored in RustFS, only the key is kept here).

CREATE TABLE menu_categories (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    shop_id     BIGINT      NOT NULL REFERENCES shops (id),
    name        VARCHAR(50) NOT NULL,
    -- Display order: 0 first.
    sort_order  INT         NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_menu_categories_shop_name UNIQUE (shop_id, name),
    -- Lets menu_items reference (id, shop_id) below.
    CONSTRAINT uq_menu_categories_id_shop UNIQUE (id, shop_id)
);
CREATE INDEX idx_menu_categories_shop ON menu_categories (shop_id);

-- Existing free-text categories become rows, ordered alphabetically per shop.
INSERT INTO menu_categories (shop_id, name, sort_order)
SELECT shop_id, category, (ROW_NUMBER() OVER (PARTITION BY shop_id ORDER BY category) - 1)::INT
FROM (SELECT DISTINCT shop_id, category FROM menu_items WHERE category IS NOT NULL) AS existing;

ALTER TABLE menu_items ADD COLUMN category_id BIGINT;
UPDATE menu_items AS m
SET category_id = c.id
FROM menu_categories AS c
WHERE c.shop_id = m.shop_id AND c.name = m.category;
ALTER TABLE menu_items DROP COLUMN category;

-- The pair (category_id, shop_id) guarantees at database level that an item can only be in a
-- category of its own shop. NULL category_id = "no category".
ALTER TABLE menu_items
    ADD CONSTRAINT fk_menu_items_category
    FOREIGN KEY (category_id, shop_id) REFERENCES menu_categories (id, shop_id);
CREATE INDEX idx_menu_items_category ON menu_items (category_id);

-- Object key in the storage bucket, e.g. menu/12/2f1c...e9.webp. NULL = no image.
ALTER TABLE menu_items ADD COLUMN image_key VARCHAR(200);
