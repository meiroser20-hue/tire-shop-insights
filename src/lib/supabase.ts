import { createClient } from "@supabase/supabase-js";

const URL = "https://ufuzdyaeazjgefuntdvd.supabase.co";
const ANON = "sb_publishable_FAVbOQPFDZkgLs0d1UnBLQ_XdnPc_Cz";

/** Business data lives in the `priority` schema (read-only). */
export const db = createClient(URL, ANON, {
  db: { schema: "priority" },
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storageKey: "bd-auth",
  },
});

/** Same client, `public` schema — used for `profiles`. */
export const pub = db.schema("public");
