/* =========================================================
   Les amis du bal à Papa – Page « Mettre à jour le site »
   Réservée aux gestionnaires : connexion par lien reçu par e-mail (la même que
   pour les inscriptions), puis modification de l'agenda, des affiches, de l'annonce,
   des infos pratiques, des salles et des danses.
   Tout est enregistré dans la base Supabase (supabase/2-contenu-du-site.sql) :
   même en modifiant cette page, une personne non autorisée ne peut rien changer.
   ========================================================= */

const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const JOURS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
const TYPES = { the: "Bal", stage: "Stage de danse", ag: "Assemblée générale / réunion" };
const VILLE = "Chambéry";
const SALLE_A_CONFIRMER = "Salle à confirmer";
const AUTRE_LIEU = "__autre__";
const HEURE_BAL = "15 h – 18 h (billetterie dès 14 h 20)";
const DETAILS_BAL = "Entrée 10 €, libre pour les adhérents. Buvette dès 14 h 20, pâtisseries à partir de 16 h.";
const DOSSIER = "affiches";          // dossier de stockage des images
const IMAGE_MAX = 1600;              // plus grand côté, en pixels, après réduction

const INFOS_VIDES = {
  annonce: { afficher: false, texte: "" },
  styles: [],
  pratique: { horaires: "", billetterie: "", entree: "", adhesion: "", buvette: "", parking: "" },
  salles: []
};

let db = null;
let evenements = [];
let enregistre = structuredClone(INFOS_VIDES);   // réglages tels qu'enregistrés dans la base
let infos = structuredClone(INFOS_VIDES);        // copie de travail des listes (salles, danses) affichées
let image = { url: "", fichier: null, apercu: "" };   // image du formulaire d'évènement
let modifie = false;                                  // modifications non enregistrées

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
  $("g-deconnexion").addEventListener("click", async () => {
    if (modifie && !window.confirm("Des modifications ne sont pas enregistrées. Se déconnecter quand même ?")) return;
    modifie = false;
    await db.auth.signOut();
  });

  // Agenda
  $("ev-ajouter").addEventListener("click", () => ouvrirFormulaire(null));
  $("ev-annuler").addEventListener("click", fermerFormulaire);
  $("ev-form").addEventListener("submit", enregistrerEvenement);
  $("ev-passes").addEventListener("change", afficherAgenda);
  $("ev-salle").addEventListener("change", majAutreLieu);
  $("ev-type").addEventListener("change", preremplirType);
  $("ev-fichier").addEventListener("change", choisirImage);
  $("ev-retirer-image").addEventListener("click", retirerImage);

  // Réglages
  $("an-form").addEventListener("submit", e => { e.preventDefault(); enregistrerInfos("annonce"); });
  $("in-form").addEventListener("submit", e => { e.preventDefault(); enregistrerInfos("infos"); });
  $("sa-form").addEventListener("submit", e => { e.preventDefault(); enregistrerInfos("salles"); });
  $("da-form").addEventListener("submit", e => { e.preventDefault(); enregistrerInfos("danses"); });
  $("sa-ajouter").addEventListener("click", () => { lireSalles(); infos.salles.push({ nom: "", infos: "Parking gratuit" }); afficherSalles(true); modifie = true; });
  $("da-ajouter").addEventListener("click", () => { lireDanses(); infos.styles.push(""); afficherDanses(true); modifie = true; });

  // Prévenir avant de quitter la page avec des modifications non enregistrées
  $("g-espace").addEventListener("input", () => { modifie = true; });
  window.addEventListener("beforeunload", e => { if (modifie) { e.preventDefault(); e.returnValue = ""; } });

  db.auth.onAuthStateChange((_evt, session) => afficherSession(session));
  db.auth.getSession().then(({ data }) => afficherSession(data.session));
}

let sessionVue = undefined;
function afficherSession(session) {
  const email = session && session.user ? session.user.email : null;
  if (email === sessionVue) return;
  sessionVue = email;
  if (!email) {
    cacher("g-espace");
    montrer("g-connexion");
    return;
  }
  cacher("g-connexion");
  $("g-qui").textContent = email;
  montrer("g-espace");
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

/* ---------- Chargement ---------- */
async function charger() {
  cacher("g-erreur");
  $("ev-total").textContent = "Chargement…";
  const autorise = await db.rpc("est_gestionnaire");
  if (autorise.error || autorise.data !== true) {
    $("ev-total").textContent = "";
    return erreur("Cette adresse n'est pas autorisée à modifier le site. Déconnectez-vous et utilisez l'adresse de l'association.");
  }
  const [ev, rg] = await Promise.all([
    db.from("evenements").select("*").order("date", { ascending: true }),
    db.from("reglages").select("valeur").eq("cle", "infos").maybeSingle()
  ]);
  if (ev.error || rg.error) {
    console.error(ev.error || rg.error);
    $("ev-total").textContent = "";
    return erreur("Le contenu du site n'a pas pu être chargé. Si c'est la première fois, il faut lancer le script "
      + "« supabase/2-contenu-du-site.sql » dans Supabase (voir LISEZMOI.md). Sinon, actualisez la page.");
  }
  evenements = ev.data || [];
  enregistre = fusionner(rg.data ? rg.data.valeur : null);
  infos = structuredClone(enregistre);
  afficherAgenda();
  afficherAnnonce();
  afficherPratique();
  afficherSalles();
  afficherDanses();
  modifie = false;
}

// Complète les réglages lus avec les rubriques éventuellement absentes
function fusionner(v) {
  const r = structuredClone(INFOS_VIDES);
  if (!v || typeof v !== "object") return r;
  if (v.annonce) r.annonce = { afficher: !!v.annonce.afficher, texte: v.annonce.texte || "" };
  if (Array.isArray(v.styles)) r.styles = v.styles.map(String);
  if (v.pratique) Object.keys(r.pratique).forEach(k => { r.pratique[k] = v.pratique[k] || ""; });
  if (Array.isArray(v.salles)) r.salles = v.salles.map(s => ({ nom: s.nom || "", infos: s.infos || "" }));
  return r;
}

/* ---------- Agenda : liste ---------- */
function afficherAgenda() {
  const tous = $("ev-passes").checked;
  const auj = aujourdhui();
  const liste = evenements.filter(e => tous || e.date >= auj);
  const nbPasses = evenements.filter(e => e.date < auj).length;
  $("ev-total").textContent = `${liste.length} évènement${liste.length > 1 ? "s" : ""} affiché${liste.length > 1 ? "s" : ""}`
    + (!tous && nbPasses ? ` (${nbPasses} passé${nbPasses > 1 ? "s" : ""} masqué${nbPasses > 1 ? "s" : ""})` : "");
  const ol = $("ev-liste");
  if (!liste.length) {
    ol.innerHTML = `<li class="g-vide">Aucun évènement à venir. Cliquez sur « Ajouter un évènement ».</li>`;
    return;
  }
  ol.innerHTML = liste.map(e => {
    const passe = e.date < auj;
    const img = e.image ? `<span class="ev-carte-img"><img src="${html(cheminImage(e.image))}" alt=""></span>` : "";
    return `<li class="g-carte${passe ? " ev-passe" : ""}">
      ${img}
      <span class="g-type">${html(TYPES[e.type] || "Évènement")}${passe ? " – passé" : ""}</span>
      <h3 class="g-nom">${html(capital(jourLong(e.date)))}</h3>
      <p class="g-contact">${html(e.titre)}</p>
      <dl class="g-details">
        <div><dt>Salle</dt><dd>${html(e.lieu || "—")}</dd></div>
        <div><dt>Horaires</dt><dd>${html(e.heure || "—")}</dd></div>
        <div><dt>Image</dt><dd>${e.image ? "Oui" : "Aucune"}</dd></div>
      </dl>
      <div class="g-actions">
        <button type="button" class="btn" data-modifier="${e.id}">Modifier<span class="visually-hidden"> l'évènement du ${html(jourLong(e.date))}</span></button>
        <button type="button" class="btn btn-outline" data-dupliquer="${e.id}">Copier pour une autre date<span class="visually-hidden"> (évènement du ${html(jourLong(e.date))})</span></button>
        <button type="button" class="btn btn-danger" data-suppr="${e.id}">Supprimer<span class="visually-hidden"> l'évènement du ${html(jourLong(e.date))}</span></button>
      </div>
    </li>`;
  }).join("");
  ol.querySelectorAll("[data-modifier]").forEach(b => b.addEventListener("click", () => ouvrirFormulaire(trouver(b.dataset.modifier))));
  ol.querySelectorAll("[data-dupliquer]").forEach(b => b.addEventListener("click", () => ouvrirFormulaire(trouver(b.dataset.dupliquer), true)));
  ol.querySelectorAll("[data-suppr]").forEach(b => b.addEventListener("click", () => supprimerEvenement(b.dataset.suppr)));
}

function trouver(id) { return evenements.find(e => e.id === id); }

/* ---------- Agenda : formulaire ---------- */
function ouvrirFormulaire(ev, copie = false) {
  if (modifie && !$("ev-form").hidden && !window.confirm("Le formulaire en cours n'est pas enregistré. L'abandonner ?")) return;
  const nouveau = !ev || copie;
  const e = ev || { type: "the", heure: HEURE_BAL, details: DETAILS_BAL, lieu: "" };
  $("ev-id").value = nouveau ? "" : e.id;
  $("ev-form-titre").textContent = !ev ? "Nouvel évènement" : copie ? "Copie de l'évènement – choisissez la nouvelle date" : "Modifier l'évènement";
  $("ev-date").value = copie ? "" : (e.date || "");
  $("ev-type").value = e.type || "the";
  $("ev-titre").value = e.titre || "";
  remplirSalles(e.lieu || "");
  $("ev-heure").value = e.heure || "";
  $("ev-details").value = e.details || "";
  $("ev-image-desc").value = e.image_description || "";
  $("ev-fichier").value = "";
  image = { url: e.image || "", fichier: null, apercu: "" };
  majApercu();
  effacerErreursChamps();
  $("ev-enregistrer").textContent = nouveau ? "Ajouter à l'agenda" : "Enregistrer les modifications";
  montrer("ev-form");
  modifie = false;
  $("ev-form").scrollIntoView({ behavior: "smooth", block: "start" });
  $("ev-form-titre").focus({ preventScroll: true });
}

function fermerFormulaire() {
  libererApercu();
  cacher("ev-form");
  modifie = false;
  $("ev-ajouter").focus();
}

// Pour un nouvel évènement : horaires et détails proposés selon le type
function preremplirType() {
  if ($("ev-id").value) return;
  const t = $("ev-type").value;
  if (t === "the") {
    if (!$("ev-heure").value) $("ev-heure").value = HEURE_BAL;
    if (!$("ev-details").value) $("ev-details").value = DETAILS_BAL;
  } else {
    if ($("ev-heure").value === HEURE_BAL) $("ev-heure").value = "";
    if ($("ev-details").value === DETAILS_BAL) $("ev-details").value = "";
  }
}

// Liste des salles : celles de la rubrique « Salles », plus « à confirmer » et « autre lieu »
function remplirSalles(lieuActuel) {
  const sel = $("ev-salle");
  const options = enregistre.salles.filter(s => s.nom.trim()).map(s => `${s.nom.trim()}, ${VILLE}`);
  options.push(`${SALLE_A_CONFIRMER}, ${VILLE}`);
  sel.innerHTML = `<option value="">— Choisir une salle —</option>`
    + options.map(o => `<option value="${html(o)}">${html(o)}</option>`).join("")
    + `<option value="${AUTRE_LIEU}">Autre lieu…</option>`;
  if (!lieuActuel) sel.value = "";
  else if (options.includes(lieuActuel)) sel.value = lieuActuel;
  else { sel.value = AUTRE_LIEU; $("ev-autre-lieu").value = lieuActuel; }
  if (sel.value !== AUTRE_LIEU) $("ev-autre-lieu").value = "";
  majAutreLieu();
}

function majAutreLieu() {
  $("ev-autre-lieu-champ").hidden = $("ev-salle").value !== AUTRE_LIEU;
}

async function enregistrerEvenement(e) {
  e.preventDefault();
  effacerErreursChamps();
  const id = $("ev-id").value;
  const salle = $("ev-salle").value;
  const fiche = {
    date: $("ev-date").value,
    type: $("ev-type").value,
    titre: $("ev-titre").value.trim(),
    lieu: (salle === AUTRE_LIEU ? $("ev-autre-lieu").value.trim() : salle) || null,
    heure: $("ev-heure").value.trim() || null,
    details: $("ev-details").value.trim() || null,
    image_description: $("ev-image-desc").value.trim() || null
  };
  const manques = [];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fiche.date)) manques.push(["ev-date", "Indiquez la date de l'évènement."]);
  if (!fiche.titre) manques.push(["ev-titre", "Indiquez le titre de l'évènement."]);
  if (manques.length) {
    manques.forEach(([champ, texte]) => erreurChamp(champ, texte));
    erreur("L'évènement n'est pas enregistré : " + manques.map(m => m[1]).join(" "));
    $(manques[0][0]).focus();
    return;
  }

  const bouton = $("ev-enregistrer");
  const texteBouton = bouton.textContent;
  bouton.disabled = true;
  try {
    const ancien = id ? trouver(id) : null;
    // 1. Envoi de l'image si une nouvelle a été choisie
    if (image.fichier) {
      bouton.textContent = "Envoi de l'image…";
      image.url = await envoyerImage(image.fichier, fiche.date);
      image.fichier = null;
    }
    fiche.image = image.url || null;
    if (fiche.image && !fiche.image_description) fiche.image_description = `Affiche de l'évènement : ${fiche.titre}`;
    fiche.modifie_le = new Date().toISOString();

    // 2. Enregistrement dans l'agenda
    bouton.textContent = "Enregistrement…";
    const req = id
      ? db.from("evenements").update(fiche).eq("id", id).select().single()
      : db.from("evenements").insert(fiche).select().single();
    const { data, error } = await req;
    if (error) throw error;

    if (id) evenements = evenements.map(x => (x.id === id ? data : x));
    else evenements.push(data);
    evenements.sort((a, b) => a.date.localeCompare(b.date));

    // 3. L'ancienne image remplacée ou retirée est effacée du stockage (si plus aucun évènement ne l'utilise)
    if (ancien && ancien.image && ancien.image !== data.image) effacerImage(ancien.image);
    libererApercu();
    cacher("ev-form");
    modifie = false;
    if (data.date < aujourdhui()) $("ev-passes").checked = true;
    afficherAgenda();
    info(`${id ? "Modification enregistrée" : "Évènement ajouté à l'agenda"} : ${capital(jourLong(data.date))} – ${data.titre}. Le site est déjà à jour.`);
  } catch (err) {
    console.error(err);
    erreur(messageErreur(err, "L'évènement n'a pas pu être enregistré. Vérifiez votre connexion à Internet et réessayez."));
  } finally {
    bouton.disabled = false;
    bouton.textContent = texteBouton;
  }
}

async function supprimerEvenement(id) {
  const e = trouver(id);
  if (!e) return;
  if (!window.confirm(`Supprimer de l'agenda l'évènement du ${jourLong(e.date)} ?\n« ${e.titre} »\nCette action ne peut pas être annulée.`)) return;
  const { error } = await db.from("evenements").delete().eq("id", id);
  if (error) { console.error(error); return erreur("La suppression n'a pas fonctionné. Réessayez."); }
  evenements = evenements.filter(x => x.id !== id);
  if (e.image) effacerImage(e.image);
  if ($("ev-id").value === id) { libererApercu(); cacher("ev-form"); }
  afficherAgenda();
  info(`L'évènement du ${jourLong(e.date)} a été supprimé de l'agenda.`);
}

/* ---------- Images (affiches, photos) ---------- */
function choisirImage() {
  const f = $("ev-fichier").files[0];
  effacerErreursChamps();
  if (!f) return;
  if (!/^image\/(jpeg|png|webp)$/.test(f.type)) {
    $("ev-fichier").value = "";
    erreurChamp("ev-fichier", "Ce fichier n'est pas une image JPG, PNG ou WebP.");
    return;
  }
  if (f.size > 25 * 1024 * 1024) {
    $("ev-fichier").value = "";
    erreurChamp("ev-fichier", "Cette image est trop lourde (plus de 25 Mo).");
    return;
  }
  libererApercu();
  image.fichier = f;
  image.apercu = URL.createObjectURL(f);
  majApercu();
}

function retirerImage() {
  libererApercu();
  image = { url: "", fichier: null, apercu: "" };
  $("ev-fichier").value = "";
  majApercu();
  modifie = true;
  $("ev-fichier").focus();
}

function majApercu() {
  const src = image.apercu || cheminImage(image.url);
  $("ev-apercu").hidden = !src;
  $("ev-apercu-img").src = src || "";
  $("ev-apercu-img").alt = src ? "Aperçu de l'image choisie" : "";
  $("ev-fichier-label").textContent = src ? "Remplacer par une autre image" : "Choisir une image sur l'ordinateur";
}

function libererApercu() {
  if (image.apercu) URL.revokeObjectURL(image.apercu);
  image.apercu = "";
}

// Réduit l'image (1600 pixels au plus) puis l'envoie dans le dossier « affiches »
async function envoyerImage(fichier, date) {
  const blob = await reduireImage(fichier);
  const nom = `${date || "image"}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}.jpg`;
  const { error } = await db.storage.from(DOSSIER).upload(nom, blob, { contentType: "image/jpeg", upsert: false, cacheControl: "31536000" });
  if (error) throw Object.assign(new Error("image"), { cause: error, image: true });
  return db.storage.from(DOSSIER).getPublicUrl(nom).data.publicUrl;
}

async function reduireImage(fichier) {
  let source;
  try {
    source = await createImageBitmap(fichier);
  } catch (e) {
    source = await new Promise((ok, ko) => {
      const img = new Image();
      img.onload = () => ok(img);
      img.onerror = () => ko(new Error("Image illisible"));
      img.src = URL.createObjectURL(fichier);
    });
  }
  const l = source.width, h = source.height;
  const r = Math.min(1, IMAGE_MAX / Math.max(l, h));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(l * r);
  canvas.height = Math.round(h * r);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff";                 // fond blanc pour les PNG transparents
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  return new Promise((ok, ko) => canvas.toBlob(b => (b ? ok(b) : ko(new Error("Conversion impossible"))), "image/jpeg", 0.85));
}

// Efface du stockage une image envoyée depuis cette page (les anciennes images du dossier images/ restent)
function effacerImage(url) {
  const marque = `/storage/v1/object/public/${DOSSIER}/`;
  const i = String(url).indexOf(marque);
  if (i < 0) return;
  if (evenements.some(e => e.image === url)) return;   // encore utilisée par un autre évènement (copie)
  const nom = decodeURIComponent(String(url).slice(i + marque.length));
  db.storage.from(DOSSIER).remove([nom]).then(({ error }) => { if (error) console.warn(error); });
}

// Les images du dossier images/ sont indiquées par un chemin ; celles envoyées ici par une adresse complète
function cheminImage(p) {
  const v = String(p || "").trim();
  if (!v) return "";
  if (/^https:\/\//i.test(v)) return v;
  if (/^[a-z][a-z0-9+.-]*:/i.test(v)) return "";
  return v.replace(/^\/+/, "");
}

/* ---------- Annonce, infos pratiques, salles, danses ---------- */
function afficherAnnonce() {
  $("an-afficher").checked = !!infos.annonce.afficher;
  $("an-texte").value = infos.annonce.texte || "";
}

function afficherPratique() {
  Object.keys(INFOS_VIDES.pratique).forEach(k => { $(`in-${k}`).value = infos.pratique[k] || ""; });
}

function afficherSalles(focusDernier = false) {
  const ol = $("sa-liste");
  ol.innerHTML = infos.salles.map((s, n) => `<li>
      <div class="field"><label for="sa-nom-${n}">Nom de la salle ${n + 1}</label>
        <input type="text" id="sa-nom-${n}" value="${html(s.nom)}" maxlength="120"></div>
      <div class="field"><label for="sa-info-${n}">Information (parking…)</label>
        <input type="text" id="sa-info-${n}" value="${html(s.infos)}" maxlength="200"></div>
      <button type="button" class="btn btn-danger" data-retirer-salle="${n}">Retirer<span class="visually-hidden"> la salle ${n + 1}</span></button>
    </li>`).join("") || `<li class="g-vide">Aucune salle. Cliquez sur « Ajouter une salle ».</li>`;
  ol.querySelectorAll("[data-retirer-salle]").forEach(b => b.addEventListener("click", () => {
    lireSalles();
    infos.salles.splice(Number(b.dataset.retirerSalle), 1);
    afficherSalles();
    modifie = true;
    $("sa-ajouter").focus();
  }));
  if (focusDernier && infos.salles.length) $(`sa-nom-${infos.salles.length - 1}`).focus();
}

function afficherDanses(focusDernier = false) {
  const ol = $("da-liste");
  ol.innerHTML = infos.styles.map((d, n) => `<li>
      <div class="field"><label for="da-${n}">Danse ${n + 1}</label>
        <input type="text" id="da-${n}" value="${html(d)}" maxlength="80"></div>
      <button type="button" class="btn btn-danger" data-retirer-danse="${n}">Retirer<span class="visually-hidden"> la danse ${n + 1}</span></button>
    </li>`).join("") || `<li class="g-vide">Aucune danse. Cliquez sur « Ajouter une danse ».</li>`;
  ol.querySelectorAll("[data-retirer-danse]").forEach(b => b.addEventListener("click", () => {
    lireDanses();
    infos.styles.splice(Number(b.dataset.retirerDanse), 1);
    afficherDanses();
    modifie = true;
    $("da-ajouter").focus();
  }));
  if (focusDernier && infos.styles.length) $(`da-${infos.styles.length - 1}`).focus();
}

function lireSalles() {
  infos.salles = infos.salles.map((_, n) => ({ nom: $(`sa-nom-${n}`).value.trim(), infos: $(`sa-info-${n}`).value.trim() }));
}
function lireDanses() {
  infos.styles = infos.styles.map((_, n) => $(`da-${n}`).value.trim());
}

// Enregistre une rubrique : seules les valeurs de cette rubrique sont prises dans la page
async function enregistrerInfos(rubrique) {
  const nouvelles = structuredClone(enregistre);
  if (rubrique === "annonce") {
    nouvelles.annonce = { afficher: $("an-afficher").checked, texte: $("an-texte").value.trim() };
    if (nouvelles.annonce.afficher && !nouvelles.annonce.texte) {
      $("an-texte").focus();
      return erreur("L'annonce est cochée « à afficher » mais son texte est vide.");
    }
  } else if (rubrique === "infos") {
    Object.keys(INFOS_VIDES.pratique).forEach(k => { nouvelles.pratique[k] = $(`in-${k}`).value.trim(); });
  } else if (rubrique === "salles") {
    lireSalles();
    nouvelles.salles = infos.salles.filter(s => s.nom);
  } else if (rubrique === "danses") {
    lireDanses();
    nouvelles.styles = infos.styles.filter(Boolean);
  }
  const { error } = await db.from("reglages").upsert({ cle: "infos", valeur: nouvelles, modifie_le: new Date().toISOString() });
  if (error) { console.error(error); return erreur(messageErreur(error, "L'enregistrement n'a pas fonctionné. Vérifiez votre connexion à Internet et réessayez.")); }
  enregistre = nouvelles;
  // Seule la rubrique enregistrée est remise au propre ; les autres gardent ce qui est saisi à l'écran
  if (rubrique === "salles") { infos.salles = structuredClone(nouvelles.salles); afficherSalles(); }
  if (rubrique === "danses") { infos.styles = structuredClone(nouvelles.styles); afficherDanses(); }
  modifie = false;
  const noms = { annonce: "L'annonce", infos: "Les infos pratiques", salles: "La liste des salles", danses: "La liste des danses" };
  info(`${noms[rubrique]} ${rubrique === "annonce" ? "est enregistrée" : "sont enregistrées"}. Le site est déjà à jour.`);
}

/* ---------- Messages ---------- */
function messageErreur(err, defaut) {
  const e = err && err.cause ? err.cause : err;
  const txt = String((e && (e.message || e.error)) || "");
  if (err && err.image) {
    if (/size|too large|exceed/i.test(txt)) return "L'image est trop lourde, même réduite. Choisissez une image plus petite.";
    if (/bucket not found/i.test(txt)) return "Le dossier des affiches n'existe pas encore : il faut lancer le script « supabase/2-contenu-du-site.sql » dans Supabase.";
    return "L'image n'a pas pu être envoyée. Réessayez, ou enregistrez l'évènement sans image.";
  }
  if (/JWT|expired|not authorized|permission|row-level security|42501/i.test(txt + (e && e.code))) {
    return "Votre connexion a expiré ou cette adresse n'est pas autorisée. Déconnectez-vous puis reconnectez-vous avec le lien reçu par e-mail.";
  }
  return defaut;
}

function erreurChamp(id, texte) {
  const champ = $(id);
  champ.setAttribute("aria-invalid", "true");
  const p = document.createElement("p");
  p.className = "field-error";
  p.id = `${id}-erreur`;
  p.textContent = texte;
  champ.insertAdjacentElement("afterend", p);
  champ.setAttribute("aria-describedby", [champ.getAttribute("aria-describedby"), p.id].filter(Boolean).join(" "));
}

function effacerErreursChamps() {
  document.querySelectorAll("#ev-form .field-error").forEach(p => {
    const champ = document.querySelector(`[aria-describedby~="${p.id}"]`);
    if (champ) {
      champ.removeAttribute("aria-invalid");
      const reste = champ.getAttribute("aria-describedby").split(" ").filter(x => x !== p.id).join(" ");
      if (reste) champ.setAttribute("aria-describedby", reste); else champ.removeAttribute("aria-describedby");
    }
    p.remove();
  });
}

/* ---------- Petits outils ---------- */
function aujourdhui() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function jourLong(iso) {
  const [y, m, d] = String(iso).slice(0, 10).split("-").map(Number);
  return `${JOURS[new Date(y, m - 1, d).getDay()]} ${d} ${MOIS[m - 1]} ${y}`;
}
function capital(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
function $(id) { return document.getElementById(id); }
function montrer(id) { $(id).hidden = false; }
function cacher(id) { $(id).hidden = true; }
function erreur(texte) { cacher("g-info"); const b = $("g-erreur"); b.textContent = texte; b.hidden = false; b.focus(); }
function info(texte, focus = true) { cacher("g-erreur"); const b = $("g-info"); b.textContent = texte; b.hidden = false; if (focus) b.focus(); }
function html(s) {
  return String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
