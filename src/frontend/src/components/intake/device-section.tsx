"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { ApiError } from "../../lib/api-client";
import type { ApiClient } from "../../lib/api-client";
import { ContractError } from "../../lib/contracts";
import type { Customer, Device, Product } from "../../lib/contracts";
import { deviceFields, hasFieldErrors, serialIssue } from "../../lib/intake-validation";
import type { IntakeFields } from "../../lib/intake-validation";
import { useRemote } from "../../hooks/use-remote";
import { ReadState } from "../ui/read-state";
import { FieldError, IntakeFailure, serverFields, uncertainWrite } from "./form-feedback";
import { ProductPicker } from "./product-picker";

export function DeviceSection({ api, customer, selected, onSelect }: {
  api: ApiClient;
  customer: Customer;
  selected: Device | null;
  onSelect: (device: Device | null) => void;
}) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("");
  const [page, setPage] = useState(1);
  const [filterError, setFilterError] = useState<string>();
  const [product, setProduct] = useState<Product | null>(null);
  const [serial, setSerial] = useState("");
  const [purchase, setPurchase] = useState("");
  const [busy, setBusy] = useState(false);
  const [uncertain, setUncertain] = useState<string | null>(null);
  const [fields, setFields] = useState<IntakeFields>({});
  const [error, setError] = useState<unknown>();
  const [notice, setNotice] = useState("");
  const generation = useRef(0);
  const writing = useRef(false);
  const serialInput = useRef<HTMLInputElement>(null);
  const purchaseInput = useRef<HTMLInputElement>(null);
  const filterInput = useRef<HTMLInputElement>(null);
  const load = useCallback(async () => {
    const value = await api.devices(customer.customer_id, { serial_no: filter || undefined, page, size: 10 });
    if (value.data.some(device => device.customer_id !== customer.customer_id)) throw new ContractError();
    return value;
  }, [api, customer.customer_id, filter, page]);
  const remote = useRemote(load);

  useEffect(() => () => { generation.current++; }, []);
  useEffect(() => {
    if (busy) return;
    if (fields.serial_no) serialInput.current?.focus();
    else if (fields.purchase_date) purchaseInput.current?.focus();
  }, [fields, busy]);

  function choose(device: Device) {
    if (device.customer_id !== customer.customer_id) {
      onSelect(null);
      setError(new ApiError(409, "DEVICE_OWNER_MISMATCH", "Thiết bị không thuộc về khách hàng được chọn."));
      return;
    }
    setError(undefined);
    setFields({});
    setNotice("");
    onSelect(device);
  }

  function applyFilter(event?: FormEvent) {
    event?.preventDefault();
    const issue = serialIssue(search);
    setFilterError(issue);
    if (issue) { filterInput.current?.focus(); return; }
    onSelect(null);
    setFilter(search.trim());
    setPage(1);
    remote.retry();
  }

  function showCreated(device: Device, message: string) {
    if (device.customer_id !== customer.customer_id) { choose(device); return; }
    choose(device);
    setNotice(message);
    setSearch(device.serial_no);
    setFilter(device.serial_no);
    setPage(1);
    setSerial("");
    setPurchase("");
    setUncertain(null);
    remote.retry();
  }

  async function create(event: FormEvent) {
    event.preventDefault();
    if (writing.current || uncertain) return;
    const validation = deviceFields(product?.product_id ?? null, serial, purchase);
    setFields(validation);
    if (hasFieldErrors(validation) || !product) return;
    const version = ++generation.current;
    writing.current = true;
    setBusy(true);
    setError(undefined);
    setNotice("");
    onSelect(null);
    try {
      const value = await api.createDevice(customer.customer_id, { product_id: product.product_id, serial_no: serial.trim(), purchase_date: purchase || null });
      if (generation.current !== version) return;
      showCreated(value, "Đã ghi nhận và chọn thiết bị.");
    } catch (error) {
      if (generation.current !== version) return;
      if (error instanceof ApiError && error.code === "SERIAL_ALREADY_EXISTS" && error.existingDevice?.customer_id === customer.customer_id) {
        showCreated(error.existingDevice, "Serial/IMEI đã tồn tại. Đã chọn thiết bị hiện có.");
      } else {
        setError(error);
        setFields(serverFields(error));
        if (uncertainWrite(error)) setUncertain(serial.trim());
      }
    } finally {
      if (generation.current === version) { writing.current = false; setBusy(false); }
    }
  }

  async function recover() {
    if (writing.current || !uncertain) return;
    const version = ++generation.current;
    writing.current = true;
    setBusy(true);
    setError(undefined);
    try {
      const value = await api.devices(customer.customer_id, { serial_no: uncertain, page: 1, size: 1 });
      if (generation.current !== version) return;
      if (value.data[0]?.customer_id === customer.customer_id) showCreated(value.data[0], "Đã tìm thấy và chọn thiết bị sau khi kiểm tra lại.");
      else {
        setUncertain(null);
        setNotice("Chưa tìm thấy thiết bị theo Serial/IMEI vừa gửi. Bạn có thể kiểm tra thông tin trước khi ghi nhận lại.");
      }
    } catch (error) { if (generation.current === version) setError(error); }
    finally { if (generation.current === version) { writing.current = false; setBusy(false); } }
  }

  return (
    <section aria-labelledby="device-heading">
      <h2 id="device-heading">02 · Thiết bị</h2>
      <p className="field-hint">Chủ sở hữu: {customer.full_name} · ID khách hàng #{customer.customer_id}</p>
      <form onSubmit={applyFilter} method="post" noValidate>
        <label htmlFor="device-filter">Tra cứu Serial / IMEI</label>
        <div className="input-action">
          <input id="device-filter" ref={filterInput} value={search} disabled={busy} onChange={event => setSearch(event.target.value)} aria-invalid={Boolean(filterError)} aria-describedby={filterError ? "device-filter-error" : undefined} />
          <button type="submit" className="secondary" disabled={busy}>Kiểm tra thiết bị</button>
        </div>
        <FieldError id="device-filter-error" message={filterError} />
        <button type="button" className="secondary" disabled={busy} onClick={() => { setSearch(""); setFilter(""); setPage(1); setFilterError(undefined); onSelect(null); remote.retry(); }}>Xem tất cả thiết bị</button>
      </form>
      <ReadState state={remote}>{value => <>
        {value.data.length ? <ul className="choices">{value.data.map(device => <li key={device.device_id}>
          <span>Serial/IMEI: {device.serial_no} · Ngày mua: {device.purchase_date ?? "Chưa có"} · {device.warranty_months} tháng</span>
          <button type="button" className="secondary" disabled={busy} aria-pressed={selected?.device_id === device.device_id} onClick={() => choose(device)}>Chọn thiết bị {device.serial_no}</button>
        </li>)}</ul> : <p className="empty">{value.meta.total > 0 ? "Không có thiết bị ở trang này." : filter ? "Không tìm thấy thiết bị theo Serial/IMEI này." : "Khách hàng chưa có thiết bị."}</p>}
        <div className="pagination" aria-label="Phân trang thiết bị">
          <button type="button" className="secondary" disabled={busy || page === 1} onClick={() => setPage(value => value - 1)}>Thiết bị trước</button>
          <span>Trang {value.meta.page} · {value.meta.total} thiết bị</span>
          <button type="button" className="secondary" disabled={busy || page * value.meta.size >= value.meta.total} onClick={() => setPage(value => value + 1)}>Thiết bị sau</button>
          {page > 1 && value.data.length === 0 && <button type="button" className="secondary" onClick={() => setPage(1)}>Về trang thiết bị đầu</button>}
        </div>
      </>}</ReadState>
      {selected && <div className="selected-device success" data-testid="selected-device">
        <p><strong>Đã chọn thiết bị {selected.serial_no}</strong></p>
        <p>Ngày mua: {selected.purchase_date ?? "Chưa có"} · Bảo hành: {selected.warranty_months} tháng</p>
        <button type="button" className="secondary" disabled={busy} onClick={() => onSelect(null)}>Bỏ chọn thiết bị</button>
      </div>}
      {notice && <p role="status" className="success">{notice}</p>}
      <h3>Ghi nhận thiết bị mới</h3>
      <form onSubmit={create} method="post" noValidate>
        <fieldset disabled={busy}>
          <ProductPicker api={api} selected={product} onSelect={setProduct} error={fields.product_id} disabled={busy} />
          <label htmlFor="device-serial">Serial / IMEI</label>
          <input id="device-serial" ref={serialInput} required value={serial} onChange={event => setSerial(event.target.value)} aria-invalid={Boolean(fields.serial_no)} aria-describedby={fields.serial_no ? "device-serial-error" : undefined} />
          <FieldError id="device-serial-error" message={fields.serial_no} />
          <label htmlFor="device-purchase">Ngày mua (có thể bỏ trống)</label>
          <input id="device-purchase" ref={purchaseInput} type="date" value={purchase} onChange={event => setPurchase(event.target.value)} aria-invalid={Boolean(fields.purchase_date)} aria-describedby={fields.purchase_date ? "device-purchase-error" : undefined} />
          <FieldError id="device-purchase-error" message={fields.purchase_date} />
          <button type="submit" disabled={Boolean(uncertain) || !product}>{busy ? "Đang lưu…" : "Ghi nhận thiết bị"}</button>
        </fieldset>
      </form>
      {error !== undefined && <IntakeFailure error={error} />}
      {uncertain && <div className="notice"><p>Chưa xác định được kết quả ghi nhận thiết bị. Hãy kiểm tra lại Serial/IMEI trước khi gửi thêm.</p>
        <button type="button" className="secondary" disabled={busy} onClick={() => void recover()}>Kiểm tra lại Serial/IMEI</button></div>}
    </section>
  );
}
