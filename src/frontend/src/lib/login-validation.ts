export type LoginField = "username" | "password";
export type LoginFields = Partial<Record<LoginField, string>>;

export function validateLogin(username: string, password: string): {
  username: string;
  fields: LoginFields;
} {
  const trimmedUsername = username.trim();
  const fields: LoginFields = {};

  if (username.includes("\0") || !username.isWellFormed()) {
    fields.username = "Tên đăng nhập chứa ký tự không hợp lệ.";
  } else if (!trimmedUsername) {
    fields.username = "Vui lòng nhập tên đăng nhập.";
  } else if (Array.from(trimmedUsername).length > 64) {
    fields.username = "Tên đăng nhập tối đa 64 ký tự.";
  }

  // A01 giữ nguyên khoảng trắng và cách biểu diễn Unicode của mật khẩu.
  if (password.includes("\0") || !password.isWellFormed()) {
    fields.password = "Mật khẩu chứa ký tự không hợp lệ.";
  } else if (!password) {
    fields.password = "Vui lòng nhập mật khẩu.";
  } else if (Array.from(password).length > 256) {
    fields.password = "Mật khẩu tối đa 256 ký tự.";
  }

  return { username: trimmedUsername, fields };
}
