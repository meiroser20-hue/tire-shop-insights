import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { IconLock } from "@tabler/icons-react";
import { db } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { useRotating } from "@/lib/motion";
import { LOGO_URL } from "@/lib/brand";
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
  "h-[50px] w-full rounded-full bg-transparent px-5 text-[15px] text-ink outline-none transition-[border-color,box-shadow] duration-200 placeholder:text-[rgba(107,23,48,.6)]";

const fieldStyle = { border: "1px solid rgba(147,32,64,.45)" };
const fieldFocus = {
  border: "1px solid rgba(196,43,78,.9)",
  boxShadow: "0 0 0 3px rgba(196,43,78,.10)",
};

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [focus, setFocus] = useState<"email" | "password" | null>(null);
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
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-5 py-12">
      <img
        src={bg.url}
        alt=""
        aria-hidden
        className="absolute inset-0 size-full object-cover"
        loading="eager"
      />
      {/* בלי צעיף על התמונה. רק הצללה עדינה בתחתית כדי שהשורה הלבנה תיקרא על כל רקע */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[120px]"
        style={{ background: "linear-gradient(180deg, transparent 0%, rgba(20,10,14,.30) 100%)" }}
      />

      <div className="relative w-full max-w-[400px]">
        {/* עיגול הלוגו — יושב על שפת הכרטיס */}
        <div
          className="absolute left-1/2 top-0 z-10 flex size-[92px] -translate-x-1/2 -translate-y-1/2 items-center justify-center overflow-hidden rounded-full"
          style={{
            background: "linear-gradient(160deg,#26272B 0%,#141518 100%)",
            border: "3px solid rgba(255,255,255,.92)",
            boxShadow: "0 12px 30px rgba(20,21,24,.30)",
          }}
        >
          <img
            src={LOGO_URL}
            alt="ברכת הדרך"
            className="size-full object-contain p-3"
            loading="eager"
          />
        </div>

        <div
          className="px-8 pb-8 pt-16"
          style={{
            background: "rgba(255,255,255,.68)",
            backdropFilter: "blur(7px) saturate(140%)",
            WebkitBackdropFilter: "blur(7px) saturate(140%)",
            border: "1px solid rgba(255,255,255,.85)",
            borderRadius: 30,
            boxShadow: "0 24px 70px rgba(74,14,31,.18)",
          }}
        >
          <div className="text-center">
            <h1 className="text-[21px] font-600 text-ink">פנצ'ריית ברכת הדרך</h1>
            <p
              className="mx-auto mt-1.5 h-[19px] text-[13px] text-ink-2 transition-opacity duration-500"
              style={{ opacity: line.visible ? 1 : 0 }}
            >
              {line.text}
            </p>
          </div>

          <form onSubmit={submit} className="mt-7 space-y-3">
            <input
              type="email"
              required
              placeholder="שם משתמש"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onFocus={() => setFocus("email")}
              onBlur={() => setFocus(null)}
              className={field}
              style={focus === "email" ? fieldFocus : fieldStyle}
            />
            <input
              type="password"
              required
              placeholder="סיסמה"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onFocus={() => setFocus("password")}
              onBlur={() => setFocus(null)}
              className={field}
              style={focus === "password" ? fieldFocus : fieldStyle}
            />

            {error && <p className="pt-0.5 text-[12.5px] text-red-700">{error}</p>}

            <button
              type="submit"
              disabled={busy}
              className="tap mt-1 h-[50px] w-full rounded-full text-[15.5px] font-500 text-white disabled:opacity-60"
              style={{
                background: "linear-gradient(135deg,#6B1730 0%,#C42B4E 55%,#E03E5F 100%)",
                boxShadow: "0 10px 24px rgba(196,43,78,.28)",
              }}
            >
              {busy ? "רגע..." : "כניסה"}
            </button>
          </form>
        </div>
      </div>

      <div
        className="absolute inset-x-0 bottom-5 flex items-center justify-center gap-1.5 text-[10.5px]"
        style={{
          color: "rgba(255,255,255,.78)",
          textShadow: "0 1px 3px rgba(0,0,0,.35)",
        }}
      >
        <IconLock size={12} stroke={1.5} />
        החיבור מוצפן ומאובטח · ברכת הדרך © 2026
      </div>
    </div>
  );
}
