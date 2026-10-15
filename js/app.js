import { store, DEMO } from "./store.js";

const $ = (s) => document.querySelector(s);
const KINDS = { book: "Libro", movie: "Película", series: "Serie" };
const state = { user: null, recs: [], kind: "all", q: "", signup: false };

const esc = (s = "") => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const safeUrl = (u) => /^https?:\/\//i.test(u || "") ? u : "";
const stars = (n) => "★".repeat(n) + "☆".repeat(5 - n);

function toast(msg) {
  const t = $("#toast"); t.textContent = msg; t.hidden = false;
  clearTimeout(toast.t); toast.t = setTimeout(() => (t.hidden = true), 9000);
}

function render() {
  const q = state.q.trim().toLowerCase();
  const list = state.recs.filter(r =>
    (state.kind === "all" || r.kind === state.kind) &&
    (!q || `${r.title} ${r.creator || ""}`.toLowerCase().includes(q)));
  $("#feed").innerHTML = list.length ? list.map(card).join("") :
    `<p class="empty">Todavía no hay nada acá. Tocá + y recomendá lo primero.</p>`;
  $("#btn-account").textContent = state.user ? `${state.user.username} · salir` : "Ingresar";
}

function card(r) {
  const cover = safeUrl(r.cover_url)
    ? `<img class="cover" src="${esc(r.cover_url)}" alt="" loading="lazy" referrerpolicy="no-referrer">`
    : `<div class="cover" aria-hidden="true">${esc(r.title[0] || "?")}</div>`;
  const liked = state.user && r.likes.includes(state.user.id);
  const mine = state.user && r.user_id === state.user.id;
  const meta = [r.creator, r.year].filter(Boolean).map(esc).join(", ");
  return `<article class="card ${r.kind}" data-id="${r.id}">
    ${cover}
    <div>
      <h3>${esc(r.title)}</h3>
      <p class="meta"><span class="kind">${KINDS[r.kind]}</span>${meta ? " de " + meta : ""}</p>
      <div class="stars-ro" aria-label="${r.rating} de 5">${stars(r.rating)}</div>
      <p class="comment">${esc(r.comment)}</p>
      <div class="foot">
        <span>por ${esc(r.username)}</span>
        <button class="like ${liked ? "on" : ""}" data-act="like" type="button" aria-pressed="${!!liked}">♥ ${r.likes.length}</button>
        ${mine ? `<button class="del" data-act="del" type="button">Borrar</button>` : ""}
      </div>
    </div></article>`;
}

async function load() {
  try { state.recs = await store.list(); } catch (e) { console.error(e); toast("No se pudo cargar: " + e.message); }
  render();
}

function needLogin() {
  if (state.user) return false;
  openAuth(false); return true;
}

function openAuth(signup) {
  state.signup = signup;
  $("#auth-title").textContent = signup ? "Crear cuenta" : "Ingresar";
  $("#auth-submit").textContent = signup ? "Crear cuenta" : "Ingresar";
  $("#auth-toggle").textContent = signup ? "¿Ya tenés cuenta? Ingresá" : "¿No tenés cuenta? Creala";
  $("#auth-name-wrap").hidden = !signup;
  $("#auth-err").hidden = true;
  if (!$("#dlg-auth").open) $("#dlg-auth").showModal();
}

function setupStars(value = 5) {
  const box = $("#stars"); box.innerHTML = "";
  for (let i = 1; i <= 5; i++) {
    const b = document.createElement("button");
    b.type = "button"; b.textContent = "★"; b.setAttribute("aria-label", `${i} de 5`);
    b.className = i <= value ? "on" : "";
    b.onclick = () => { $("#form-new").rating.value = i; setupStars(i); };
    box.append(b);
  }
}

/* ---- Eventos ---- */
$("#chips").addEventListener("click", e => {
  const b = e.target.closest(".chip"); if (!b) return;
  state.kind = b.dataset.kind;
  document.querySelectorAll(".chip").forEach(c => c.classList.toggle("on", c === b));
  render();
});
$("#search").addEventListener("input", e => { state.q = e.target.value; render(); });

$("#feed").addEventListener("click", async e => {
  const btn = e.target.closest("[data-act]"); if (!btn) return;
  const id = btn.closest(".card").dataset.id;
  try {
    if (btn.dataset.act === "like") { if (needLogin()) return; await store.toggleLike(id); }
    if (btn.dataset.act === "del" && confirm("¿Borrar esta recomendación?")) await store.remove(id);
    await load();
  } catch (err) { toast(err.message); }
});

$("#fab").onclick = () => {
  if (needLogin()) return;
  $("#form-new").reset(); setupStars(5); $("#new-err").hidden = true; $("#dlg-new").showModal();
};
document.querySelectorAll("[data-close]").forEach(b => b.onclick = () => b.closest("dialog").close());

$("#form-new").addEventListener("submit", async e => {
  e.preventDefault();
  const f = new FormData(e.target);
  const rec = {
    kind: f.get("kind"), title: f.get("title").trim(), creator: f.get("creator").trim(),
    year: f.get("year") ? Number(f.get("year")) : null, rating: Number(f.get("rating")),
    comment: f.get("comment").trim(), cover_url: safeUrl(f.get("cover_url")),
  };
  try { await store.create(rec); $("#dlg-new").close(); toast("Publicado"); await load(); }
  catch (err) { const el = $("#new-err"); el.textContent = err.message; el.hidden = false; }
});

$("#btn-account").onclick = async () => {
  if (state.user) { await store.signOut(); state.user = null; toast("Saliste de tu cuenta"); render(); }
  else openAuth(false);
};
$("#auth-toggle").onclick = () => openAuth(!state.signup);

$("#form-auth").addEventListener("submit", async e => {
  e.preventDefault();
  const f = Object.fromEntries(new FormData(e.target));
  try {
    state.user = state.signup ? await store.signUp(f) : await store.signIn(f);
    $("#dlg-auth").close(); toast(`Hola, ${state.user.username}`); await load();
  } catch (err) { const el = $("#auth-err"); el.textContent = err.message; el.hidden = false; }
});

/* ---- Inicio ---- */
(async () => {
  $("#demo-banner").hidden = !DEMO;
  try { await store.init(); state.user = await store.user(); } catch (e) { toast("Error de conexión: " + e.message); }
  await load();
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js");
})();
