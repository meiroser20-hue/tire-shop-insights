import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Vat } from "./data";

type PrefsState = { vat: Vat; setVat: (v: Vat) => void };

const Ctx = createContext<PrefsState>({ vat: "net", setVat: () => {} });

export function PrefsProvider({ children }: { children: ReactNode }) {
  const [vat, setVatState] = useState<Vat>("net");

  useEffect(() => {
    const saved = localStorage.getItem("bd-vat");
    if (saved === "gross" || saved === "net") setVatState(saved);
  }, []);

  const setVat = (v: Vat) => {
    setVatState(v);
    localStorage.setItem("bd-vat", v);
  };

  return <Ctx.Provider value={{ vat, setVat }}>{children}</Ctx.Provider>;
}

export const usePrefs = () => useContext(Ctx);
