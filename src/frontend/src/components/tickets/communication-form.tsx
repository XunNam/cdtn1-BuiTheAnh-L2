"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import type { ApiClient } from "../../lib/api-client";
import { ContractError } from "../../lib/contracts";
import type { Communication } from "../../lib/contracts";
import { actionFieldIssue, actionTextIssue, uncertainAction } from "../../lib/ticket-action-validation";
import { formatTimestamp } from "../../lib/date-time";
import { FieldError } from "../intake/form-feedback";
import { ActionError } from "./action-error";

export function CommunicationForm({ api, id, onReadHistory }: { api: ApiClient; id: number; onReadHistory: () => Promise<unknown> }) {
  const [content, setContent] = useState("");
  const [phase, setPhase] = useState<"editing" | "submitting" | "saved" | "uncertain">("editing");
  const [saved, setSaved] = useState<Communication | null>(null);
  const [issue, setIssue] = useState<string>();
  const [error, setError] = useState<unknown>();
  const [sync, setSync] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const generation = useRef(0), writing = useRef(false), reading = useRef(false);
  const input = useRef<HTMLTextAreaElement>(null), feedback = useRef<HTMLDivElement>(null);
  useEffect(() => () => { generation.current++; }, []);
  useEffect(() => { if (issue) input.current?.focus(); else if (error !== undefined || phase === "saved" || phase === "uncertain") feedback.current?.focus(); }, [issue, error, phase]);

  async function readHistory() {
    if (reading.current) return;
    const version = ++generation.current;
    reading.current = true; setSync("loading");
    try { await onReadHistory(); if (generation.current === version) setSync("ready"); }
    catch { if (generation.current === version) setSync("error"); }
    finally { if (generation.current === version) reading.current = false; }
  }

  function newDraft() {
    if (reading.current || phase === "submitting") return;
    if (phase === "uncertain" && !window.confirm("Trao đổi vừa gửi có thể đã được lưu. Bạn đã đối chiếu lịch sử và muốn bắt đầu bản nhập mới?")) return;
    generation.current++; writing.current = false;
    setContent(""); setSaved(null); setError(undefined); setIssue(undefined); setPhase("editing"); setSync("idle");
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (writing.current || phase !== "editing") return;
    const validation = actionTextIssue(content, "content"); setIssue(validation);
    if (validation) return;
    const version = ++generation.current;
    writing.current = true; setPhase("submitting"); setError(undefined);
    try {
      const value = await api.communicate(id, content.trim());
      if (generation.current !== version) return;
      if (value.ticket_id !== id) throw new ContractError();
      setSaved(value); setContent(""); setPhase("saved");
    } catch (error) {
      if (generation.current !== version) return;
      if (uncertainAction(error)) setPhase("uncertain");
      else { writing.current = false; setPhase("editing"); setError(error); setIssue(actionFieldIssue(error, "content")); }
      return;
    }
    // POST đã xác nhận201; lỗi GET sau đây không được biến thành lỗi ghi.
    await readHistory();
  }

  return <section className="communication-form ticket-actions">
    <h2>Ghi nhận trao đổi</h2>
    {(phase === "editing" || phase === "submitting" || phase === "uncertain") && <form onSubmit={submit} method="post" noValidate>
      <fieldset disabled={phase !== "editing"}>
        <label htmlFor="communication-content">Nội dung trao đổi</label>
        <textarea id="communication-content" ref={input} required value={content} onChange={event => setContent(event.target.value)}
          aria-invalid={Boolean(issue)} aria-describedby={"communication-count" + (issue ? " communication-error" : "")} />
        <p className="field-hint" id="communication-count">{Array.from(content.trim()).length}/2000 ký tự sau khi bỏ khoảng trắng đầu/cuối</p>
        <FieldError id="communication-error" message={issue} />
        <button type="submit">{phase === "submitting" ? "Đang lưu…" : "Lưu trao đổi"}</button>
      </fieldset>
    </form>}
    <div ref={feedback} tabIndex={-1} className="action-feedback">
      {error !== undefined && <ActionError error={error} />}
      {saved && <div className="success" role="status" data-testid="communication-saved">
        <p><strong>Đã lưu trao đổi #{saved.communication_id}.</strong></p>
        <p className="preserve-lines">{saved.content}</p><p><time dateTime={saved.created_at}>{formatTimestamp(saved.created_at)}</time> · Người ghi #{saved.created_by}</p>
      </div>}
      {phase === "saved" && sync === "loading" && <p role="status">Đã lưu, đang tải lại lịch sử…</p>}
      {phase === "saved" && sync === "error" && <p role="alert" className="notice">Đã lưu trao đổi, chưa tải lại được lịch sử. Không cần lưu lại nội dung này.</p>}
      {phase === "saved" && <div className="intake-actions">
        {sync === "error" && <button type="button" className="secondary" onClick={() => void readHistory()}>Tải lại lịch sử đã lưu</button>}
        <button type="button" className="secondary" disabled={sync === "loading"} onClick={newDraft}>Ghi trao đổi tiếp</button>
      </div>}
      {phase === "uncertain" && <div className="notice" role="alert" data-testid="communication-uncertain">
        <p>Chưa xác định được kết quả lưu trao đổi. Nội dung có thể đã được lưu; không gửi lại bản nhập này.</p>
        <p>Kiểm tra lịch sử để đối chiếu trước khi ghi trao đổi khác.</p>
        {sync === "error" && <p>Chưa tải lại được lịch sử. Bạn có thể kiểm tra lại.</p>}
        <button type="button" className="secondary" disabled={sync === "loading"} onClick={() => void readHistory()}>{sync === "loading" ? "Đang kiểm tra…" : "Kiểm tra lịch sử"}</button>
        {sync === "ready" && <button type="button" className="secondary" onClick={newDraft}>Bắt đầu trao đổi mới</button>}
      </div>}
    </div>
  </section>;
}
