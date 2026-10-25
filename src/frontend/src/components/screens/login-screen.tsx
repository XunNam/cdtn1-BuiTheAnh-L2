"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { ApiError } from "../../lib/api-client";
import { ContractError } from "../../lib/contracts";
import { validateLogin } from "../../lib/login-validation";
import type { LoginField, LoginFields } from "../../lib/login-validation";
import { returnPath } from "../../lib/navigation";
import { useSession } from "../auth/session-provider";

export default function LoginScreen() {
  const { session, expired, requestedPath, login } = useSession();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [fields, setFields] = useState<LoginFields>({});
  const [failure, setFailure] = useState<{ message: string; retry: boolean } | null>(null);
  const usernameInput = useRef<HTMLInputElement>(null);
  const passwordInput = useRef<HTMLInputElement>(null);
  const errorSummary = useRef<HTMLDivElement>(null);
  const submitting = useRef(false);

  useEffect(() => {
    if (session) router.replace(returnPath(requestedPath, session.principal.role));
  }, [session, requestedPath, router]);

  useEffect(() => {
    if (!failure || busy) return;
    if (fields.username) usernameInput.current?.focus();
    else if (fields.password) passwordInput.current?.focus();
    else errorSummary.current?.focus();
  }, [failure, fields, busy]);

  function edit(field: LoginField, value: string) {
    if (field === "username") setUsername(value);
    else setPassword(value);
    setFields(previous => ({ ...previous, [field]: undefined }));
    setFailure(null);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (submitting.current) return;
    const validation = validateLogin(username, password);
    setFields(validation.fields);
    if (Object.keys(validation.fields).length) {
      setFailure({ message: "Vui lòng kiểm tra các trường được đánh dấu.", retry: false });
      return;
    }
    submitting.current = true;
    setBusy(true);
    setFailure(null);
    try {
      await login(validation.username, password);
      setPassword("");
      setVisible(false);
    } catch (error) {
      if (error instanceof ApiError && error.code === "STALE_REQUEST") return;
      if (error instanceof ApiError && error.status === 400) {
        setFields({ username: error.fields.username, password: error.fields.password });
        setFailure({ message: "Vui lòng kiểm tra thông tin đăng nhập.", retry: false });
      } else if (error instanceof ApiError && error.status === 401) {
        setFailure({ message: "Thông tin đăng nhập không hợp lệ. Vui lòng kiểm tra tên đăng nhập và mật khẩu.", retry: false });
      } else if (error instanceof ApiError && error.code === "AUTH_CAPACITY_REACHED") {
        setFailure({ message: "Hệ thống đã đạt giới hạn phiên đăng nhập. Vui lòng thử lại sau.", retry: true });
      } else if (error instanceof ApiError && (error.status === 0 || error.code === "BACKEND_UNAVAILABLE")) {
        setFailure({ message: "Không thể kết nối máy chủ. Vui lòng thử lại.", retry: true });
      } else if (error instanceof ContractError) {
        setFailure({ message: "Không thể đọc kết quả đăng nhập. Vui lòng thử lại.", retry: true });
      } else {
        setFailure({ message: "Máy chủ đang gặp sự cố. Vui lòng thử lại.", retry: true });
      }
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  if (session) return <p role="status" className="notice">Đang mở phiên làm việc…</p>;
  return (
    <section className="login">
      <p className="eyebrow">MEKONG / MOBILE</p>
      <h1>Mekong Mobile — Đăng nhập</h1>
      <p className="login-description">Sử dụng tài khoản được cấp cho trung tâm của bạn để tiếp nhận và quản lý yêu cầu bảo hành.</p>
      {expired && <p role="status" className="notice">Phiên làm việc đã hết hạn hoặc không còn hợp lệ. Vui lòng đăng nhập lại.</p>}
      {failure && <div ref={errorSummary} tabIndex={-1} role="alert" aria-label="Lỗi đăng nhập" className="error login-error">{failure.message}</div>}
      <form onSubmit={submit} method="post" noValidate aria-busy={busy}>
        <fieldset disabled={busy}>
          <div className="login-field">
            <label htmlFor="login-username">Tên đăng nhập</label>
            <input id="login-username" name="username" ref={usernameInput} autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck={false} required
              value={username} onChange={event => edit("username", event.target.value)} aria-invalid={Boolean(fields.username)}
              aria-describedby={fields.username ? "login-username-hint login-username-error" : "login-username-hint"} />
            <p id="login-username-hint" className="field-hint">Phân biệt chữ hoa và chữ thường.</p>
            {fields.username && <p id="login-username-error" className="field-error">{fields.username}</p>}
          </div>
          <div className="login-field">
            <label htmlFor="login-password">Mật khẩu</label>
            <div className="password-input">
              <input id="login-password" name="password" ref={passwordInput} type={visible ? "text" : "password"} autoComplete="current-password" autoCapitalize="none" autoCorrect="off" spellCheck={false} required
                value={password} onChange={event => edit("password", event.target.value)} aria-invalid={Boolean(fields.password)}
                aria-describedby={fields.password ? "login-password-error" : undefined} />
              <button type="button" className="secondary password-toggle" aria-controls="login-password" aria-pressed={visible}
                aria-label={visible ? "Ẩn mật khẩu" : "Hiện mật khẩu"} onClick={() => setVisible(value => !value)}>{visible ? "Ẩn" : "Hiện"}</button>
            </div>
            {fields.password && <p id="login-password-error" className="field-error">{fields.password}</p>}
          </div>
          <button type="submit" className="login-submit">{busy ? "Đang đăng nhập…" : failure?.retry ? "Thử lại" : "Đăng nhập"}</button>
        </fieldset>
      </form>
      {busy && <p role="status" className="field-hint">Đang kiểm tra thông tin đăng nhập…</p>}
    </section>
  );
}
