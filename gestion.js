/* =========================================================
   Les amis du bal à Papa – Page « Inscriptions reçues »
   Réservée aux gestionnaires : connexion par lien reçu par e-mail,
   puis lecture, suivi, suppression et export des inscriptions.
   La sécurité est assurée côté base (supabase/installation.sql) :
   même en modifiant cette page, une personne non autorisée ne voit rien.
   ========================================================= */

const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const STATUTS = { nouvelle: "Nouvelle", confirmee: "Confirmée", annulee: "Annulée" };

let db = null;
let toutes = [];

document.addEventListener("DOMContentLoaded", demarrer);

/* ---------- Démarrage et connexion ---------- */
function demarrer() {
  const c = window.BAL_CONFIG || {};
  const ok = /^https:\/\/.+\.supabase\.co$/.test(c.SUPABASE_URL || "") && /^(sb_publishable_|eyJ)/.test(c.SUPABASE_ANON_KEY || "");
  if (!ok || !window.supabase) {
    montrer("g-non-configure");
    return;
  }
  db = window.supabase.createClient(c.SUPABASE_URL, c.SUPABASE_ANON_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: "implicit" }
  });

  $("g-form-connexion").addEventListener("submit", envoyerLien);
  $("g-deconnexion").addEventListener("click", async () => { await db.auth.signOut(); });
  $("g-actualiser").addEventListener("click", charger);
  $("g-export").addEventListener("click", exporter);
  ["g-f-type", "g-f-evenement", "g-f-statut"].forEach(id => $(id).addEventListener("change", afficher));
  $("g-f-recherche").addEventListener("input", afficher);

  db.auth.onAuthStateChange((_evt, session) => afficherSession(session));
  db.auth.getSession().then(({ data }) => afficherSession(data.session));
}

let sessionVue = undefined;
function afficherSession(session) {
  const email = session && session.user ? session.user.email : null;
  if (email === sessionVue) return;           // déjà affiché
  sessionVue = email;
  if (!email) {
    cacher("g-espace");
    montrer("g-connexion");
    return;
  }
  cacher("g-connexion");
  $("g-qui").textContent = email;
  montrer("g-espace");
  // Retire le jeton de connexion de l'adresse de la page
  if (window.location.hash.includes("access_token")) history.replaceState(null, "", window.location.pathname);
  charger();
}

async function envoyerLien(e) {
  e.preventDefault();
  const email = $("g-email").value.trim();
  if (!email) return erreur("Indiquez votre adresse e-mail.");
  const bouton = $("g-envoyer-lien");
  bouton.disabled = true;
  bouton.textContent = "Envoi en cours…";
  try {
    const { error } = await db.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false, emailRedirectTo: window.location.origin + window.location.pathname }
    });
    if (error) throw error;
    info(`C'est envoyé ! Ouvrez la boîte ${email} et cliquez sur le lien reçu : vous reviendrez ici, connecté.`);
  } catch (err) {
    console.error(err);
    erreur("Le lien n'a pas pu être envoyé. Vérifiez l'adresse : seules les adresses de gestionnaires enregistrées peuvent se connecter. Si vous venez d'en demander un, patientez une minute avant de réessayer.");
  } finally {
    bouton.disabled = false;
    bouton.textContent = "Recevoir le lien de connexion";
  }
}

/* ---------- Lecture des inscriptions ---------- */
async function charger() {
  cacher("g-erreur");
  $("g-total").textContent = "Chargement…";
  const autorise = await db.rpc("est_gestionnaire");
  if (autorise.error || autorise.data !== true) {
    toutes = [];
    afficher();
    return erreur("Cette adresse n'est pas autorisée à voir les inscriptions. Déconnectez-vous et utilisez l'adresse de l'association.");
  }
  const { data, error } = await db.from("inscriptions").select("*").order("recue_le", { ascending: false });
  if (error) {
    console.error(error);
    $("g-total").textContent = "";
    return erreur("Les inscriptions n'ont pas pu être chargées. Réessayez avec le bouton « Actualiser ».");
  }
  toutes = data || [];
  remplirFiltreEvenements();
  afficher();
}

function remplirFiltreEvenements() {
  const select = $("g-f-evenement");
  const choisi = select.value;
  const vus = new Map();
  toutes.filter(i => i.type === "evenement" && i.evenement).forEach(i => {
    const cle = i.evenement;
    if (!vus.has(cle)) vus.set(cle, i.evenement_date || "");
  });
  const liste = [...vus.entries()].sort((a, b) => (b[1] || "").localeCompare(a[1] || ""));
  select.innerHTML = `<option value="">Tous les évènements</option>` +
    liste.map(([nom]) => `<option value="${html(nom)}">${html(nom)}</option>`).join("");
  if ([...select.options].some(o => o.value === choisi)) select.value = choisi;
}

function filtrees() {
  const type = $("g-f-type").value;
  const ev = $("g-f-evenement").value;
  const statut = $("g-f-statut").value;
  const q = $("g-f-recherche").value.trim().toLowerCase();
  return toutes.filter(i =>
    (!type || i.type === type) &&
    (!ev || i.evenement === ev) &&
    (!statut || i.statut === statut) &&
    (!q || `${i.nom} ${i.prenom}`.toLowerCase().includes(q)));
}

/* ---------- Affichage ---------- */
function afficher() {
  $("g-nb-nouvelles").textContent = toutes.filter(i => i.statut === "nouvelle").length;
  $("g-nb-adhesions").textContent = toutes.filter(i => i.type === "adhesion").length;
  $("g-nb-evenements").textContent = toutes.filter(i => i.type === "evenement").length;

  const liste = filtrees();
  let total = `${liste.length} inscription${liste.length > 1 ? "s" : ""} affichée${liste.length > 1 ? "s" : ""}`;
  if ($("g-f-evenement").value) {
    const personnes = liste.filter(i => i.statut !== "annulee").reduce((n, i) => n + (i.nombre_personnes || 1), 0);
    total += ` – ${personnes} personne${personnes > 1 ? "s" : ""} attendue${personnes > 1 ? "s" : ""} (hors annulations)`;
  }
  $("g-total").textContent = total;

  const ol = $("g-liste");
  if (!liste.length) {
    ol.innerHTML = `<li class="g-vide">Aucune inscription pour ces critères.</li>`;
    return;
  }
  ol.innerHTML = liste.map(carte).join("");
  ol.querySelectorAll("[data-statut]").forEach(s => s.addEventListener("change", () => changerStatut(s.dataset.statut, s.value)));
  ol.querySelectorAll("[data-note]").forEach(b => b.addEventListener("click", () => enregistrerNote(b.dataset.note)));
  ol.querySelectorAll("[data-suppr]").forEach(b => b.addEventListener("click", () => supprimer(b.dataset.suppr)));
}

function carte(i) {
  const nom = `${html(i.prenom)} ${html(i.nom)}`;
  const lignes = [];
  if (i.type === "evenement") {
    lignes.push(["Évènement", html(i.evenement || "—")]);
    lignes.push(["Nombre de personnes", String(i.nombre_personnes || 1)]);
    if (i.message) lignes.push(["Message", html(i.message)]);
  } else {
    if (i.date_naissance) lignes.push(["Date de naissance", dateCourte(i.date_naissance)]);
    if (i.urgence_nom || i.urgence_telephone) {
      lignes.push(["Contact d'urgence", `${html(i.urgence_nom || "")} ${i.urgence_telephone ? `– <a href="tel:${html(tel(i.urgence_telephone))}">${html(i.urgence_telephone)}</a>` : ""}`]);
    }
  }
  lignes.push(["Droit à l'image", i.droit_image ? "Oui, autorisé" : "<strong>Non</strong> – ne pas publier de photo"]);

  return `<li class="g-carte statut-${html(i.statut)}">
    <div class="g-carte-tete">
      <div>
        <span class="g-type">${i.type === "adhesion" ? "Adhésion à l'année" : "Inscription à un évènement"}</span>
        <h2 class="g-nom">${nom}</h2>
        <p class="g-recue">Reçue le ${dateHeure(i.recue_le)}</p>
      </div>
      <div class="field g-statut">
        <label for="st-${i.id}">Suivi</label>
        <select id="st-${i.id}" data-statut="${i.id}">
          ${Object.entries(STATUTS).map(([v, t]) => `<option value="${v}"${v === i.statut ? " selected" : ""}>${t}</option>`).join("")}
        </select>
      </div>
    </div>
    <p class="g-contact">
      <a href="tel:${html(tel(i.telephone))}">${html(i.telephone)}</a> ·
      <a href="mailto:${html(i.email)}">${html(i.email)}</a>
    </p>
    <dl class="g-details">${lignes.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join("")}</dl>
    <div class="field g-note">
      <label for="note-${i.id}">Note des gestionnaires (visible d'eux seuls)</label>
      <textarea id="note-${i.id}" rows="2">${html(i.note_gestionnaire || "")}</textarea>
    </div>
    <div class="g-actions">
      <button type="button" class="btn btn-outline" data-note="${i.id}">Enregistrer la note</button>
      <button type="button" class="btn btn-danger" data-suppr="${i.id}">Supprimer<span class="visually-hidden"> l'inscription de ${nom}</span></button>
    </div>
  </li>`;
}

/* ---------- Actions ---------- */
async function changerStatut(id, statut) {
  const { error } = await db.from("inscriptions").update({ statut }).eq("id", id);
  if (error) { console.error(error); return erreur("Le suivi n'a pas pu être enregistré. Réessayez."); }
  const i = toutes.find(x => x.id === id);
  if (i) i.statut = statut;
  info(`Suivi enregistré : ${STATUTS[statut]}.`, false);
  afficher();
  const sel = document.getElementById(`st-${id}`);
  if (sel) sel.focus();
}

async function enregistrerNote(id) {
  const note = document.getElementById(`note-${id}`).value.trim();
  const { error } = await db.from("inscriptions").update({ note_gestionnaire: note || null }).eq("id", id);
  if (error) { console.error(error); return erreur("La note n'a pas pu être enregistrée. Réessayez."); }
  const i = toutes.find(x => x.id === id);
  if (i) i.note_gestionnaire = note || null;
  info("Note enregistrée.", false);
}

async function supprimer(id) {
  const i = toutes.find(x => x.id === id);
  const qui = i ? `${i.prenom} ${i.nom}` : "cette personne";
  if (!window.confirm(`Supprimer définitivement l'inscription de ${qui} ?\nCette action ne peut pas être annulée.`)) return;
  const { error } = await db.from("inscriptions").delete().eq("id", id);
  if (error) { console.error(error); return erreur("La suppression n'a pas fonctionné. Réessayez."); }
  toutes = toutes.filter(x => x.id !== id);
  remplirFiltreEvenements();
  afficher();
  info(`L'inscription de ${qui} a été supprimée.`);
}

// Fichier pour Excel ou LibreOffice : séparateur « ; » et accents conservés
function exporter() {
  const liste = filtrees();
  if (!liste.length) return erreur("Aucune inscription à télécharger pour ces critères.");
  const colonnes = [
    ["Reçue le", i => dateHeure(i.recue_le)],
    ["Type", i => (i.type === "adhesion" ? "Adhésion" : "Évènement")],
    ["Suivi", i => STATUTS[i.statut] || i.statut],
    ["Nom", i => i.nom], ["Prénom", i => i.prenom],
    ["Téléphone", i => i.telephone], ["E-mail", i => i.email],
    ["Date de naissance", i => (i.date_naissance ? dateCourte(i.date_naissance) : "")],
    ["Contact d'urgence", i => i.urgence_nom || ""], ["Téléphone d'urgence", i => i.urgence_telephone || ""],
    ["Évènement", i => i.evenement || ""], ["Personnes", i => (i.type === "evenement" ? i.nombre_personnes || 1 : "")],
    ["Message", i => i.message || ""],
    ["Droit à l'image", i => (i.droit_image ? "Oui" : "Non")],
    ["Note", i => i.note_gestionnaire || ""]
  ];
  const cell = x => `"${String(x ?? "").replace(/"/g, '""').replace(/\r?\n/g, " ")}"`;
  const lignes = [colonnes.map(c => cell(c[0])).join(";")]
    .concat(liste.map(i => colonnes.map(c => cell(c[1](i))).join(";")));
  const blob = new Blob(["﻿" + lignes.join("\r\n")], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `inscriptions-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

/* ---------- Petits outils ---------- */
function $(id) { return document.getElementById(id); }
function montrer(id) { $(id).hidden = false; }
function cacher(id) { $(id).hidden = true; }
function erreur(texte) { cacher("g-info"); const b = $("g-erreur"); b.textContent = texte; b.hidden = false; b.focus(); }
function info(texte, focus = true) { cacher("g-erreur"); const b = $("g-info"); b.textContent = texte; b.hidden = false; if (focus) b.focus(); }
function html(s) {
  return String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function tel(s) { return String(s || "").replace(/[^\d+]/g, ""); }
function dateCourte(iso) { const [y, m, d] = String(iso).slice(0, 10).split("-").map(Number); return `${d} ${MOIS[m - 1]} ${y}`; }
function dateHeure(iso) {
  const d = new Date(iso);
  return `${d.getDate()} ${MOIS[d.getMonth()]} ${d.getFullYear()} à ${String(d.getHours()).padStart(2, "0")} h ${String(d.getMinutes()).padStart(2, "0")}`;
}
