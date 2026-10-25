-- Phase 1 approved DDL. Transaction owned by runner.
CREATE TABLE customer (
    customer_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    full_name   VARCHAR(120) NOT NULL CHECK (btrim(full_name) <> ''),
    phone       VARCHAR(20) NOT NULL UNIQUE,
    center_id   BIGINT NOT NULL CHECK (center_id > 0), -- Config DEP-A; không FK.
    address     VARCHAR(255), -- API E01/E02; Case Study mục 8, trang PDF 15.
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at  TIMESTAMPTZ,
    CONSTRAINT chk_customer_phone CHECK (phone ~ '^0[0-9]{9}$')
);

-- FR02/FR04 - UC02/UC04; QT-03, QT-05.
-- DD07: service lấy tháng bảo hành từ product config; không có DEFAULT ngầm.
-- purchase_date cho phép NULL để biểu diễn đúng ngoại lệ thiếu ngày mua.
CREATE TABLE device (
    device_id       BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    customer_id     BIGINT NOT NULL REFERENCES customer(customer_id)
                         ON DELETE RESTRICT,
    product_id      BIGINT NOT NULL CHECK (product_id > 0), -- Config; không FK.
    serial_no       VARCHAR(50) NOT NULL UNIQUE CHECK (btrim(serial_no) <> ''),
    purchase_date   DATE,
    warranty_months SMALLINT NOT NULL CHECK (warranty_months BETWEEN 0 AND 120),
    deleted_at      TIMESTAMPTZ
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
    -- DD08: số Unicode code point sau trim ECMAScript; xem phụ lục API mục 2.
    issue_desc      TEXT NOT NULL CHECK (
        char_length(btrim(issue_desc,
            U&'\0009\000A\000B\000C\000D\0020\00A0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200A\2028\2029\202F\205F\3000\FEFF')) BETWEEN 1 AND 2000
    ),
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
    -- Snapshot tại tiếp nhận theo E08/E10; không tính lại khi đọc/phê duyệt.
    -- DD05/DD06 đã chốt; service tính calendar/SLA, DB giữ kết quả lịch sử.
    assessed_on              DATE NOT NULL,
    purchase_date_snapshot   DATE,
    warranty_months_snapshot SMALLINT NOT NULL
        CHECK (warranty_months_snapshot BETWEEN 0 AND 120),
    warranty_expires_on      DATE,
    -- FR06; không dùng trạng thái vòng đời để biểu diễn phê duyệt.
    approval_status VARCHAR(20) NOT NULL
        CHECK (approval_status IN ('KHONG_CAN', 'CHO_PHE_DUYET',
                                   'DA_PHE_DUYET')),
    approved_by     BIGINT CHECK (approved_by > 0),
    approved_at     TIMESTAMPTZ,
    approval_note   VARCHAR(1000)
        CHECK (approval_note IS NULL OR btrim(approval_note) <> ''),
    deleted_at      TIMESTAMPTZ,
    CONSTRAINT chk_ticket_due CHECK (due_date > received_at),
    CONSTRAINT chk_ticket_approval_pair CHECK (
        (approved_by IS NULL AND approved_at IS NULL) OR
        (approved_by IS NOT NULL AND approved_at IS NOT NULL)
    ),
    CONSTRAINT chk_ticket_approval_time CHECK (
        approved_at IS NULL OR approved_at >= received_at
    ),
    CONSTRAINT chk_ticket_snapshot_presence CHECK (
        (purchase_date_snapshot IS NULL
         AND warranty_expires_on IS NULL
         AND warranty_status = 'CHUA_XAC_MINH') OR
        (purchase_date_snapshot IS NOT NULL
         AND warranty_expires_on IS NOT NULL
         AND warranty_status IN ('CON_BAO_HANH', 'HET_BAO_HANH'))
    ),
    CONSTRAINT chk_ticket_snapshot_dates CHECK (
        purchase_date_snapshot IS NULL OR
        (purchase_date_snapshot <= assessed_on
         AND warranty_expires_on >= purchase_date_snapshot)
    ),
    CONSTRAINT chk_ticket_approval_metadata CHECK (
        (approval_status = 'DA_PHE_DUYET'
         AND approved_by IS NOT NULL AND approved_at IS NOT NULL) OR
        (approval_status IN ('KHONG_CAN', 'CHO_PHE_DUYET')
         AND approved_by IS NULL AND approved_at IS NULL
         AND approval_note IS NULL)
    ),
    CONSTRAINT chk_ticket_warranty_approval CHECK (
        (warranty_status IN ('CON_BAO_HANH', 'HET_BAO_HANH')
         AND approval_status = 'KHONG_CAN') OR
        (warranty_status = 'CHUA_XAC_MINH'
         AND approval_status IN ('CHO_PHE_DUYET', 'DA_PHE_DUYET'))
    ),
    CONSTRAINT chk_ticket_assessment_result CHECK (
        warranty_status = 'CHUA_XAC_MINH' OR
        (warranty_status = 'CON_BAO_HANH' AND assessed_on <= warranty_expires_on) OR
        (warranty_status = 'HET_BAO_HANH' AND assessed_on > warranty_expires_on)
    )
);

-- Thiếu ngày mua có thể tạo CHO_PHE_DUYET rồi duyệt DA_PHE_DUYET, vẫn MOI.
-- Hết hạn là KHONG_CAN; được tiếp tục không có nghĩa còn bảo hành/miễn phí.
-- can_proceed được suy ra từ approval_status, không lưu thêm một boolean.

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
    content          TEXT NOT NULL CHECK (
        char_length(btrim(content,
            U&'\0009\000A\000B\000C\000D\0020\00A0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200A\2028\2029\202F\205F\3000\FEFF')) BETWEEN 1 AND 2000
    ),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by       BIGINT NOT NULL CHECK (created_by > 0)
);

-- FR02/UC02, E03: lọc theo khách và sắp xếp device_id.
