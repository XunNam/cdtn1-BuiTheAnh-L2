BEGIN;

-- FR01/FR07 - UC01/UC11; QT-01, QT-02, QT-13.
CREATE TABLE customer (
    customer_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    full_name   VARCHAR(120) NOT NULL CHECK (btrim(full_name) <> ''),
    phone       VARCHAR(20) NOT NULL UNIQUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at  TIMESTAMPTZ,
    CONSTRAINT chk_customer_phone CHECK (phone ~ '^0[0-9]{9}$')
);

-- FR02/FR04 - UC02/UC04; QT-03, QT-05.
-- Số tháng bảo hành được gán theo sản phẩm/dữ liệu mẫu khi ghi nhận.
-- purchase_date cho phép NULL để biểu diễn đúng ngoại lệ thiếu ngày mua.
CREATE TABLE device (
    device_id       BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    customer_id     BIGINT NOT NULL REFERENCES customer(customer_id)
                         ON DELETE RESTRICT,
    serial_no       VARCHAR(50) NOT NULL UNIQUE CHECK (btrim(serial_no) <> ''),
    purchase_date   DATE,
    warranty_months SMALLINT NOT NULL DEFAULT 12 CHECK (warranty_months >= 0)
);

-- FR03 - UC03; danh mục nhóm sự cố trong Case Study mục 8.
CREATE TABLE issue_category (
    category_id      INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    category_name    VARCHAR(60) NOT NULL UNIQUE
        CHECK (category_name IN ('MAN_HINH', 'PIN', 'SAC',
                                 'PHAN_MEM', 'NUOC_VAO', 'KHAC')),
    default_priority VARCHAR(10) NOT NULL
        CHECK (default_priority IN ('CAO', 'TRUNG_BINH', 'THAP')),
    is_active        BOOLEAN NOT NULL DEFAULT true
);

-- FR02-FR06 - UC02-UC05/UC07; QT-04, QT-05, QT-06, QT-13, QT-14.
-- category_id bắt buộc theo FR03 của BC T04

CREATE TABLE ticket (
    ticket_id       BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ticket_code     VARCHAR(20) NOT NULL UNIQUE CHECK (btrim(ticket_code) <> ''),
    device_id       BIGINT NOT NULL REFERENCES device(device_id)
                        ON DELETE RESTRICT,
    center_id       BIGINT NOT NULL CHECK (center_id > 0),
    received_by     BIGINT NOT NULL CHECK (received_by > 0),
    category_id     INTEGER NOT NULL REFERENCES issue_category(category_id)
                        ON DELETE RESTRICT,
    issue_desc      TEXT NOT NULL CHECK (btrim(issue_desc) <> ''),
    priority        VARCHAR(10) NOT NULL
        CHECK (priority IN ('CAO', 'TRUNG_BINH', 'THAP')),
    status          VARCHAR(20) NOT NULL DEFAULT 'MOI'
        CHECK (status IN ('MOI', 'DA_PHAN_CONG', 'DANG_XU_LY',
                          'CHO_LINH_KIEN', 'HOAN_TAT', 'DA_DONG', 'DA_HUY')),
    received_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    due_date        TIMESTAMPTZ NOT NULL,
    warranty_status VARCHAR(20) NOT NULL
        CHECK (warranty_status IN ('CON_BAO_HANH', 'HET_BAO_HANH',
                                   'CHUA_XAC_MINH')),
    approved_by     BIGINT CHECK (approved_by > 0),
    approved_at     TIMESTAMPTZ,
    deleted_at      TIMESTAMPTZ,
    CONSTRAINT chk_ticket_due CHECK (due_date > received_at),
    CONSTRAINT chk_ticket_approval_pair CHECK (
        (approved_by IS NULL AND approved_at IS NULL) OR
        (approved_by IS NOT NULL AND approved_at IS NOT NULL)
    ),
    CONSTRAINT chk_ticket_approval_time CHECK (
        approved_at IS NULL OR approved_at >= received_at
    )
);

-- QT-06; log ban đầu khi tạo phiếu: NULL -> MOI.
CREATE TABLE ticket_status_log (
    log_id      BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ticket_id   BIGINT NOT NULL REFERENCES ticket(ticket_id) ON DELETE RESTRICT,
    from_status VARCHAR(20)
        CHECK (from_status IN ('MOI', 'DA_PHAN_CONG', 'DANG_XU_LY',
                               'CHO_LINH_KIEN', 'HOAN_TAT', 'DA_DONG', 'DA_HUY')),
    to_status   VARCHAR(20) NOT NULL
        CHECK (to_status IN ('MOI', 'DA_PHAN_CONG', 'DANG_XU_LY',
                             'CHO_LINH_KIEN', 'HOAN_TAT', 'DA_DONG', 'DA_HUY')),
    changed_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    changed_by  BIGINT NOT NULL CHECK (changed_by > 0),
    note        VARCHAR(255),
    CONSTRAINT chk_log_initial CHECK (from_status IS NOT NULL OR to_status = 'MOI'),
    CONSTRAINT chk_log_change CHECK (from_status IS DISTINCT FROM to_status)
);

-- FR08 - UC06; Case Study mục 4 (phát biểu chị Lan).
-- Lịch sử trao đổi tách riêng khỏi lịch sử CHUYỂN TRẠNG THÁI.
CREATE TABLE ticket_communication (
    communication_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ticket_id        BIGINT NOT NULL REFERENCES ticket(ticket_id)
                         ON DELETE RESTRICT,
    content          TEXT NOT NULL CHECK (btrim(content) <> ''),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by       BIGINT NOT NULL CHECK (created_by > 0)
);

-- FR06/UC07: danh sách phiếu chưa xác minh, chưa duyệt, trong trung tâm.
CREATE INDEX idx_ticket_pending_approval
    ON ticket (center_id, received_at)
    WHERE warranty_status = 'CHUA_XAC_MINH'
      AND approved_at IS NULL AND deleted_at IS NULL;

-- QT-06: đọc lịch sử trạng thái của một phiếu theo thời gian.
CREATE INDEX idx_ticket_status_log_time
    ON ticket_status_log (ticket_id, changed_at);

-- FR08/UC06: đọc các lần trao đổi của một phiếu theo thời gian.
CREATE INDEX idx_ticket_communication_time
    ON ticket_communication (ticket_id, created_at);

-- UNIQUE(phone) đã tạo index cho FR01/UC01/NFR01.
-- UNIQUE(serial_no) đã tạo index cho FR02/UC02.


COMMIT;
