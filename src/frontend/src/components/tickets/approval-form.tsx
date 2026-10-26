"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { ApiError } from "../../lib/api-client";
import type { ApiClient } from "../../lib/api-client";
import type { Approval, Detail } from "../../lib/contracts";
import { actionFieldIssue, actionTextIssue, approvalApplicable, checkedApproval, uncertainAction } from "../../lib/ticket-action-validation";
import { FieldError } from "../intake/form-feedback";
import { ActionError } from "./action-error";

type Phase = "editing" | "submitting" | "saved" | "recovered" | "conflict" | "uncertain" | "blocked";
export function ApprovalForm({ api, ticket, onApproved, onReload }: {
  api: ApiClient; ticket: Detail; onApproved: (value: Approval) => void; onReload: () => Promise<Detail>;
}) {
  const [note, setNote] = useState("");
  const [phase, setPhase] = useState<Phase>("editing");
  const [issue, setIssue] = useState<string>();
  const [error, setError] = useState<unknown>();
  const [reading, setReading] = useState(false), [readFailed, setReadFailed] = useState(false);
  const [notice, setNotice] = useState("");
  const generation = useRef(0), writing = useRef(false), checking = useRef(false);
  const input = useRef<HTMLTextAreaElement>(null), feedback = useRef<HTMLDivElement>(null);
  useEffect(() => () => { generation.current++; }, []);
  useEffect(() => { if (issue) input.current?.focus(); else if (error !== undefined || notice || phase === "saved" || phase === "uncertain") feedback.current?.focus(); }, [issue, error, phase, notice]);

  async function reload(reason: Phase) {
    if (checking.current) return;
    const version = ++generation.current;
    checking.current = true; setReading(true); setReadFailed(false);
    try {
      const latest = await onReload();
      if (generation.current !== version) return;
      if (reason === "uncertain") {
        if (latest.approval_status === "DA_PHE_DUYET") { setPhase("recovered"); setNotice("Đã đối chiếu: phiếu đã được phê duyệt. Người duyệt và thời điểm hiển thị theo kết quả máy chủ."); }
        else if (approvalApplicable(latest)) { writing.current = false; setPhase("editing"); setNotice("Đã đọc lại: phiếu vẫn đang chờ phê duyệt. Hãy kiểm tra thông tin trước khi xác nhận."); }
        else { setPhase("blocked"); setNotice("Phiếu hiện không thuộc trường hợp được phê duyệt."); }
      }
    } catch { if (generation.current === version) setReadFailed(true); }
    finally { if (generation.current === version) { checking.current = false; setReading(false); } }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (writing.current || phase !== "editing" || !approvalApplicable(ticket)) return;
    const validation = actionTextIssue(note, "note"); setIssue(validation);
    if (validation) return;
    const version = ++generation.current;
    writing.current = true; setPhase("submitting"); setError(undefined); setNotice("");
    try {
      const value = checkedApproval(await api.approve(ticket.ticket_id, note.trim() || null), ticket.ticket_id);
      if (generation.current !== version) return;
      onApproved(value); setPhase("saved");
    } catch (error) {
      if (generation.current !== version) return;
      if (error instanceof ApiError && error.status === 409 && (error.code === "ALREADY_APPROVED" || error.code === "APPROVAL_NOT_APPLICABLE")) {
        setPhase("conflict"); setError(error); await reload("conflict");
      } else if (uncertainAction(error)) setPhase("uncertain");
      else {
        setError(error); setIssue(actionFieldIssue(error, "note"));
        if (error instanceof ApiError && (error.status === 403 || error.status === 404)) setPhase("blocked");
        else { writing.current = false; setPhase("editing"); }
      }
      return;
    }
    await reload("saved");
  }

  const applicable = approvalApplicable(ticket);
  return <section className="approval-form ticket-actions">
    <h2>Phê duyệt ngoại lệ</h2>
    {applicable && phase !== "saved" && phase !== "recovered" ? <form onSubmit={submit} method="post" noValidate>
      <fieldset disabled={phase !== "editing" || reading}>
        <label htmlFor="approval-note">Ghi chú phê duyệt (không bắt buộc)</label>
        <textarea id="approval-note" ref={input} value={note} onChange={event => setNote(event.target.value)} aria-invalid={Boolean(issue)} aria-describedby={"approval-count" + (issue ? " approval-error" : "")} />
        <p className="field-hint" id="approval-count">{Array.from(note.trim()).length}/1000 ký tự. Bỏ trống nếu không có ghi chú.</p>
        <FieldError id="approval-error" message={issue} />
        <button type="submit">{phase === "submitting" ? "Đang phê duyệt…" : "Phê duyệt cho phép xử lý"}</button>
      </fieldset>
    </form> : phase === "editing" && <p>Phiếu đã được phê duyệt hoặc không thuộc diện cần phê duyệt.</p>}
    <div ref={feedback} tabIndex={-1} className="action-feedback">
      {error !== undefined && <ActionError error={error} />}
      {phase === "saved" && <p role="status" className="success" data-testid="approval-saved">Đã phê duyệt phiếu thành công.</p>}
      {notice && <p role="status" className="notice">{notice}</p>}
      {phase === "uncertain" && <div role="alert" className="notice" data-testid="approval-uncertain">
        <p>Chưa xác định được kết quả phê duyệt. Hãy đọc lại phiếu trước khi thao tác tiếp; hệ thống không tự gửi lại yêu cầu.</p>
        <button type="button" className="secondary" disabled={reading} onClick={() => void reload("uncertain")}>{reading ? "Đang kiểm tra…" : "Kiểm tra kết quả phê duyệt"}</button>
      </div>}
      {readFailed && <div role="alert" className="notice">
        <p>{phase === "saved" ? "Đã phê duyệt, chưa tải lại được chi tiết phiếu." : "Chưa tải lại được trạng thái phê duyệt."}</p>
        {phase !== "uncertain" && <button type="button" className="secondary" disabled={reading} onClick={() => void reload(phase)}>Tải lại trạng thái phê duyệt</button>}
      </div>}
    </div>
  </section>;
}
