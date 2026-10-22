/* =========================================================
   Les amis du bal à Papa – Script du site
   1. Menu mobile et sous-menus déroulants
   2. Contenus gérés depuis l'espace gestionnaires (dossier data/)
   3. Agenda trimestriel + « Le prochain bal » + liste des évènements à réserver
   4. Formulaires : adhésion à l'année et inscription à un évènement,
      enregistrées dans la base de l'association (Supabase, réglages dans config.js)
   ========================================================= */

/* Contenus de secours : utilisés si le dossier data/ ne peut pas être lu
   (par exemple quand on ouvre index.html directement depuis son ordinateur).
   En ligne, ce sont les fichiers data/agenda.json et data/infos.json qui comptent. */
const AGENDA_SECOURS = [
  {
    date: "2026-10-25",
    titre: "Bal avec le duo Jacky et Sandrine Guilloux",
    type: "the",
    heure: "15 h – 18 h (billetterie dès 14 h 20)",
    lieu: "Le Cœur de Mérande, Chambéry",
    details: "Entrée 10 €. Buvette dès 14 h 20, vente de pâtisseries à partir de 16 h.",
    image: "/images/evenements/2026-10-25-duo-guilloux.jpg",
    image_description: "Affiche du bal du dimanche 25 octobre avec le duo Jacky et Sandrine Guilloux, accordéon et chant, à la salle Mérande à Chambéry"
  }
];

const TYPES = {
  the: "Bal",
  stage: "Stage de danse",
  ag: "Assemblée générale / réunion"
};

const MONTHS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const WEEKDAYS_SHORT = ["L", "M", "M", "J", "V", "S", "D"];
const WEEKDAYS_LONG = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];

document.addEventListener("DOMContentLoaded", () => {
  initMenu();
  initForms();
  loadContent();
  const annee = document.getElementById("annee");
  if (annee) annee.textContent = new Date().getFullYear();
});

/* ---------- 1. Menu mobile et sous-menus ---------- */
function initMenu() {
  const toggle = document.querySelector(".menu-toggle");
  const nav = document.getElementById("main-nav");
  if (!nav) return;
  const subButtons = nav.querySelectorAll(".has-sub");

  const closeSubs = except => subButtons.forEach(b => {
    if (b !== except) b.setAttribute("aria-expanded", "false");
  });

  const closeMenu = () => {
    if (!toggle) return;
    toggle.setAttribute("aria-expanded", "false");
    nav.classList.remove("is-open");
  };

  // Bouton « Menu » (téléphone)
  if (toggle) {
    toggle.addEventListener("click", () => {
      const open = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", String(!open));
      nav.classList.toggle("is-open", !open);
      if (open) closeSubs();
    });
  }

  // Sous-menus déroulants : ouverture au clic (souris, doigt ou clavier)
  subButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const open = btn.getAttribute("aria-expanded") === "true";
      closeSubs(btn);
      btn.setAttribute("aria-expanded", String(!open));
    });
  });

  // Un lien choisi referme les menus
  nav.querySelectorAll("a").forEach(a => a.addEventListener("click", () => {
    closeSubs();
    closeMenu();
  }));

  // Clic en dehors : on referme les sous-menus
  document.addEventListener("click", e => {
    if (!nav.contains(e.target) && e.target !== toggle && !(toggle && toggle.contains(e.target))) closeSubs();
  });

  // Touche Échap : on referme et on rend la main au bon bouton
  document.addEventListener("keydown", e => {
    if (e.key !== "Escape") return;
    const openSub = nav.querySelector('.has-sub[aria-expanded="true"]');
    if (openSub) { closeSubs(); openSub.focus(); return; }
    if (toggle && toggle.getAttribute("aria-expanded") === "true") { closeMenu(); toggle.focus(); }
  });
}

/* ---------- 2. Contenus du dossier data/ ---------- */
async function getJSON(path) {
  const res = await fetch(path, { cache: "no-cache" });
  if (!res.ok) throw new Error(path + " : " + res.status);
  return res.json();
}

async function loadContent() {
  const [infos, agenda] = await Promise.allSettled([
    getJSON("data/infos.json"),
    getJSON("data/agenda.json")
  ]);

  // Si un fichier ne peut pas être lu, le texte déjà présent dans la page reste affiché.
  if (infos.status === "fulfilled" && infos.value) {
    const i = infos.value;
    renderAnnonce(i.annonce);
    renderList("salles-liste", (i.salles || []).map(s => s && s.nom));
    renderList("danses-liste", i.styles);
    renderInfos(i.pratique);
  }

  const events = agenda.status === "fulfilled" && Array.isArray(agenda.value) ? agenda.value : AGENDA_SECOURS;
  initAgenda(events);
}

function renderAnnonce(a) {
  const box = document.getElementById("annonce");
  if (!box || !a || !a.afficher || !String(a.texte || "").trim()) return;
  document.getElementById("annonce-texte").textContent = a.texte;
  box.hidden = false;
}

function renderList(id, items) {
  const box = document.getElementById(id);
  const clean = (items || []).filter(x => String(x || "").trim());
  if (!box || !clean.length) return;
  box.innerHTML = clean.map(x => `<li>${escapeHtml(x)}</li>`).join("");
}

function renderInfos(p) {
  const box = document.getElementById("infos-liste");
  if (!box || !p) return;
  const lignes = [
    ["Horaires", p.horaires], ["Billetterie", p.billetterie],
    ["Entrée", p.entree], ["Adhérents", p.adhesion], ["Buvette", p.buvette]
  ].filter(([, v]) => String(v || "").trim());
  if (lignes.length) box.innerHTML = lignes.map(([k, v]) => `<div><dt>${k}</dt><dd>${escapeHtml(v)}</dd></div>`).join("");
}

/* ---------- 3. Agenda trimestriel ---------- */
function parseDate(str) {
  const [y, m, d] = String(str).slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d);
}
function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function weekday(d) { return WEEKDAYS_LONG[(d.getDay() + 6) % 7]; }
function longDate(d) { return `${weekday(d)} ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`; }

function initAgenda(data) {
  const events = data
    .filter(e => e && e.date && !isNaN(parseDate(e.date)))
    .map((e, i) => ({ ...e, id: "evt-" + i, d: parseDate(e.date) }))
    .sort((a, b) => a.d - b.d);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Page « Les évènements » : le prochain bal
  renderNextBal(events.find(e => e.d >= today));

  // Page « Adhésion » : la liste des évènements auxquels on peut s'inscrire
  fillEventSelect(events.filter(e => e.d >= today && isBookable(e)));

  // Page « Agenda » : le calendrier trimestriel
  const calendarEl = document.getElementById("calendar");
  if (!calendarEl) return;
  const listEl = document.getElementById("event-list");
  const emptyEl = document.getElementById("event-empty");
  const periodEl = document.getElementById("agenda-period");

  // Trimestre affiché au départ : celui d'aujourd'hui (ou du premier évènement s'il est plus tard)
  let start = today;
  if (events.length && events[0].d > today) start = events[0].d;
  let year = start.getFullYear();
  let quarter = Math.floor(start.getMonth() / 3);

  function render() {
    const first = quarter * 3;
    const qStart = new Date(year, first, 1);
    const qEnd = new Date(year, first + 3, 1);
    const visible = events.filter(e => e.d >= qStart && e.d < qEnd);

    periodEl.textContent = `${capitalize(MONTHS[first])} – ${MONTHS[first + 2]} ${year}`;
    calendarEl.innerHTML = "";
    for (let m = first; m < first + 3; m++) calendarEl.appendChild(buildMonth(year, m, visible));

    listEl.innerHTML = "";
    visible.forEach(e => listEl.appendChild(buildEvent(e)));
    emptyEl.hidden = visible.length > 0;
  }

  function buildMonth(y, m, visible) {
    const table = document.createElement("table");
    table.className = "month";
    const caption = document.createElement("caption");
    caption.textContent = `${MONTHS[m]} ${y}`;
    table.appendChild(caption);

    const head = document.createElement("tr");
    WEEKDAYS_SHORT.forEach((s, i) => {
      const th = document.createElement("th");
      th.scope = "col";
      th.innerHTML = `<abbr title="${WEEKDAYS_LONG[i]}">${s}</abbr>`;
      head.appendChild(th);
    });
    const thead = document.createElement("thead");
    thead.appendChild(head);
    table.appendChild(thead);

    const tbody = document.createElement("tbody");
    const offset = (new Date(y, m, 1).getDay() + 6) % 7;
    const days = new Date(y, m + 1, 0).getDate();
    let row = document.createElement("tr");
    for (let i = 0; i < offset; i++) row.appendChild(document.createElement("td"));

    for (let day = 1; day <= days; day++) {
      const date = new Date(y, m, day);
      const td = document.createElement("td");
      if (sameDay(date, today)) td.classList.add("is-today");
      const dayEvents = visible.filter(e => sameDay(e.d, date));

      if (dayEvents.length) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "day-btn";
        btn.textContent = day;
        btn.setAttribute("aria-label", `${longDate(date)} : ${dayEvents.map(e => e.titre).join(", ")}. Voir le détail.`);
        btn.addEventListener("click", () => focusEvent(dayEvents[0].id));
        td.appendChild(btn);
      } else {
        td.innerHTML = `<span class="day-num">${day}</span>`;
      }
      row.appendChild(td);

      if ((offset + day) % 7 === 0 || day === days) {
        if (day === days) {
          const rest = (7 - ((offset + day) % 7)) % 7;
          for (let i = 0; i < rest; i++) row.appendChild(document.createElement("td"));
        }
        tbody.appendChild(row);
        row = document.createElement("tr");
      }
    }
    table.appendChild(tbody);
    return table;
  }

  function buildEvent(e) {
    const li = document.createElement("li");
    li.className = "event" + (e.image ? " has-image" : "");
    li.id = e.id;
    li.tabIndex = -1;
    li.innerHTML = `
      <div class="event-date" aria-hidden="true">${capitalize(weekday(e.d))}<b>${e.d.getDate()}</b>${MONTHS[e.d.getMonth()]}</div>
      <div>
        <span class="event-type">${escapeHtml(TYPES[e.type] || "Évènement")}</span>
        <h4>${escapeHtml(e.titre)}</h4>
        <p><span class="visually-hidden">Date : </span>${capitalize(longDate(e.d))}</p>
        ${e.heure ? `<p>${escapeHtml(e.heure)}</p>` : ""}
        ${e.lieu ? `<p>${escapeHtml(e.lieu)}</p>` : ""}
        ${e.details ? `<p>${escapeHtml(e.details)}</p>` : ""}
        ${e.d >= today && isBookable(e) ? signupLink(e) : ""}
      </div>
      ${eventImage(e, "event-image")}`;
    return li;
  }

  function focusEvent(id) {
    const el = document.getElementById(id);
    if (!el) return;
    document.querySelectorAll(".event.is-highlighted").forEach(x => x.classList.remove("is-highlighted"));
    el.classList.add("is-highlighted");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
    el.focus({ preventScroll: true });
  }

  document.getElementById("agenda-prev").addEventListener("click", () => {
    quarter--; if (quarter < 0) { quarter = 3; year--; }
    render();
  });
  document.getElementById("agenda-next").addEventListener("click", () => {
    quarter++; if (quarter > 3) { quarter = 0; year++; }
    render();
  });

  render();
}

function renderNextBal(e) {
  const box = document.getElementById("prochain-bal-contenu");
  if (!box || !e) return;
  box.innerHTML = `
    <div class="next-event${e.image ? " has-image" : ""}">
      ${eventImage(e, "next-image")}
      <div>
      <p class="next-date">${capitalize(longDate(e.d))}</p>
      <h4>${escapeHtml(e.titre)}</h4>
      ${e.heure ? `<p>${escapeHtml(e.heure)}</p>` : ""}
      ${e.lieu ? `<p>${escapeHtml(e.lieu)}</p>` : ""}
      ${e.details ? `<p>${escapeHtml(e.details)}</p>` : ""}
      ${isBookable(e) ? signupLink(e) : ""}
      </div>
    </div>`;
}

/* ---------- Image d'un évènement (affiche, photo) ---------- */
// Chemin : enlève le « / » initial ajouté par l'espace gestionnaires,
// pour que l'image fonctionne aussi quand le site est dans un sous-dossier.
function assetPath(p) { return String(p || "").trim().replace(/^\/+/, ""); }

function eventImage(e, cls) {
  const src = assetPath(e.image);
  if (!src) return "";
  const alt = e.image_description || `Image de l'évènement : ${e.titre}`;
  // Un clic ouvre l'image en grand, dans un nouvel onglet
  return `<a class="${cls}" href="${escapeHtml(src)}" target="_blank" rel="noopener">
      <img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" loading="lazy">
      <span class="image-zoom">Agrandir l'image<span class="visually-hidden"> (s'ouvre dans un nouvel onglet)</span></span>
    </a>`;
}

/* ---------- Inscription à un seul évènement ---------- */
// On s'inscrit à un bal ou à un stage, pas à une réunion.
function isBookable(e) { return e.type === "the" || e.type === "stage"; }

function eventLabel(e) { return `${capitalize(longDate(e.d))} – ${e.titre}`; }

function signupLink(e) {
  return `<p class="event-signup"><a class="btn" href="adhesion.html?evenement=${encodeURIComponent(e.date)}#inscription-evenement">S'inscrire à cet évènement<span class="visually-hidden"> : ${escapeHtml(eventLabel(e))}</span></a></p>`;
}

function fillEventSelect(list) {
  const select = document.getElementById("ev-choix");
  if (!select) return;
  if (!list.length) {
    select.innerHTML = `<option value="">Aucun évènement à venir pour le moment – appelez-nous au 07 69 11 41 50</option>`;
    return;
  }
  select.innerHTML = `<option value="">— Choisissez un évènement —</option>` +
    list.map(e => `<option value="${escapeHtml(eventLabel(e))}" data-date="${escapeHtml(e.date)}">${escapeHtml(eventLabel(e))}</option>`).join("");

  // Arrivée depuis un bouton « S'inscrire à cet évènement » : l'évènement est déjà choisi
  const wanted = new URLSearchParams(window.location.search).get("evenement");
  if (wanted) {
    const opt = [...select.options].find(o => o.dataset.date === wanted);
    if (opt) select.value = opt.value;
  }
}

/* ---------- 4. Formulaires ---------- */
function initForms() {
  setupForm({
    type: "adhesion",
    formId: "form-inscription", summaryId: "form-summary", successId: "form-success", submitId: "form-submit",
    successText: "Merci ! Votre pré-inscription a bien été envoyée. Nous vous recontacterons très vite.",
    checks: [
      ["#nom", "nom-err", "Nom"],
      ["#prenom", "prenom-err", "Prénom"],
      ["#naissance", "naissance-err", "Date de naissance"],
      ["#tel", "tel-err", "Téléphone"],
      ["#email", "email-err", "E-mail"],
      ["#urgence-nom", "urgence-nom-err", "Contact d'urgence : nom"],
      ["#urgence-tel", "urgence-tel-err", "Contact d'urgence : téléphone"],
      ["droit_image", "image-err", "Droit à l'image", "group"],
      ["#rgpd", "rgpd-err", "Consentement à l'utilisation des données"]
    ]
  });

  setupForm({
    type: "evenement",
    formId: "form-evenement", summaryId: "ev-summary", successId: "ev-success", submitId: "ev-submit",
    successText: "Merci ! Votre inscription a bien été envoyée. Nous vous attendons sur la piste ; l'entrée se règle sur place.",
    checks: [
      ["#ev-choix", "ev-choix-err", "Évènement choisi"],
      ["#ev-nom", "ev-nom-err", "Nom"],
      ["#ev-prenom", "ev-prenom-err", "Prénom"],
      ["#ev-tel", "ev-tel-err", "Téléphone"],
      ["#ev-email", "ev-email-err", "E-mail"],
      ["droit_image", "ev-image-err", "Droit à l'image", "group"],
      ["#ev-rgpd", "ev-rgpd-err", "Consentement à l'utilisation des données"]
    ]
  });
}

function setupForm(cfg) {
  const form = document.getElementById(cfg.formId);
  if (!form) return;
  const summary = document.getElementById(cfg.summaryId);
  const success = document.getElementById(cfg.successId);
  const submitBtn = document.getElementById(cfg.submitId);
  const submitLabel = submitBtn.textContent;

  const checks = cfg.checks.map(([sel, err, label, kind]) => kind === "group"
    ? { group: sel, err, label, focus: form.querySelector(`input[name="${sel}"]`) }
    : { el: form.querySelector(sel), err, label });

  const isValid = c => {
    if (c.group) return !!form.querySelector(`input[name="${c.group}"]:checked`);
    if (c.el.type === "tel") return c.el.value.replace(/\D/g, "").length >= 10 && c.el.checkValidity();
    return c.el.checkValidity();
  };

  const showError = (c, invalid) => {
    document.getElementById(c.err).hidden = !invalid;
    if (c.el) c.el.setAttribute("aria-invalid", String(invalid));
  };

  // Une erreur affichée disparaît dès que le champ est corrigé
  checks.forEach(c => {
    const inputs = c.group ? form.querySelectorAll(`input[name="${c.group}"]`) : [c.el];
    inputs.forEach(i => i.addEventListener("change", () => {
      if (!document.getElementById(c.err).hidden) showError(c, !isValid(c));
    }));
  });

  const showSummary = html => {
    summary.innerHTML = html;
    summary.hidden = false;
    summary.focus();
  };

  form.addEventListener("submit", async e => {
    e.preventDefault();
    success.hidden = true;

    const errors = checks.filter(c => {
      const invalid = !isValid(c);
      showError(c, invalid);
      return invalid;
    });

    if (errors.length) {
      showSummary(`<h3>Le formulaire contient ${errors.length} erreur${errors.length > 1 ? "s" : ""}</h3>
        <ul>${errors.map((c, i) => `<li><a href="#" data-i="${i}">${c.label}</a></li>`).join("")}</ul>`);
      summary.querySelectorAll("a[data-i]").forEach(a => a.addEventListener("click", ev => {
        ev.preventDefault();
        const c = errors[Number(a.dataset.i)];
        (c.el || c.focus).focus();
      }));
      return;
    }
    summary.hidden = true;

    // Piège à robots : un champ invisible rempli = envoi ignoré, sans le dire
    const piege = form.querySelector('input[name="_gotcha"]');
    if (piege && piege.value) { form.reset(); success.textContent = cfg.successText; success.hidden = false; return; }

    const db = getDatabase();
    if (!db) {
      showSummary("<h3>Formulaire pas encore activé</h3><p>En attendant, appelez le 07 69 11 41 50 ou écrivez à lesamisdubal@gmail.com.</p>");
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Envoi en cours…";
    try {
      const { error } = await db.from("inscriptions").insert(toRecord(form, cfg.type));
      if (error) throw error;
      form.reset();
      checks.forEach(c => showError(c, false));
      success.textContent = cfg.successText;
      success.hidden = false;
      success.focus();
    } catch (err) {
      console.error(err);
      showSummary("<h3>L'envoi n'a pas fonctionné</h3><p>Merci de réessayer dans quelques instants, ou contactez-nous au 07 69 11 41 50 / lesamisdubal@gmail.com.</p>");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = submitLabel;
    }
  });
}

/* ---------- Base des inscriptions ---------- */
let dbClient = null;
function getDatabase() {
  const c = window.BAL_CONFIG || {};
  if (!configOk(c) || !window.supabase) return null;
  if (!dbClient) {
    dbClient = window.supabase.createClient(c.SUPABASE_URL, c.SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
  }
  return dbClient;
}

// Transforme le formulaire en fiche pour la base (mêmes noms que supabase/installation.sql)
function toRecord(form, type) {
  const v = name => {
    const el = form.elements[name];
    return el && typeof el.value === "string" ? el.value.trim() : "";
  };
  const orNull = x => (x === "" ? null : x);
  const record = {
    type,
    nom: v("nom"),
    prenom: v("prenom"),
    telephone: v("telephone"),
    email: v("email"),
    droit_image: v("droit_image") === "J'autorise",
    consentement_rgpd: !!(form.elements.consentement_rgpd && form.elements.consentement_rgpd.checked)
  };
  if (type === "adhesion") {
    record.date_naissance = orNull(v("date_naissance"));
    record.urgence_nom = orNull(v("urgence_nom"));
    record.urgence_telephone = orNull(v("urgence_telephone"));
  } else {
    const select = form.elements.evenement;
    const opt = select && select.selectedOptions[0];
    record.evenement = orNull(v("evenement"));
    record.evenement_date = orNull(opt && opt.dataset.date ? opt.dataset.date : "");
    record.nombre_personnes = Number(v("nombre_personnes")) || 1;
    record.message = orNull(v("message"));
  }
  return record;
}

// Vrai seulement avec une vraie adresse et une vraie clé publique (pas le texte à remplacer)
function configOk(c) {
  return /^https:\/\/.+\.supabase\.co$/.test(c.SUPABASE_URL || "") && /^(sb_publishable_|eyJ)/.test(c.SUPABASE_ANON_KEY || "");
}

/* ---------- Utilitaires ---------- */
function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
