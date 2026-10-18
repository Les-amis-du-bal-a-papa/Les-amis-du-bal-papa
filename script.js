/* =========================================================
   Les Amis du Bal à Papa – Script du site
   1. Menu mobile        2. Taille du texte
   3. Contenus gérés depuis l'espace administrateur (dossier data/)
      – annonce, cours, salles, galerie, agenda
   4. Formulaire         5. Lien actif dans le menu
   ---------------------------------------------------------
   Les contenus ne se modifient PAS ici : ils se modifient dans
   l'espace administrateur (Pages CMS), qui met à jour les fichiers
   du dossier data/.
   ========================================================= */

const TYPES = {
  stage: { label: "Stage de danse", icon: "★" },
  the: { label: "Bal / thé dansant", icon: "♫" },
  ag: { label: "Assemblée générale / réunion", icon: "■" }
};

const MONTHS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const WEEKDAYS_SHORT = ["L", "M", "M", "J", "V", "S", "D"];
const WEEKDAYS_LONG = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];

document.addEventListener("DOMContentLoaded", () => {
  initMenu();
  initTextSize();
  initForm();
  initActiveNav();
  loadContent();
  const annee = document.getElementById("annee");
  if (annee) annee.textContent = new Date().getFullYear();
});

/* ---------- 1. Menu mobile ---------- */
function initMenu() {
  const toggle = document.querySelector(".menu-toggle");
  const nav = document.querySelector(".main-nav");
  if (!toggle || !nav) return;

  const close = () => {
    toggle.setAttribute("aria-expanded", "false");
    nav.classList.remove("is-open");
  };

  toggle.addEventListener("click", () => {
    const open = toggle.getAttribute("aria-expanded") === "true";
    toggle.setAttribute("aria-expanded", String(!open));
    nav.classList.toggle("is-open", !open);
  });

  nav.querySelectorAll("a").forEach(a => a.addEventListener("click", close));

  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && toggle.getAttribute("aria-expanded") === "true") {
      close();
      toggle.focus();
    }
  });
}

/* ---------- 2. Taille du texte ---------- */
function initTextSize() {
  const buttons = document.querySelectorAll(".btn-size");
  const apply = size => {
    document.documentElement.setAttribute("data-text-size", size);
    buttons.forEach(b => b.setAttribute("aria-pressed", String(b.dataset.size === size)));
  };

  let saved = "normal";
  try { saved = localStorage.getItem("taille-texte") || "normal"; } catch (e) { /* stockage indisponible */ }
  apply(saved);

  buttons.forEach(b => b.addEventListener("click", () => {
    apply(b.dataset.size);
    try { localStorage.setItem("taille-texte", b.dataset.size); } catch (e) { /* ignoré */ }
  }));
}

/* ---------- 3. Contenus du dossier data/ ---------- */
async function getJSON(path) {
  // "no-cache" : les modifications faites dans l'espace administrateur
  // apparaissent dès que GitHub Pages a republié le site.
  const res = await fetch(path, { cache: "no-cache" });
  if (!res.ok) throw new Error(path + " : " + res.status);
  return res.json();
}

async function loadContent() {
  const [infos, cours, galerie, agenda] = await Promise.allSettled([
    getJSON("data/infos.json"),
    getJSON("data/cours.json"),
    getJSON("data/galerie.json"),
    getJSON("data/agenda.json")
  ]);

  // En cas d'échec, le contenu déjà présent dans index.html reste affiché.
  if (infos.status === "fulfilled") {
    const i = infos.value || {};
    renderAnnonce(i.annonce);
    renderStyles(i.styles);
    renderPratique(i.pratique);
    renderSalles(i.salles);
  }
  if (cours.status === "fulfilled") renderCours(cours.value);
  if (galerie.status === "fulfilled") renderGalerie(galerie.value);
  else initGalleryFallback();

  initAgenda(agenda.status === "fulfilled" ? agenda.value : null);
}

// Chemin d'image : enlève le "/" initial ajouté par l'espace administrateur,
// pour que les images fonctionnent aussi quand le site est dans un sous-dossier.
function assetPath(p) { return String(p || "").trim().replace(/^\/+/, ""); }

function renderAnnonce(a) {
  const box = document.getElementById("annonce");
  if (!box || !a || !a.afficher || !String(a.texte || "").trim()) return;
  document.getElementById("annonce-texte").textContent = a.texte;
  box.hidden = false;
}

function renderCours(list) {
  const box = document.getElementById("cours-cards");
  if (!box || !Array.isArray(list) || !list.length) return;
  box.innerHTML = list.map(c => `
    <article class="card">
      ${c.icone ? `<div class="card-icon" aria-hidden="true">${escapeHtml(c.icone)}</div>` : ""}
      <h3>${escapeHtml(c.titre)}</h3>
      ${c.description ? `<p>${escapeHtml(c.description)}</p>` : ""}
      <dl class="card-details">
        ${c.niveaux ? `<div><dt>Pour qui</dt><dd>${escapeHtml(c.niveaux)}</dd></div>` : ""}
        ${c.rythme ? `<div><dt>Fréquence</dt><dd>${escapeHtml(c.rythme)}</dd></div>` : ""}
        ${c.quand ? `<div><dt>Horaires</dt><dd>${escapeHtml(c.quand)}</dd></div>` : ""}
      </dl>
    </article>`).join("");
}

function renderStyles(list) {
  const box = document.getElementById("styles");
  if (!box || !Array.isArray(list) || !list.length) return;
  box.innerHTML = list.filter(s => String(s || "").trim()).map(s => `<li>${escapeHtml(s)}</li>`).join("");
}

function renderPratique(p) {
  const box = document.getElementById("pratique");
  if (!box || !p) return;
  const lignes = [
    ["Horaires", p.horaires], ["Billetterie", p.billetterie],
    ["Entrée", p.entree], ["Adhérents", p.adhesion], ["Buvette", p.buvette]
  ].filter(([, v]) => v && String(v).trim());
  if (!lignes.length) return;
  box.innerHTML = lignes.map(([k, v]) => `<div><dt>${k}</dt><dd>${escapeHtml(v)}</dd></div>`).join("");
}

// Volontairement sans adresse précise : seul le nom de la salle est publié.
function renderSalles(list) {
  const box = document.getElementById("salles");
  if (!box || !Array.isArray(list) || !list.length) return;
  box.innerHTML = list
    .filter(s => s && String(s.nom || "").trim())
    .map(s => `<li><strong>${escapeHtml(s.nom)}</strong>${s.infos ? `<br><span>${escapeHtml(s.infos)}</span>` : ""}</li>`)
    .join("");
}

function renderGalerie(list) {
  const box = document.getElementById("gallery");
  if (!box || !Array.isArray(list)) return;
  box.innerHTML = list.map(g => {
    const src = assetPath(g.image);
    const alt = escapeHtml(g.description || g.legende || "");
    const visuel = src
      ? `<img src="${escapeHtml(src)}" alt="${alt}" loading="lazy" width="600" height="450">`
      : `<div class="gallery-placeholder" role="img" aria-label="${alt}">Photo à venir</div>`;
    return `<li><figure>${visuel}${g.legende ? `<figcaption>${escapeHtml(g.legende)}</figcaption>` : ""}</figure></li>`;
  }).join("");
  initGalleryFallback();
}

// Remplace une photo introuvable par une vignette « Photo à venir »
function initGalleryFallback() {
  document.querySelectorAll(".gallery img").forEach(img => {
    const swap = () => {
      const ph = document.createElement("div");
      ph.className = "gallery-placeholder";
      ph.setAttribute("role", "img");
      ph.setAttribute("aria-label", img.alt);
      ph.textContent = "Photo à venir";
      img.replaceWith(ph);
    };
    if (img.complete && img.naturalWidth === 0) swap();
    else img.addEventListener("error", swap);
  });
}

/* ---------- Agenda trimestriel ---------- */
function parseDate(str) {
  const [y, m, d] = String(str).slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d);
}
function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function formatLongDate(d) {
  return `${WEEKDAYS_LONG[(d.getDay() + 6) % 7]} ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function initAgenda(data) {
  const calendarEl = document.getElementById("calendar");
  if (!calendarEl) return;

  const listEl = document.getElementById("event-list");
  const emptyEl = document.getElementById("event-empty");
  const periodEl = document.getElementById("agenda-period");
  const filters = document.querySelectorAll(".agenda-filters input");

  if (data === null) {
    emptyEl.textContent = "L'agenda n'a pas pu être chargé. Pour connaître les prochaines dates, appelez le 07 69 11 41 50 ou écrivez à lesamisdubal@gmail.com.";
  }

  const events = (Array.isArray(data) ? data : [])
    .filter(e => e && e.date && TYPES[e.type] && !isNaN(parseDate(e.date)))
    .map((e, i) => ({ ...e, id: "evt-" + i, d: parseDate(e.date) }))
    .sort((a, b) => a.d - b.d);

  // Trimestre de départ : celui d'aujourd'hui, sauf si l'agenda commence plus tard
  const today = new Date();
  let start = today;
  if (events.length && events[0].d > today) start = events[0].d;
  let year = start.getFullYear();
  let quarter = Math.floor(start.getMonth() / 3); // 0 à 3

  const activeTypes = () => Array.from(filters).filter(f => f.checked).map(f => f.value);

  function render() {
    const types = activeTypes();
    const firstMonth = quarter * 3;
    const qStart = new Date(year, firstMonth, 1);
    const qEnd = new Date(year, firstMonth + 3, 1);
    const visible = events.filter(e => e.d >= qStart && e.d < qEnd && types.includes(e.type));

    periodEl.textContent = `${capitalize(MONTHS[firstMonth])} – ${MONTHS[firstMonth + 2]} ${year}`;

    calendarEl.innerHTML = "";
    for (let m = firstMonth; m < firstMonth + 3; m++) {
      calendarEl.appendChild(buildMonth(year, m, visible, today));
    }

    listEl.innerHTML = "";
    visible.forEach(e => listEl.appendChild(buildEvent(e)));
    emptyEl.hidden = visible.length > 0;
  }

  function buildMonth(y, m, visible, today) {
    const table = document.createElement("table");
    table.className = "month";

    const caption = document.createElement("caption");
    caption.textContent = `${MONTHS[m]} ${y}`;
    table.appendChild(caption);

    const thead = document.createElement("thead");
    const hr = document.createElement("tr");
    WEEKDAYS_SHORT.forEach((s, i) => {
      const th = document.createElement("th");
      th.scope = "col";
      th.innerHTML = `<abbr title="${WEEKDAYS_LONG[i]}">${s}</abbr>`;
      hr.appendChild(th);
    });
    thead.appendChild(hr);
    table.appendChild(thead);

    const tbody = document.createElement("tbody");
    const first = new Date(y, m, 1);
    const offset = (first.getDay() + 6) % 7; // lundi = 0
    const daysInMonth = new Date(y, m + 1, 0).getDate();

    let row = document.createElement("tr");
    for (let i = 0; i < offset; i++) row.appendChild(document.createElement("td"));

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(y, m, day);
      const td = document.createElement("td");
      if (sameDay(date, today)) td.classList.add("is-today");

      const dayEvents = visible.filter(e => sameDay(e.d, date));
      if (dayEvents.length) {
        const btn = document.createElement("button");
        btn.type = "button";
        const cls = new Set(dayEvents.map(e => e.type)).size > 1 ? "type-multi" : "type-" + dayEvents[0].type;
        btn.className = "day-btn " + cls;
        btn.innerHTML = `<span>${day}</span><span class="day-marks" aria-hidden="true">${dayEvents.map(e => TYPES[e.type].icon).join("")}</span>`;
        btn.setAttribute("aria-label", `${formatLongDate(date)} : ${dayEvents.map(e => e.titre).join(", ")}. Voir le détail.`);
        btn.addEventListener("click", () => focusEvent(dayEvents[0].id));
        td.appendChild(btn);
      } else {
        td.innerHTML = `<span class="day-num">${day}</span>`;
      }

      row.appendChild(td);
      if ((offset + day) % 7 === 0 || day === daysInMonth) {
        if (day === daysInMonth) {
          const remaining = (7 - ((offset + day) % 7)) % 7;
          for (let i = 0; i < remaining; i++) row.appendChild(document.createElement("td"));
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
    li.className = "event type-" + e.type;
    li.id = e.id;
    li.tabIndex = -1;
    const t = TYPES[e.type];
    li.innerHTML = `
      <div class="event-date" aria-hidden="true">
        <span class="d-weekday">${WEEKDAYS_LONG[(e.d.getDay() + 6) % 7]}</span>
        <span class="d-day">${e.d.getDate()}</span>
        <span class="d-month">${MONTHS[e.d.getMonth()]}</span>
      </div>
      <div>
        <span class="event-badge"><span aria-hidden="true">${t.icon}</span> ${t.label}</span>
        <h4>${escapeHtml(e.titre)}</h4>
        <p><strong>Date :</strong> ${formatLongDate(e.d)}</p>
        ${e.heure ? `<p><strong>Horaires :</strong> ${escapeHtml(e.heure)}</p>` : ""}
        ${e.lieu ? `<p><strong>Lieu :</strong> ${escapeHtml(e.lieu)}</p>` : ""}
        ${e.details ? `<p>${escapeHtml(e.details)}</p>` : ""}
      </div>`;
    return li;
  }

  function focusEvent(id) {
    const el = document.getElementById(id);
    if (!el) return;
    document.querySelectorAll(".event.is-highlighted").forEach(x => x.classList.remove("is-highlighted"));
    el.classList.add("is-highlighted");
    el.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "center" });
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
  filters.forEach(f => f.addEventListener("change", render));

  render();
}

/* ---------- 4. Formulaire de pré-inscription ---------- */
function initForm() {
  const form = document.getElementById("form-inscription");
  if (!form) return;
  const summary = document.getElementById("form-summary");
  const success = document.getElementById("form-success");
  const submitBtn = document.getElementById("form-submit");

  const checks = [
    { el: form.nom, err: "nom-err", label: "Nom et prénom" },
    { el: form.naissance, err: "naissance-err", label: "Date de naissance" },
    { el: form.tel, err: "tel-err", label: "Téléphone" },
    { el: form.email, err: "email-err", label: "Adresse e-mail" },
    { el: form["urgence-nom"], err: "urgence-nom-err", label: "Personne à contacter en cas d'urgence (nom)" },
    { el: form["urgence-tel"], err: "urgence-tel-err", label: "Personne à contacter en cas d'urgence (téléphone)" },
    { group: "droit_image", err: "image-err", label: "Droit à l'image", focus: form.querySelector('input[name="droit_image"]') },
    { el: form.rgpd, err: "rgpd-err", label: "Consentement à l'utilisation des données" }
  ];

  function isValid(c) {
    if (c.group) return !!form.querySelector(`input[name="${c.group}"]:checked`);
    if (c.el.type === "tel") return c.el.value.replace(/\D/g, "").length >= 10 && c.el.checkValidity();
    return c.el.checkValidity();
  }

  function showError(c, invalid) {
    document.getElementById(c.err).hidden = !invalid;
    if (c.el) c.el.setAttribute("aria-invalid", String(invalid));
  }

  checks.forEach(c => {
    const inputs = c.group ? form.querySelectorAll(`input[name="${c.group}"]`) : [c.el];
    inputs.forEach(i => i.addEventListener("change", () => {
      if (!document.getElementById(c.err).hidden) showError(c, !isValid(c));
    }));
  });

  form.addEventListener("submit", async e => {
    e.preventDefault();
    success.hidden = true;

    const errors = checks.filter(c => {
      const invalid = !isValid(c);
      showError(c, invalid);
      return invalid;
    });

    if (errors.length) {
      summary.innerHTML = `<h3>Le formulaire contient ${errors.length} erreur${errors.length > 1 ? "s" : ""}</h3>
        <ul>${errors.map(c => `<li><a href="#${(c.el || c.focus).id || ""}">${c.label}</a></li>`).join("")}</ul>`;
      summary.hidden = false;
      summary.querySelectorAll("a").forEach((a, i) => {
        a.addEventListener("click", ev => {
          ev.preventDefault();
          (errors[i].el || errors[i].focus).focus();
        });
      });
      summary.focus();
      return;
    }
    summary.hidden = true;

    if (form.action.includes("XXXXX")) {
      summary.innerHTML = "<h3>Formulaire pas encore activé</h3><p>Le formulaire n'est pas encore relié à Formspree. En attendant, appelez le 07 69 11 41 50 ou écrivez à lesamisdubal@gmail.com.</p>";
      summary.hidden = false;
      summary.focus();
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Envoi en cours…";

    try {
      const response = await fetch(form.action, {
        method: "POST",
        body: new FormData(form),
        headers: { Accept: "application/json" }
      });
      if (!response.ok) throw new Error("Erreur d'envoi");
      form.reset();
      checks.forEach(c => showError(c, false));
      success.textContent = "Merci ! Votre pré-inscription a bien été envoyée. Nous vous rappellerons très vite pour la confirmer.";
      success.hidden = false;
      success.focus();
    } catch (err) {
      summary.innerHTML = "<h3>L'envoi n'a pas fonctionné</h3><p>Merci de réessayer dans quelques instants, ou contactez-nous au 07 69 11 41 50 / lesamisdubal@gmail.com.</p>";
      summary.hidden = false;
      summary.focus();
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Envoyer ma pré-inscription";
    }
  });
}

/* ---------- 5. Lien actif dans le menu ---------- */
function initActiveNav() {
  const links = document.querySelectorAll('.main-nav a[href^="#"]:not(.nav-cta)');
  if (!("IntersectionObserver" in window)) return;
  const map = new Map();
  links.forEach(l => {
    const s = document.querySelector(l.getAttribute("href"));
    if (s) map.set(s, l);
  });
  const obs = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (en.isIntersecting) {
        links.forEach(l => l.removeAttribute("aria-current"));
        map.get(en.target).setAttribute("aria-current", "true");
      }
    });
  }, { rootMargin: "-40% 0px -55% 0px" });
  map.forEach((_, s) => obs.observe(s));
}

/* ---------- Utilitaires ---------- */
function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
