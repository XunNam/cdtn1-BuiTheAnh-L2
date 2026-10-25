"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { ApiError } from "../../lib/api-client";
import type { ApiClient } from "../../lib/api-client";
import type { Customer } from "../../lib/contracts";
import { customerFields, hasFieldErrors, normalizeIntakePhone } from "../../lib/intake-validation";
import type { IntakeFields } from "../../lib/intake-validation";
import { FieldError, IntakeFailure, serverFields, uncertainWrite } from "./form-feedback";

export function CustomerSection({ api, customer, onCustomer }: {
  api: ApiClient;
  customer: Customer | null;
  onCustomer: (customer: Customer | null) => void;
}) {
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [lookupBusy, setLookupBusy] = useState(false);
  const [creating, setCreating] = useState(false);
  const [empty, setEmpty] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [notice, setNotice] = useState("");
  const [fields, setFields] = useState<IntakeFields>({});
  const [error, setError] = useState<unknown>();
  const [measurement, setMeasurement] = useState({ version: 0, ms: "", result: "idle" });
  const generation = useRef(0);
  const lookupPending = useRef(false);
  const writing = useRef(false);
  const phoneInput = useRef<HTMLInputElement>(null);
  const nameInput = useRef<HTMLInputElement>(null);
  const addressInput = useRef<HTMLTextAreaElement>(null);

  useEffect(() => () => { generation.current++; }, []);
  useEffect(() => {
    if (creating || lookupBusy) return;
    if (fields.phone) phoneInput.current?.focus();
    else if (fields.full_name) nameInput.current?.focus();
    else if (fields.address) addressInput.current?.focus();
  }, [fields, creating, lookupBusy]);

  function editPhone(value: string) {
    if (writing.current) return;
    const version = ++generation.current;
    lookupPending.current = false;
    setLookupBusy(false);
    setPhone(value);
    setEmpty(false);
    setUncertain(false);
    setError(undefined);
    setFields({});
    setNotice("");
    setName("");
    setAddress("");
    setMeasurement({ version, ms: "", result: "idle" });
    onCustomer(null);
  }

  async function lookup(event?: FormEvent) {
    event?.preventDefault();
    if (lookupPending.current || writing.current) return;
    if (!normalizeIntakePhone(phone)) {
      setFields({ phone: "Số điện thoại không hợp lệ." });
      return;
    }
    const start = performance.now();
    const version = ++generation.current;
    lookupPending.current = true;
    setLookupBusy(true);
    setEmpty(false);
    setError(undefined);
    setFields({});
    setNotice("");
    setMeasurement({ version, ms: "", result: "idle" });
    onCustomer(null);
    let result = "idle";
    try {
      const value = await api.customer(phone);
      if (generation.current !== version) return;
      onCustomer(value);
      setUncertain(false);
      result = "found";
    } catch (error) {
      if (generation.current !== version) return;
      if (error instanceof ApiError && error.status === 404 && error.code === "CUSTOMER_NOT_FOUND") {
        setEmpty(true);
        setUncertain(false);
        result = "empty";
      } else {
        setError(error);
        setFields(serverFields(error));
      }
    } finally {
      if (generation.current === version) {
        lookupPending.current = false;
        setLookupBusy(false);
        setMeasurement({ version, ms: "", result });
        if (result !== "idle") requestAnimationFrame(() => requestAnimationFrame(() => {
          if (generation.current === version) setMeasurement({ version, result, ms: String(performance.now() - start) });
        }));
      }
    }
  }

  async function create(event: FormEvent) {
    event.preventDefault();
    if (writing.current || lookupPending.current || uncertain) return;
    const validation = customerFields(name, phone, address);
    setFields(validation);
    if (hasFieldErrors(validation)) return;
    const version = ++generation.current;
    writing.current = true;
    setCreating(true);
    setError(undefined);
    setNotice("");
    try {
      const value = await api.createCustomer({ full_name: name.trim(), phone, address: address.trim() });
      if (generation.current !== version) return;
      onCustomer(value);
      setEmpty(false);
      setMeasurement({ version, ms: "", result: "found" });
      setNotice("Đã tạo và chọn khách hàng.");
    } catch (error) {
      if (generation.current !== version) return;
      if (error instanceof ApiError && error.code === "PHONE_ALREADY_EXISTS" && error.existingCustomer) {
        onCustomer(error.existingCustomer);
        setEmpty(false);
        setMeasurement({ version, ms: "", result: "found" });
        setNotice("Số điện thoại đã có hồ sơ. Đã chọn hồ sơ hiện có.");
      } else {
        setError(error);
        setFields(serverFields(error));
        setUncertain(uncertainWrite(error));
      }
    } finally {
      if (generation.current === version) {
        writing.current = false;
        setCreating(false);
      }
    }
  }

  return (
    <section aria-labelledby="customer-heading">
      <h2 id="customer-heading">01 · Khách hàng</h2>
      <p className="field-hint">Tra cứu số điện thoại trước khi tạo hồ sơ mới.</p>
      <form onSubmit={lookup} method="post" noValidate>
        <label htmlFor="customer-phone">Số điện thoại tra cứu</label>
        <div className="input-action">
          <input id="customer-phone" name="phone" ref={phoneInput} type="tel" autoComplete="tel" required disabled={creating}
            value={phone} onChange={event => editPhone(event.target.value)} aria-invalid={Boolean(fields.phone)} aria-describedby={fields.phone ? "customer-phone-error" : undefined} />
          <button type="submit" disabled={lookupBusy || creating}>Tra cứu</button>
        </div>
        <FieldError id="customer-phone-error" message={fields.phone} />
      </form>
      <div data-testid="lookup-result" data-version={measurement.version} data-ms={measurement.ms} data-result={measurement.result}>
        {lookupBusy && <p role="status" className="notice">Đang tra cứu…</p>}
        {customer && <div className="success"><p>Đã tìm thấy: <strong>{customer.full_name}</strong> · {customer.phone}</p><p className="field-hint">ID khách hàng #{customer.customer_id} · {customer.address || "Chưa có địa chỉ"}</p></div>}
        {empty && <p className="empty">Không tìm thấy khách hàng. Có thể tạo hồ sơ mới bên dưới.</p>}
      </div>
      {notice && <p role="status" className="success">{notice}</p>}
      {error !== undefined && <IntakeFailure error={error} retry={!creating ? () => void lookup() : undefined} />}
      {uncertain && <p className="notice">Chưa xác định được kết quả tạo khách hàng. Hãy tra cứu lại số điện thoại trước khi gửi thêm.</p>}
      {empty && <form onSubmit={create} method="post" noValidate>
        <fieldset disabled={creating || lookupBusy}>
          <h3>Tạo khách hàng mới</h3>
          <label htmlFor="customer-name">Họ tên khách hàng mới</label>
          <input id="customer-name" ref={nameInput} autoComplete="name" required value={name} onChange={event => setName(event.target.value)} aria-invalid={Boolean(fields.full_name)} aria-describedby={fields.full_name ? "customer-name-error" : undefined} />
          <FieldError id="customer-name-error" message={fields.full_name} />
          <p>Số điện thoại: {phone}</p>
          <label htmlFor="customer-address">Địa chỉ (không bắt buộc)</label>
          <textarea id="customer-address" ref={addressInput} autoComplete="street-address" value={address} onChange={event => setAddress(event.target.value)} aria-invalid={Boolean(fields.address)} aria-describedby={fields.address ? "customer-address-error" : undefined} />
          <FieldError id="customer-address-error" message={fields.address} />
          <button type="submit" disabled={uncertain}>{creating ? "Đang lưu khách hàng…" : "Tạo khách hàng và chọn"}</button>
        </fieldset>
      </form>}
    </section>
  );
}
