CREATE INDEX idx_device_customer
    ON device (customer_id, device_id);

-- FR06/UC07, E09: cả phiếu chờ và đã duyệt; lọc quyền trước phân trang.
CREATE INDEX idx_ticket_approval_list
    ON ticket (center_id, approval_status, received_at, ticket_id)
    WHERE warranty_status = 'CHUA_XAC_MINH'
      AND deleted_at IS NULL;

-- QT-06: đọc lịch sử trạng thái của một phiếu theo thời gian.
CREATE INDEX idx_ticket_status_log_time
    ON ticket_status_log (ticket_id, changed_at, log_id);

-- QT-06: tối đa một log ban đầu; service transaction bảo đảm có log đó.
CREATE UNIQUE INDEX idx_ticket_initial_log
    ON ticket_status_log (ticket_id) WHERE from_status IS NULL;

-- FR08/UC06: đọc các lần trao đổi của một phiếu theo thời gian.
CREATE INDEX idx_ticket_communication_time
    ON ticket_communication (ticket_id, created_at, communication_id);

-- UNIQUE(phone) đã tạo index cho FR01/UC01/NFR01.
-- UNIQUE(serial_no) đã tạo index cho FR02/UC02.

CREATE SEQUENCE ticket_code_seq START WITH 1000000 MAXVALUE 999999999999;
