import { LoginForm } from "@/components/auth-form";

export const metadata = { title: "Đăng nhập · Poké Gacha Picker" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { registered } = await searchParams;
  return <LoginForm registeredUsername={typeof registered === "string" ? registered : undefined} />;
}
