import type { Metadata } from "next";
import { headers } from "next/headers";
import { auth, isGoogleLoginConfigured } from "@/lib/auth/auth";
import { GENERIC_LOGIN_ERROR, LOGIN_ERROR_MESSAGES } from "@/lib/auth/loginPolicy";
import { safeReturnPath } from "@/lib/auth/redirect";
import { LoginCard } from "@/components/auth/LoginCard";

export const metadata: Metadata = { title: "Đăng nhập · Meridian" };

export default async function LoginPage(props: PageProps<"/login">) {
  const { error, from } = await props.searchParams;
  const session = await auth.api.getSession({ headers: await headers() });
  const errorCode = Array.isArray(error) ? error[0] : error;

  return (
    <main className="error-page">
      <LoginCard
        returnTo={safeReturnPath(from)}
        error={errorCode ? (LOGIN_ERROR_MESSAGES[errorCode] ?? GENERIC_LOGIN_ERROR) : null}
        signedInAs={session ? { name: session.user.name, email: session.user.email } : null}
        googleConfigured={isGoogleLoginConfigured}
      />
    </main>
  );
}
