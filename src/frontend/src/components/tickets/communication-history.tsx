import type { useCommunicationHistory } from "../../hooks/use-communication-history";
import { formatTimestamp } from "../../lib/date-time";
import { TicketReadError } from "./ticket-read-error";

export function CommunicationHistory({ history }: { history: ReturnType<typeof useCommunicationHistory> }) {
  return <section className="communication-history" aria-labelledby="history-heading">
    <h2 id="history-heading">Lịch sử trao đổi</h2>
    <p className="field-hint">Trao đổi cũ trước; thời điểm và người ghi do máy chủ cung cấp.</p>
    {history.loading ? <p role="status" className="notice">Đang tải lịch sử trao đổi…</p>
      : history.error ? <TicketReadError error={history.error} retry={() => void history.read(history.page).catch(() => {})} />
        : history.data && <>
          {history.data.data.length ? <ol className="communication-list" start={(history.page - 1) * history.data.meta.size + 1}>
            {history.data.data.map(message => <li key={message.communication_id} data-communication-id={message.communication_id}>
              <p>{message.content}</p><small><time dateTime={message.created_at}>{formatTimestamp(message.created_at)}</time> · Người ghi #{message.created_by}</small>
            </li>)}
          </ol> : <p className="empty">{history.data.meta.total === 0 ? "Phiếu chưa có trao đổi." : "Không có trao đổi ở trang này."}</p>}
          <div className="pagination" aria-label="Phân trang trao đổi">
            <button type="button" className="secondary" disabled={history.page === 1} onClick={() => void history.read(history.page - 1).catch(() => {})}>Trao đổi trước</button>
            <span>Trang {history.data.meta.page} · {history.data.meta.total} trao đổi</span>
            <button type="button" className="secondary" disabled={history.page * history.data.meta.size >= history.data.meta.total} onClick={() => void history.read(history.page + 1).catch(() => {})}>Trao đổi sau</button>
            <button type="button" className="secondary" onClick={() => void history.read(history.page).catch(() => {})}>Tải lại lịch sử</button>
          </div>
        </>}
  </section>;
}
