"use client";

import { useState, type FormEvent } from "react";
import { postJson } from "@/lib/client";
import { LogoutButton } from "./logout-button";
import { Alert, Button, Card, Field, inputClass } from "./ui";

type Msg = { tone: "error" | "success"; text: string } | null;

export function SettingsForms({ username, email, createdAt }: { username: string; email: string | null; createdAt: string }) {
  const [currentEmail, setCurrentEmail] = useState(email ?? "");
  const [emailMsg, setEmailMsg] = useState<Msg>(null);
  const [pwMsg, setPwMsg] = useState<Msg>(null);
  const [savingEmail, setSavingEmail] = useState(false);
  const [savingPw, setSavingPw] = useState(false);

  async function saveEmail(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSavingEmail(true);
    setEmailMsg(null);
    try {
      const res = await postJson<{ email: string | null }>("/api/account/email", { email: currentEmail });
      setCurrentEmail(res.email ?? "");
      setEmailMsg({ tone: "success", text: res.email ? "Đã cập nhật email" : "Đã xóa email" });
    } catch (err) {
      setEmailMsg({ tone: "error", text: (err as Error).message });
    } finally {
      setSavingEmail(false);
    }
  }

  async function savePassword(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    const newPassword = String(f.get("newPassword"));
    if (newPassword !== String(f.get("confirm"))) {
      setPwMsg({ tone: "error", text: "Mật khẩu mới nhập lại không khớp" });
      return;
    }
    setSavingPw(true);
    setPwMsg(null);
    try {
      await postJson("/api/account/password", { currentPassword: String(f.get("currentPassword")), newPassword });
      form.reset();
      setPwMsg({ tone: "success", text: "Đã đổi mật khẩu" });
    } catch (err) {
      setPwMsg({ tone: "error", text: (err as Error).message });
    } finally {
      setSavingPw(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-5">
      <h1 className="text-3xl font-black">⚙️ Cài đặt tài khoản</h1>

      <Card>
        <h2 className="mb-3 text-lg font-extrabold">Thông tin</h2>
        <dl className="grid grid-cols-[120px_1fr] gap-y-2 text-sm">
          <dt className="text-ink/50">Tên tài khoản</dt>
          <dd className="font-bold">{username}</dd>
          <dt className="text-ink/50">Ngày tạo</dt>
          <dd className="font-bold">{new Date(createdAt).toLocaleDateString("vi-VN")}</dd>
        </dl>
      </Card>

      <Card>
        <h2 className="mb-3 text-lg font-extrabold">Email</h2>
        <form onSubmit={saveEmail} className="flex flex-col gap-3">
          <Field label="Email (không bắt buộc)" hint="Để trống rồi lưu để xóa email. Có thể dùng email để đăng nhập.">
            <input type="email" value={currentEmail} onChange={(e) => setCurrentEmail(e.target.value)} className={inputClass} />
          </Field>
          {emailMsg && <Alert tone={emailMsg.tone}>{emailMsg.text}</Alert>}
          <Button type="submit" variant="secondary" loading={savingEmail} className="self-start">
            Lưu email
          </Button>
        </form>
      </Card>

      <Card>
        <h2 className="mb-3 text-lg font-extrabold">Đổi mật khẩu</h2>
        <form onSubmit={savePassword} className="flex flex-col gap-3">
          <Field label="Mật khẩu hiện tại">
            <input name="currentPassword" type="password" required autoComplete="current-password" className={inputClass} />
          </Field>
          <Field label="Mật khẩu mới" hint="Tối thiểu 6 ký tự">
            <input name="newPassword" type="password" required minLength={6} autoComplete="new-password" className={inputClass} />
          </Field>
          <Field label="Nhập lại mật khẩu mới">
            <input name="confirm" type="password" required autoComplete="new-password" className={inputClass} />
          </Field>
          {pwMsg && <Alert tone={pwMsg.tone}>{pwMsg.text}</Alert>}
          <Button type="submit" variant="secondary" loading={savingPw} className="self-start">
            Đổi mật khẩu
          </Button>
        </form>
      </Card>

      <Card className="flex items-center justify-between">
        <p className="text-sm text-ink/60">Đăng xuất khỏi thiết bị này</p>
        <LogoutButton className="border-2 border-ink/10" />
      </Card>
    </div>
  );
}
