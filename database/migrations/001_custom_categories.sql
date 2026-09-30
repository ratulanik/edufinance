-- Run once on an EXISTING edufinance database (fresh installs get this from schema.sql).
USE edufinance;

ALTER TABLE categories
    ADD COLUMN user_id INT NULL AFTER type,
    ADD UNIQUE KEY uniq_cat_user_name (user_id, name),
    ADD CONSTRAINT fk_categories_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
