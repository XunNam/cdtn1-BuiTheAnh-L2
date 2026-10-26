-- Chuyển đúng hai trung tâm của DEP-A đã tồn tại; không nhập dataset sáu trung tâm.
-- Giữ ID/tên để toàn bộ customer/ticket và membership tiếp tục trỏ cùng đơn vị.
CREATE TABLE service_center (
    center_id BIGINT PRIMARY KEY CHECK (center_id > 0),
    center_name VARCHAR(120) NOT NULL CHECK (btrim(center_name) <> ''),
    is_active BOOLEAN NOT NULL DEFAULT true
);

INSERT INTO service_center(center_id, center_name, is_active) VALUES
    (1, 'Trung tâm demo A', true),
    (2, 'Trung tâm demo B', true);

ALTER TABLE customer ADD CONSTRAINT fk_customer_center
    FOREIGN KEY (center_id) REFERENCES service_center(center_id) ON DELETE RESTRICT;
ALTER TABLE ticket ADD CONSTRAINT fk_ticket_center
    FOREIGN KEY (center_id) REFERENCES service_center(center_id) ON DELETE RESTRICT;
