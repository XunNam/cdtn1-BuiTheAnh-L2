"use client";

import { useCallback, useState } from "react";
import type { ApiClient } from "../../lib/api-client";
import type { Product } from "../../lib/contracts";
import { useRemote } from "../../hooks/use-remote";
import { ReadState } from "../ui/read-state";
import { FieldError } from "./form-feedback";

export function ProductPicker({ api, selected, onSelect, error, disabled }: {
  api: ApiClient;
  selected: Product | null;
  onSelect: (product: Product | null) => void;
  error?: string;
  disabled: boolean;
}) {
  const [page, setPage] = useState(1);
  const load = useCallback(() => api.products({ page, size: 20 }), [api, page]);
  const remote = useRemote(load);
  return (
    <div className="product-picker">
      <ReadState state={remote}>{value => <>
        <label htmlFor="device-product">Sản phẩm</label>
        <select id="device-product" required disabled={disabled || value.meta.total === 0} value={selected?.product_id ?? ""}
          aria-invalid={Boolean(error)} aria-describedby={error ? "device-product-error" : undefined}
          onChange={event => onSelect(value.data.find(product => String(product.product_id) === event.target.value)
            ?? (selected && String(selected.product_id) === event.target.value ? selected : null))}>
          <option value="">Chọn sản phẩm</option>
          {selected && !value.data.some(product => product.product_id === selected.product_id)
            && <option value={selected.product_id}>{selected.product_name} · {selected.warranty_months} tháng</option>}
          {value.data.map(product => <option key={product.product_id} value={product.product_id}>{product.product_name} · {product.warranty_months} tháng</option>)}
        </select>
        {value.meta.total === 0 && <p className="empty">Chưa có sản phẩm đang sử dụng để ghi nhận thiết bị.</p>}
        <div className="pagination" aria-label="Phân trang sản phẩm">
          <button type="button" className="secondary" disabled={disabled || page === 1} onClick={() => setPage(value => value - 1)}>Sản phẩm trước</button>
          <span>Trang {value.meta.page} · {value.meta.total} sản phẩm</span>
          <button type="button" className="secondary" disabled={disabled || page * value.meta.size >= value.meta.total} onClick={() => setPage(value => value + 1)}>Sản phẩm sau</button>
        </div>
      </>}</ReadState>
      <FieldError id="device-product-error" message={error} />
      {selected && <p className="field-hint">Đã chọn: {selected.product_name} · {selected.warranty_months} tháng bảo hành</p>}
    </div>
  );
}
