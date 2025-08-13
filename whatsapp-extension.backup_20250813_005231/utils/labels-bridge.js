// WhatsApp Business – Labels Bridge (content script)
// - Descubre el panel/lista de etiquetas sin hardcodear idioma.
// - Expone window.WALabels: { sync(), select(name), ensureOpen() }.
// - Responde a mensajes de la extensión: GET_LABELS / CLICK_LABEL.

(() => {
  const log  = (...a) => console.log("[WALabels]", ...a);
  const warn = (...a) => console.warn("[WALabels]", ...a);
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const isVisible = (el) => !!el && (el.offsetWidth || el.offsetHeight || el.getClientRects().length);

  const waitFor = async (finder, { interval = 400, tries = 100 } = {}) => {
    for (let i = 0; i < tries; i++) {
      try { const el = finder(); if (el) return el; } catch {}
      await sleep(interval);
    }
    return null;
  };

  // ---------- 1) Localizar panel y lista (sin depender del texto “Etiquetas”) ----------
  function findLabelsRoot() {
    // Preferir data-testids/roles comunes del drawer
    const stable = document.querySelector(
      '[data-testid="labels-side-drawer"], [data-testid="label-manager"], [data-testid="drawer-content"]'
    );
    if (stable && isVisible(stable)) return stable;

    // Fallback: dialog/aside/section visibles con heading + items clicables
    const cands = Array.from(document.querySelectorAll('[role="dialog"], aside, section'))
      .filter(isVisible);
    for (const n of cands) {
      const hasHeading = n.querySelector('[role="heading"], h1, h2, h3');
      const looksLikeList = n.querySelector('[role="listitem"], [role="option"], [tabindex]');
      if (hasHeading && looksLikeList) return n;
    }
    return null;
  }

  function findLabelsListArea(root) {
    if (!root) return null;

    // 1) Roles explícitos
    const byRole = Array.from(root.querySelectorAll('[role="list"], [role="group"]')).find(isVisible);
    if (byRole) return byRole;

    // 2) Heurística: contenedor con varios items clicables
    const areas = Array.from(root.querySelectorAll('div, section, main, aside')).filter(isVisible);
    for (const a of areas) {
      const items = a.querySelectorAll('[role="listitem"], [role="option"], [role="button"], [tabindex]');
      if (items.length >= 3) return a;
    }

    // 3) Subir ancestros y revisar hermanos (por si la lista está “4 divs arriba/abajo”)
    let up = root;
    for (let i = 0; i < 6 && up; i++) {
      const sibs = Array.from(up.parentElement?.children || []).filter(isVisible);
      for (const s of sibs) {
        const items = s.querySelectorAll('[role="listitem"], [role="option"], [role="button"], [tabindex]');
        if (items.length >= 3) return s;
      }
      up = up.parentElement;
    }
    return null;
  }

  // ---------- 2) Extraer nombres y buscar filas ----------
  const norm = (t = "") => t.normalize("NFKC").replace(/\s+/g, " ").trim();

  function getRowLabelText(row) {
    const c = [];
    const t1 = row.getAttribute("title");                        if (t1) c.push(t1);
    const t2 = row.getAttribute("aria-label");                   if (t2) c.push(t2);
    const t3 = row.querySelector('[data-testid="cell-frame-title"]')?.textContent; if (t3) c.push(t3);
    const t4 = row.querySelector('span[dir="auto"]')?.textContent;                   if (t4) c.push(t4);
    return c.map(norm).find(t => t && !/^\d+$/.test(t) && !/^(elemento|elementos|items?)$/i.test(t)) || "";
  }

  function collectRows(listArea) {
    return Array.from(
      listArea.querySelectorAll('[role="listitem"], [role="option"], [role="button"], [tabindex="0"]')
    ).filter(isVisible);
  }

  function extractLabelNames(listArea) {
    return [...new Set(collectRows(listArea).map(getRowLabelText).filter(Boolean))];
  }

  function findRowByName(listArea, name) {
    const needle = norm(name);
    return collectRows(listArea).find(r => norm(getRowLabelText(r)) === needle) || null;
  }

  // ---------- 3) Abrir panel (opcional, heurístico) ----------
  async function ensureOpen() {
    if (findLabelsRoot()) return true;

    // Busca en la barra lateral botones que puedan abrir “Etiquetas”
    const sidebar = document.querySelector('nav, [data-testid="app-sidebar"]') || document.body;
    const btn = Array.from(sidebar.querySelectorAll('button[aria-label], [role="button"][aria-label], [title]'))
      .find(b => /label|etiqu/i.test(b.getAttribute('aria-label') || b.getAttribute('title') || ''));
    if (btn) { btn.click(); await sleep(300); }

    return !!(await waitFor(findLabelsRoot, { interval: 300, tries: 10 }));
  }

  // ---------- 4) Click real ----------
  function simulateClick(el) {
    const r = el.getBoundingClientRect();
    const x = r.left + Math.min(10, r.width / 2);
    const y = r.top + Math.min(10, r.height / 2);
    const o = { bubbles: true, cancelable: true, clientX: x, clientY: y };
    el.dispatchEvent(new PointerEvent("pointerdown", o));
    el.dispatchEvent(new MouseEvent("mousedown", o));
    el.dispatchEvent(new PointerEvent("pointerup", o));
    el.dispatchEvent(new MouseEvent("mouseup", o));
    el.dispatchEvent(new MouseEvent("click", o));
  }

  async function incrementalScrollSearch(listArea, name, { steps = 16, px = 400 } = {}) {
    for (let i = 0; i < steps; i++) {
      const row = findRowByName(listArea, name);
      if (row) return row;
      const scroller = listArea.closest('[data-testid="drawer-content"]') || listArea;
      scroller.scrollTop += px;
      await sleep(100);
    }
    return null;
  }

  // ---------- 5) API pública ----------
  const WALabels = {
    async sync() {
      const ok = await ensureOpen();
      if (!ok) { warn("No pude abrir el panel de etiquetas."); return []; }
      const root = await waitFor(findLabelsRoot, { interval: 250, tries: 20 });
      const list = await waitFor(() => findLabelsListArea(root), { interval: 250, tries: 20 });
      if (!list) { warn("No localicé la lista de etiquetas."); return []; }
      const names = extractLabelNames(list);
      log("Etiquetas:", names);
      return names;
    },

    async select(name) {
      if (!name) return false;
      const ok = await ensureOpen();
      if (!ok) return false;

      const root = await waitFor(findLabelsRoot, { interval: 250, tries: 15 });
      const list = await waitFor(() => findLabelsListArea(root), { interval: 250, tries: 15 });
      if (!list) return false;

      let row = findRowByName(list, name);
      if (!row) row = await incrementalScrollSearch(list, name);
      if (!row) { warn(`Etiqueta no encontrada: "${name}"`); return false; }

      row.scrollIntoView({ block: "center", behavior: "instant" });
      simulateClick(row);
      log(`Click en etiqueta: "${name}"`);
      return true;
    },

    ensureOpen
  };

  // Exponer en la página (mismo isolated world de otros content scripts)
  window.WALabels = WALabels;
  log("Disponible: window.WALabels { sync, select, ensureOpen }");

  // ---------- 6) Mensajería con la extensión ----------
  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    (async () => {
      if (msg?.type === "GET_LABELS") {
        const labels = await WALabels.sync();
        sendResponse({ ok: true, labels });
      } else if (msg?.type === "CLICK_LABEL" && msg.name) {
        const ok = await WALabels.select(msg.name);
        sendResponse({ ok });
      }
    })();
    return true; // respuesta asíncrona
  });

  // ---------- 7) Auto-refresh (mutaciones) ----------
  const mo = new MutationObserver(() => {
    // Puedes emitir evento si deseas reaccionar automáticamente
    // window.dispatchEvent(new CustomEvent('wa-labels:changed'));
  });
  mo.observe(document.body, { childList: true, subtree: true });
})(); 