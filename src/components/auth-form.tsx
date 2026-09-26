"use client";

import Link from "next/link";
import { useActionState } from "react";
import { loginAction, registerAction, type AuthState } from "@/app/(auth)/actions";
import { Alert, Button, Card, Field, inputClass } from "./ui";

const INITIAL: AuthState = {};

export function LoginForm({ registeredUsername }: { registeredUsername?: string }) {
  const [state, action, pending] = useActionState(loginAction, INITIAL);
  const identifier = state.values?.identifier ?? registeredUsername ?? "";

  return (
    <Card className="p-6">
      <h2 className="mb-4 text-xl font-extrabold">Đăng nhập</h2>
      {registeredUsername && !state.error && (
        <div className="mb-4">
          <Alert tone="success">
            🎉 Tạo tài khoản <b>{registeredUsername}</b> thành công! Nhập mật khẩu để đăng nhập.
          </Alert>
        </div>
      )}
      <form action={action} className="flex flex-col gap-4">
        <Field label="Tên tài khoản hoặc email">
          <input
            key={identifier}
            name="identifier"
            required
            autoComplete="username"
            defaultValue={identifier}
            autoFocus={!identifier}
            className={inputClass}
          />
        </Field>
        <Field label="Mật khẩu">
          <input
            name="password"
            type="password"
            required
            autoComplete="current-password"
            autoFocus={!!identifier}
            className={inputClass}
          />
        </Field>
        {state.error && <Alert>{state.error}</Alert>}
        <Button type="submit" loading={pending} className="mt-1 py-3 text-lg">
          Đăng nhập
        </Button>
      </form>
      <p className="mt-5 text-center text-sm text-ink/60">
        Chưa có tài khoản?{" "}
        <Link href="/register" className="font-extrabold text-poke-blue hover:underline">
          Đăng ký ngay
        </Link>
      </p>
    </Card>
  );
}

export function RegisterForm() {
  const [state, action, pending] = useActionState(registerAction, INITIAL);
  const v = state.values ?? {};

  return (
    <Card className="p-6">
      <h2 className="mb-4 text-xl font-extrabold">Tạo tài khoản</h2>
      <form action={action} className="flex flex-col gap-4">
        <Field label="Tên tài khoản" hint="3–20 ký tự: chữ không dấu, số, _ . -">
          <input
            key={`u-${v.username ?? ""}`}
            name="username"
            required
            autoComplete="username"
            defaultValue={v.username}
            autoFocus
            className={inputClass}
            placeholder="ash_ketchum"
          />
        </Field>
        <Field label="Email (không bắt buộc)" hint="Có thể dùng email để đăng nhập">
          <input
            key={`e-${v.email ?? ""}`}
            name="email"
            type="email"
            autoComplete="email"
            defaultValue={v.email}
            className={inputClass}
            placeholder="ash@example.com"
          />
        </Field>
        <Field label="Mật khẩu" hint="Tối thiểu 6 ký tự">
          <input name="password" type="password" required minLength={6} autoComplete="new-password" className={inputClass} />
        </Field>
        <Field label="Nhập lại mật khẩu">
          <input name="confirm" type="password" required autoComplete="new-password" className={inputClass} />
        </Field>
        {state.error && <Alert>{state.error}</Alert>}
        <Button type="submit" loading={pending} className="mt-1 py-3 text-lg">
          Tạo tài khoản
        </Button>
      </form>
      <p className="mt-5 text-center text-sm text-ink/60">
        Đã có tài khoản?{" "}
        <Link href="/login" className="font-extrabold text-poke-blue hover:underline">
          Đăng nhập
        </Link>
      </p>
    </Card>
  );
}
