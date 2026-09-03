/**
 * מקור אחד ללוגו. כרגע הוא מתארח באתר הוורדפרס.
 * אם מעלים אותו כ-asset ב-Lovable — להחליף כאן בלבד:
 *   import logo from "@/assets/logo.png.asset.json";
 *   export const LOGO_URL = logo.url;
 */
export const LOGO_URL = "https://birkat-haderech.co.il/wp-content/uploads/2026/04/cropped-1.png";

/**
 * שמות תצוגה בעברית לחשבונות שהשם המלא שלהם בסופאבייס עדיין לטיני.
 * הפתרון הנכון הוא למלא full_name בטבלת profiles — אז אפשר למחוק את המפה.
 */
const HEBREW_NAMES: Record<string, string> = {
  galsalama2: "גל",
  galsalama: "גל",
};

const isLatin = (s: string) => /[A-Za-z0-9]/.test(s) && !/[\u0590-\u05FF]/.test(s);

/** שם פרטי להצגה בברכה. מחזיר null כשאין שם אמיתי — עדיף בלי שם מאשר שם שגוי. */
export function displayName(fullName?: string | null, email?: string | null): string | null {
  const raw = (fullName ?? "").trim();
  const handle = (email ?? "").split("@")[0]?.trim().toLowerCase() ?? "";

  /* שם עברי אמיתי מהמסד — תמיד מנצח */
  if (raw && !isLatin(raw)) return raw.split(/\s+/)[0] ?? null;

  /* אחרת, מיפוי זמני עד שהטבלה profiles תמולא */
  return HEBREW_NAMES[raw.toLowerCase()] ?? HEBREW_NAMES[handle] ?? null;
}
