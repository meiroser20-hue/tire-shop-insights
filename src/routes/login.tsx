import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { IconLock } from "@tabler/icons-react";
import { db } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { useRotating } from "@/lib/motion";
import bg from "@/assets/login-bg.jpg.asset.json";

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

const LINES = [
  "הנתונים שלך, בזמן אמת",
  "כל רכב, כל צמיג, כל שקל",
  "ניהול חכם מתחיל במידע נכון",
  "מה שנמדד — משתפר",
  "כל החלטה מגובה בנתונים",
];

const field =
  "h-[52px] w-full rounded-[14px] px-4 text-[15.5px] text-white outline-none transition-colors placeholder:text-white/45 focus:border-white/40";
const fieldStyle = {
  background: "rgba(255,255,255,.12)",
  border: "1px solid rgba(255,255,255,.2)",
};

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const { session } = useAuth();
  const line = useRotating(LINES);

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

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-5">
      <img
        src={bg.url}
        alt=""
        aria-hidden
        className="absolute inset-0 size-full object-cover"
        loading="eager"
      />
      <div
        className="absolute inset-0"
        style={{
          background: "linear-gradient(180deg, rgba(74,14,31,.55) 0%, rgba(74,14,31,.72) 100%)",
        }}
      />

      <div
        className="relative w-full max-w-[380px] px-8 py-10"
        style={{
          background: "rgba(255,255,255,.14)",
          backdropFilter: "blur(28px) saturate(160%)",
          border: "1px solid rgba(255,255,255,.22)",
          borderRadius: 26,
          boxShadow: "0 24px 60px rgba(0,0,0,.28)",
        }}
      >
        <div className="flex flex-col items-center">
          <div
            className="flex size-16 items-center justify-center rounded-full text-[17px] font-600 text-white"
            style={{ background: "linear-gradient(135deg,#6B1730 0%,#C42B4E 55%,#E03E5F 100%)" }}
          >
            ב״ד
          </div>
          <h1 className="mt-4 text-[22px] font-500 text-white">פנצ'ריית ברכת הדרך</h1>
          <p
            className="mt-1.5 h-[19px] text-[13px] transition-opacity duration-500"
            style={{ color: "rgba(255,255,255,.72)", opacity: line.visible ? 1 : 0 }}
          >
            {line.text}
          </p>
        </div>

        <form onSubmit={submit} className="mt-8 space-y-3">
          <input
            type="email"
            required
            dir="ltr"
            placeholder="אימייל"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={field}
            style={fieldStyle}
          />
          <input
            type="password"
            required
            placeholder="סיסמה"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={field}
            style={fieldStyle}
          />

          {error && <p className="text-[12.5px] text-white">{error}</p>}

          <button
            type="submit"
            disabled={busy}
            className="tap h-[52px] w-full rounded-[14px] text-[15.5px] font-500 text-white disabled:opacity-60"
            style={{ background: "linear-gradient(135deg,#6B1730 0%,#C42B4E 55%,#E03E5F 100%)" }}
          >
            {busy ? "רגע..." : "כניסה"}
          </button>
        </form>
      </div>

      <div
        className="absolute inset-x-0 bottom-5 flex items-center justify-center gap-1.5 text-[11px]"
        style={{ color: "rgba(255,255,255,.4)" }}
      >
        <IconLock size={12} stroke={1.5} />
        החיבור מוצפן ומאובטח · ברכת הדרך © 2026
      </div>
    </div>
  );
}
