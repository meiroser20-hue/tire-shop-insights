import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { db, pub } from "./supabase";

export type Profile = { id: string; full_name: string | null; role: "owner" | "office" | string };

type AuthState = {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthState>({
  session: null,
  profile: null,
  loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    db.auth.getSession().then(({ data }) => {
      if (!alive) return;
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = db.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setLoading(false);
    });
    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session?.user) {
      setProfile(null);
      return;
    }
    let alive = true;
    pub
      .from("profiles")
      .select("id, full_name, role")
      .eq("id", session.user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!alive) return;
        setProfile(
          (data as Profile | null) ?? {
            id: session.user.id,
            full_name: session.user.email?.split("@")[0] ?? null,
            role: "owner",
          },
        );
      });
    return () => {
      alive = false;
    };
  }, [session]);

  const signOut = async () => {
    await db.auth.signOut();
    setProfile(null);
  };

  return <Ctx.Provider value={{ session, profile, loading, signOut }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
export const useCanSeeProfit = () => useAuth().profile?.role !== "office";
