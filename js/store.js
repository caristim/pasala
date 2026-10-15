import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

export const DEMO = !SUPABASE_URL || !SUPABASE_ANON_KEY;
const LS = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const uid = () => crypto.randomUUID();

/* ---------- Backend local (demo) ---------- */
const local = {
  async init() {},
  async user() { return LS("pasala_user", null); },
  async signUp({ username }) { const u = { id: uid(), username: username || "yo" }; localStorage.setItem("pasala_user", JSON.stringify(u)); return u; },
  async signIn({ email }) { return this.signUp({ username: email.split("@")[0] }); },
  async signOut() { localStorage.removeItem("pasala_user"); },
  async list() {
    let recs = LS("pasala_recs", null);
    if (!recs) {
      const now = new Date().toISOString();
      recs = [
        { id: uid(), kind: "book", title: "Pedro Páramo", creator: "Juan Rulfo", year: 1955, rating: 5, comment: "Corto, raro y imposible de olvidar.", cover_url: "", created_at: now, username: "demo", likes: [] },
        { id: uid(), kind: "movie", title: "Whiplash", creator: "Damien Chazelle", year: 2014, rating: 5, comment: "Te deja sin uñas hasta el último minuto.", cover_url: "", created_at: now, username: "demo", likes: [] },
        { id: uid(), kind: "series", title: "Chernobyl", creator: "Craig Mazin", year: 2019, rating: 5, comment: "Cinco capítulos que valen por una temporada de cualquier otra.", cover_url: "", created_at: now, username: "demo", likes: [] },
      ];
      localStorage.setItem("pasala_recs", JSON.stringify(recs));
    }
    return recs;
  },
  async create(rec) {
    const u = await this.user(); const recs = LS("pasala_recs", []);
    recs.unshift({ ...rec, id: uid(), user_id: u.id, username: u.username, created_at: new Date().toISOString(), likes: [] });
    localStorage.setItem("pasala_recs", JSON.stringify(recs));
  },
  async toggleLike(id) {
    const u = await this.user(); const recs = LS("pasala_recs", []);
    const r = recs.find(x => x.id === id); if (!r) return;
    r.likes = r.likes.includes(u.id) ? r.likes.filter(x => x !== u.id) : [...r.likes, u.id];
    localStorage.setItem("pasala_recs", JSON.stringify(recs));
  },
  async remove(id) { localStorage.setItem("pasala_recs", JSON.stringify(LS("pasala_recs", []).filter(r => r.id !== id))); },
};

/* ---------- Backend Supabase ---------- */
let sb;
const remote = {
  async init() {
    const { createClient } = await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm");
    sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  },
  async user() {
    const { data } = await sb.auth.getUser();
    const u = data?.user; return u ? { id: u.id, username: u.user_metadata?.username || u.email.split("@")[0] } : null;
  },
  async signUp({ email, password, username }) {
    const { data, error } = await sb.auth.signUp({ email, password, options: { data: { username } } });
    if (error) throw error;
    if (!data.session) throw new Error("Revisá tu email para confirmar la cuenta y después ingresá.");
    return this.user();
  },
  async signIn({ email, password }) {
    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) throw error; return this.user();
  },
  async signOut() { await sb.auth.signOut(); },
  async list() {
    const [recs, profs, likes] = await Promise.all([
      sb.from("recommendations").select("*").order("created_at", { ascending: false }).limit(100),
      sb.from("profiles").select("id,username"),
      sb.from("likes").select("rec_id,user_id"),
    ]);
    for (const r of [recs, profs, likes]) {
      if (r.error) { console.error("Error Supabase:", r.error); throw new Error(r.error.message); }
    }
    const names = Object.fromEntries(profs.data.map(p => [p.id, p.username]));
    return recs.data.map(r => ({
      ...r,
      username: names[r.user_id] || "anónimo",
      likes: likes.data.filter(l => l.rec_id === r.id).map(l => l.user_id),
    }));
  },
  async create(rec) {
    const u = await this.user();
    const { error } = await sb.from("recommendations").insert({ ...rec, user_id: u.id });
    if (error) throw error;
  },
  async toggleLike(id) {
    const u = await this.user();
    const { data } = await sb.from("likes").select("rec_id").eq("rec_id", id).eq("user_id", u.id);
    if (data?.length) await sb.from("likes").delete().eq("rec_id", id).eq("user_id", u.id);
    else await sb.from("likes").insert({ rec_id: id, user_id: u.id });
  },
  async remove(id) { const { error } = await sb.from("recommendations").delete().eq("id", id); if (error) throw error; },
};

export const store = DEMO ? local : remote;
