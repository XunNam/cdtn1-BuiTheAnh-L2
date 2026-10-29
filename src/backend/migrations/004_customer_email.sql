-- CSV-03 / TD-23: dependency dữ liệu khách hàng từ CSV, không đưa lên API/UI.
-- Không backfill, không UNIQUE và không thay đổi dữ liệu hiện có.
ALTER TABLE customer ADD COLUMN email TEXT NULL;
