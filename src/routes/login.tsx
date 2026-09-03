import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { IconLock } from "@tabler/icons-react";
import { db } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "כניסה · ברכת הדרך" },
      { name: "description", content: "כניסה למערכת הניהול של פנצ'ריית ברכת הדרך בנתניה." },
      { property: "og:title", content: "כניסה · ברכת הדרך" },
      { property: "og:description", content: "מערכת ניהול לפנצ'ריית משאיות ברכת הדרך." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Login,
});

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const navigate = useNavigate();
  const { session } = useAuth();

  useEffect(() => {
    if (session) navigate({ to: "/" });
  }, [session, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    const { error: err } = await db.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (err) {
      setError("האימייל או הסיסמה אינם נכונים. נסה שוב");
      return;
    }
    navigate({ to: "/" });
  };

  const reset = async () => {
    if (!email.trim()) {
      setError("הזן קודם את כתובת האימייל שלך");
      return;
    }
    await db.auth.resetPasswordForEmail(email.trim(), { redirectTo: window.location.origin });
    setError("");
    setSent(true);
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center bg-white px-6 pt-16">
      <div className="head-grad pointer-events-none absolute inset-x-0 top-0 h-[460px]" />
      <div className="relative flex w-full flex-col items-center">
        <div className="flex size-20 items-center justify-center rounded-full bg-white text-[15.5px] font-600 text-coral-700 shadow-[0_6px_20px_rgba(216,90,48,.15)]">
          ב״ד
        </div>
        <h1 className="mt-4 text-[21px] font-600 text-coral-900">ברכת הדרך</h1>
        <p className="mt-1 text-[12.5px] text-coral-800/70">מערכת ניהול</p>

        <form onSubmit={submit} className="mt-8 w-full max-w-sm space-y-3">
          <div>
            <label className="mb-1 block text-[12.5px] text-ink-2">אימייל</label>
            <input
              type="email"
              required
              dir="ltr"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-[52px] w-full rounded-[14px] border border-line bg-white px-4 text-[15.5px] text-ink outline-none focus:border-coral-400"
            />
          </div>
          <div>
            <label className="mb-1 block text-[12.5px] text-ink-2">סיסמה</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-[52px] w-full rounded-[14px] border border-line bg-white px-4 text-[15.5px] text-ink outline-none focus:border-coral-400"
            />
          </div>

          {error && <p className="text-[12.5px] text-down">{error}</p>}
          {sent && <p className="text-[12.5px] text-up">שלחנו לך מייל לאיפוס הסיסמה</p>}

          <button
            type="submit"
            disabled={busy}
            className="coral-grad h-[52px] w-full rounded-[14px] text-[15.5px] font-500 text-white disabled:opacity-60"
          >
            {busy ? "רגע..." : "כניסה"}
          </button>

          <button
            type="button"
            onClick={() => void reset()}
            className="w-full text-center text-[12.5px] text-coral-700"
          >
            שכחתי סיסמה
          </button>
        </form>
      </div>
      <div className="relative mt-auto flex items-center gap-1.5 py-6 text-[11px] text-ink-3">
        <IconLock size={13} stroke={1.5} />
        החיבור מוצפן ומאובטח · ברכת הדרך © 2026
      </div>
    </div>
  );
}
