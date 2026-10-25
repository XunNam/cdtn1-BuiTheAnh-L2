"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { ApiError } from "../../lib/api-client";
import type { ApiClient } from "../../lib/api-client";
import { ContractError } from "../../lib/contracts";
import type { Customer, Device, Principal, Ticket } from "../../lib/contracts";
import { ticketFields, ticketPriority, ticketServerFields, uncertainTicketWrite } from "../../lib/ticket-validation";
import type { TicketFields } from "../../lib/ticket-validation";
import { useRemote } from "../../hooks/use-remote";
import { Failure, ReadState } from "../ui/read-state";
import { FieldError } from "./form-feedback";
import { WarrantyPreview } from "./warranty-preview";

export function ClassificationForm({ api, customer, device, principal, onPhase, onCreated, onCancel }: {
  api: ApiClient; customer: Customer; device: Device; principal: Principal;
  onPhase: (phase: "draft" | "submitting" | "uncertain") => void;
  onCreated: (ticket: Ticket) => void; onCancel: () => void;
}) {
  const loadCategories = useCallback(() => api.categories(), [api]);
  const loadWarranty = useCallback(async () => {
    const value = await api.warranty(device.device_id);
    if (value.device_id !== device.device_id) throw new ContractError();
    return value;
  }, [api, device.device_id]);
  const categories = useRemote(loadCategories);
  const warranty = useRemote(loadWarranty);
  const [issue, setIssue] = useState("");
  const [category, setCategory] = useState("");
  const [priority, setPriority] = useState("");
  const [fields, setFields] = useState<TicketFields>({});
  const [busy, setBusy] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [resourceChanged, setResourceChanged] = useState(false);
  const [error, setError] = useState<unknown>();
  const writing = useRef(false);
  const generation = useRef(0);
  const issueInput = useRef<HTMLTextAreaElement>(null);
  const categoryInput = useRef<HTMLSelectElement>(null);
  const priorityInput = useRef<HTMLSelectElement>(null);
  const errorBox = useRef<HTMLDivElement>(null);
  useEffect(() => () => { generation.current++; }, []);
  useEffect(() => {
    if (busy) return;
    if (fields.issue_desc) issueInput.current?.focus();
    else if (fields.category_id) categoryInput.current?.focus();
    else if (fields.priority) priorityInput.current?.focus();
    else if (error !== undefined || uncertain) errorBox.current?.focus();
  }, [fields, busy, error, uncertain]);

  const selectedCategory = categories.data?.find(value => String(value.category_id) === category);
  const selectedPriority = ticketPriority(priority);
  const ready = !categories.loading && !categories.error && Boolean(categories.data?.length) && !warranty.loading && !warranty.error && Boolean(warranty.data);

  function cancel() {
    if (writing.current || uncertain) return;
    if ((issue || category || priority) && !window.confirm("Bỏ thông tin phân loại đang nhập? Khách hàng và thiết bị đã lưu vẫn được giữ trong hệ thống.")) return;
    onCancel();
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (writing.current || uncertain || resourceChanged || !ready) return;
    const validation = ticketFields(issue, category, priority, categories.data ?? []);
    setFields(validation);
    if (Object.values(validation).some(Boolean) || !selectedCategory || !selectedPriority) return;
    const version = ++generation.current;
    writing.current = true;
    setBusy(true);
    setError(undefined);
    onPhase("submitting");
    try {
      const value = await api.createTicket({ customer_id: customer.customer_id, device_id: device.device_id,
        center_id: principal.active_center_id, issue_desc: issue.trim(), category_id: selectedCategory.category_id, priority: selectedPriority });
      if (generation.current !== version) return;
      if (value.customer_id !== customer.customer_id || value.device_id !== device.device_id || value.center_id !== principal.active_center_id) throw new ContractError();
      // Giữ khóa draft cho đến khi parent thay bằng receipt; không mở lại nút POST sau201.
      onCreated(value);
    } catch (error) {
      if (generation.current !== version) return;
      setError(error);
      setFields(ticketServerFields(error));
      if (uncertainTicketWrite(error)) {
        setUncertain(true);
        onPhase("uncertain");
      } else {
        if (error instanceof ApiError && (error.status === 404 || error.code === "DEVICE_OWNER_MISMATCH")) setResourceChanged(true);
        if (error instanceof ApiError && error.fields.category_id) categories.retry();
        writing.current = false;
        onPhase("draft");
      }
      setBusy(false);
    }
  }

  const displayError = error instanceof ApiError ? new ApiError(error.status, error.code, error.message) : error;
  return <div className="classification-form">
    <p>{customer.full_name} · {customer.phone} · Serial/IMEI: {device.serial_no}</p>
    <div className="warranty-region" role="region" aria-label="Kiểm tra bảo hành">
      <ReadState state={warranty}>{value => <WarrantyPreview value={value} />}</ReadState>
    </div>
    <form onSubmit={submit} method="post" noValidate>
      <fieldset disabled={busy || uncertain}>
        <label htmlFor="ticket-issue">Mô tả lỗi</label>
        <textarea id="ticket-issue" ref={issueInput} required value={issue} onChange={event => setIssue(event.target.value)}
          aria-invalid={Boolean(fields.issue_desc)} aria-describedby={"ticket-issue-count" + (fields.issue_desc ? " ticket-issue-error" : "")} />
        <p id="ticket-issue-count" className="field-hint">{Array.from(issue.trim()).length}/2000 ký tự sau khi bỏ khoảng trắng đầu/cuối</p>
        <FieldError id="ticket-issue-error" message={fields.issue_desc} />
        <div className="category-region">
          <label htmlFor="ticket-category">Nhóm sự cố</label>
          <ReadState state={categories}>{values => <>
            <select id="ticket-category" ref={categoryInput} required value={category} disabled={!values.length}
              onChange={event => setCategory(event.target.value)} aria-invalid={Boolean(fields.category_id)} aria-describedby={fields.category_id ? "ticket-category-error" : undefined}>
              <option value="">Chọn nhóm sự cố</option>
              {values.map(value => <option key={value.category_id} value={value.category_id}>{value.category_name}</option>)}
            </select>
            {!values.length && <div className="empty"><p>Chưa có nhóm sự cố đang sử dụng. Chưa thể tạo phiếu.</p><button type="button" className="secondary" onClick={categories.retry}>Tải lại nhóm sự cố</button></div>}
          </>}</ReadState>
          <FieldError id="ticket-category-error" message={fields.category_id} />
        </div>
        <label htmlFor="ticket-priority">Mức ưu tiên</label>
        <select id="ticket-priority" ref={priorityInput} required value={priority} onChange={event => setPriority(event.target.value)}
          aria-invalid={Boolean(fields.priority)} aria-describedby={"ticket-priority-hint" + (fields.priority ? " ticket-priority-error" : "")}>
          <option value="">Phải chọn mức ưu tiên</option>
          <option value="CAO">Cao — 24 giờ</option><option value="TRUNG_BINH">Trung bình — 72 giờ</option><option value="THAP">Thấp — 120 giờ</option>
        </select>
        <p id="ticket-priority-hint" className="field-hint">Hạn cam kết tính theo mức ưu tiên, chỉ tính thứ Hai đến thứ Bảy; hệ thống xác định khi tạo phiếu.</p>
        <FieldError id="ticket-priority-error" message={fields.priority} />
        <div className="intake-summary">
          <h3>Tóm tắt tiếp nhận</h3>
          <dl>
            <dt>Khách hàng</dt><dd>{customer.full_name} · {customer.phone}</dd>
            <dt>Thiết bị</dt><dd>{device.serial_no}</dd>
            <dt>Nhóm sự cố</dt><dd>{selectedCategory?.category_name ?? "Chưa chọn"}</dd>
            <dt>Mức ưu tiên</dt><dd>{selectedPriority === "CAO" ? "Cao" : selectedPriority === "TRUNG_BINH" ? "Trung bình" : selectedPriority === "THAP" ? "Thấp" : "Chưa chọn"}</dd>
            <dt>Trung tâm</dt><dd>#{principal.active_center_id}</dd>
            <dt>Người tiếp nhận</dt><dd>Nhân viên #{principal.employee_id}</dd>
            <dt>Thời điểm tiếp nhận</dt><dd>Được xác định khi tạo phiếu</dd>
            <dt>Hạn cam kết</dt><dd>Được xác định khi tạo phiếu</dd>
          </dl>
        </div>
        <div className="intake-actions">
          <button type="submit" disabled={!ready || resourceChanged}>{busy ? "Đang tạo phiếu…" : "Tạo phiếu bảo hành"}</button>
          <button type="button" className="secondary" onClick={cancel}>Hủy nhập</button>
        </div>
      </fieldset>
    </form>
    {(error !== undefined || uncertain) && <div ref={errorBox} tabIndex={-1} className="ticket-feedback">
      {error !== undefined && !uncertain && <Failure error={displayError} />}
      {resourceChanged && <p className="notice">Khách hàng hoặc thiết bị không còn phù hợp. Hãy chọn lại thông tin trước khi tạo phiếu; hệ thống không tự đổi chủ thiết bị.</p>}
      {uncertain && <div role="alert" className="notice" data-testid="ticket-uncertain">
        <p>Chưa xác định được kết quả tạo phiếu. Phiếu có thể đã được lưu; không gửi lại yêu cầu này để tránh tạo thêm phiếu.</p>
        <p>Hãy giữ thông tin đang nhập để đối chiếu. Nếu có ID phiếu, có thể mở để kiểm tra; hiện chưa có tra cứu phiếu theo bản nhập.</p>
        <Link href="/tickets">Mở phiếu bằng ID</Link>
      </div>}
    </div>}
  </div>;
}
