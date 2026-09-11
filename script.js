const RATE_A = 32.407914;
const RATE_BF = 108.467304;
const RATE_G = 24.25082;
const LINE_RATE = RATE_A + RATE_BF + RATE_G;
const GAYLORD_CAPACITY = 1500;

const RAW_MATERIALS = [
  { id: "A", grade: "Marlex HHM 5502BN", supplier: "Chevron Phillips Chemicals", inventory: 1500, pctA: 0.83, pctBF: 0.051, pctG: 0.83 },
  { id: "C", grade: "D115", supplier: "Granic", inventory: 5000, pctA: 0, pctBF: 0.12, pctG: 0 },
  { id: "D", grade: "MB27", supplier: "Mutalc", inventory: 1900, pctA: 0, pctBF: 0.009, pctG: 0 },
  { id: "F", grade: "Marlex 1122B", supplier: "Chevron", inventory: 4875, pctA: 0, pctBF: 0.35, pctG: 0 },
  { id: "G", grade: "Clair FP120-D", supplier: "Nova Chemicals", inventory: 3375, pctA: 0.15, pctBF: 0, pctG: 0.15 },
  { id: "H", grade: "FIN-HD-007-BAG", supplier: "Biffa", inventory: 1500, pctA: 0, pctBF: 0.47, pctG: 0 },
  { id: "J", grade: "WH3028E", supplier: "Color Master Inc", inventory: 15, pctA: 0.02, pctBF: 0, pctG: 0.02 }
];

const EXTRUDER_INFO = [
  { key: "pctA", name: "Extrusora A", rate: RATE_A },
  { key: "pctBF", name: "Extrusora B/F", rate: RATE_BF },
  { key: "pctG", name: "Extrusora G", rate: RATE_G }
];

const COLORS = {
  bg: "#12151A",
  panel: "#1B1F27",
  panelAlt: "#20242E",
  border: "#2B3140",
  borderSoft: "#232833",
  teal: "#4BBAB0",
  amber: "#E3A73E",
  red: "#DD5E55",
  text: "#E9ECF1",
  muted: "#8891A0",
  mutedDim: "#5C6474",
  kraft: "#D8C39C",
  kraftStroke: "#9C7F55",
  kraftDark: "#6E5233",
  kraftPlank: "#8A6A44"
};

let mode = "inventory";
let desiredRolls = 24;

function fmt(n, dec = 1) {
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  return n.toLocaleString("es-CO", {
    minimumFractionDigits: dec,
    maximumFractionDigits: dec
  });
}

function computeMaterials() {
  return RAW_MATERIALS
    .map(m => {
      const consumption =
        RATE_A * m.pctA +
        RATE_BF * m.pctBF +
        RATE_G * m.pctG;

      const duration = consumption > 0 ? m.inventory / consumption : Infinity;

      return { ...m, consumption, duration };
    })
    .sort((a, b) => a.duration - b.duration);
}

const materials = computeMaterials();

function gaylordIcon(uid, fraction, accent, size = 54) {
  const x1 = 8, x2 = 92, y1 = 14, y2 = 110, c = 14;
  const boxPath =
    `M${x1 + c},${y1} L${x2 - c},${y1} L${x2},${y1 + c} ` +
    `L${x2},${y2 - c} L${x2 - c},${y2} L${x1 + c},${y2} ` +
    `L${x1},${y2 - c} L${x1},${y1 + c} Z`;

  const f = Math.max(0, Math.min(1, fraction));
  const fillH = f * (y2 - y1);
  const fillY = y2 - fillH;
  const clipId = `clip-${uid.replace(/[^a-zA-Z0-9_-]/g, "")}`;

  return `
    <svg viewBox="0 0 100 132" width="${size}" height="${size * 1.32}" aria-label="Gaylord">
      <defs>
        <clipPath id="${clipId}">
          <path d="${boxPath}"></path>
        </clipPath>
      </defs>

      <rect x="${x1 - 4}" y="${y2}" width="${x2 - x1 + 8}" height="15" rx="1.5" fill="${COLORS.kraftDark}"></rect>
      <rect x="${x1 - 4}" y="${y2 + 4}" width="${x2 - x1 + 8}" height="2" fill="${COLORS.kraftPlank}"></rect>
      <rect x="${x1 - 4}" y="${y2 + 9}" width="${x2 - x1 + 8}" height="2" fill="${COLORS.kraftPlank}"></rect>
      <rect x="22" y="${y2 + 4}" width="9" height="11" fill="${COLORS.bg}"></rect>
      <rect x="${x2 - 31}" y="${y2 + 4}" width="9" height="11" fill="${COLORS.bg}"></rect>

      <path d="${boxPath}" fill="${COLORS.kraft}" stroke="${COLORS.kraftStroke}" stroke-width="2"></path>

      ${f > 0.004 ? `
        <rect x="0" y="${fillY}" width="100" height="${fillH}"
          fill="${accent}" opacity="0.87" clip-path="url(#${clipId})"></rect>
      ` : ""}

      <path d="${boxPath}" fill="none" stroke="${COLORS.kraftStroke}" stroke-width="2"></path>
      <path d="M${x1 + c},${y1} L50,${y1 + 7} L${x2 - c},${y1}"
        fill="none" stroke="${COLORS.kraftStroke}" stroke-width="1.4" opacity="0.55"></path>
    </svg>
  `;
}

function gaylordGroup(amountLb, accent, prefix) {
  if (!amountLb || amountLb <= 0.5) {
    return `<div class="no-gaylords">No requiere gaylords</div>`;
  }

  const fullCount = Math.floor(amountLb / GAYLORD_CAPACITY + 1e-9);
  const remainder = amountLb - fullCount * GAYLORD_CAPACITY;
  const hasPartial = remainder > 0.5;
  const totalCount = fullCount + (hasPartial ? 1 : 0);

  const MAX_ICONS = 8;
  const icons = [];

  if (fullCount <= MAX_ICONS) {
    for (let i = 0; i < fullCount; i++) {
      icons.push({ key: `f${i}`, fraction: 1 });
    }
    if (hasPartial) {
      icons.push({ key: "p", fraction: remainder / GAYLORD_CAPACITY });
    }
  } else {
    icons.push({ key: "f0", fraction: 1, multiplier: fullCount });
    if (hasPartial) {
      icons.push({ key: "p", fraction: remainder / GAYLORD_CAPACITY });
    }
  }

  const iconsHtml = icons.map(ic => `
    <div class="gaylord-item">
      ${gaylordIcon(`${prefix}-${ic.key}`, ic.fraction, accent)}
      ${ic.multiplier ? `<span class="multiplier">×${ic.multiplier}</span>` : ""}
      <div class="gaylord-caption">
        ${ic.fraction >= 0.999
          ? `${fmt(GAYLORD_CAPACITY, 0)} lb`
          : `${fmt(ic.fraction * GAYLORD_CAPACITY, 0)} lb`}
      </div>
    </div>
  `).join("");

  let detail = "";
  if (hasPartial && fullCount > 0) {
    detail = ` (${fullCount} lleno${fullCount !== 1 ? "s" : ""} + 1 parcial al ${fmt((remainder / GAYLORD_CAPACITY) * 100, 0)}%)`;
  } else if (hasPartial && fullCount === 0) {
    detail = ` (1 parcial al ${fmt((remainder / GAYLORD_CAPACITY) * 100, 0)}%)`;
  } else if (!hasPartial && fullCount > 0) {
    detail = " (todos llenos)";
  }

  return `
    <div class="gaylord-group">
      <div class="gaylord-icons">${iconsHtml}</div>
      <div class="gaylord-total">
        Total: <b>${totalCount}</b> gaylord${totalCount !== 1 ? "s" : ""}
        de ${fmt(GAYLORD_CAPACITY, 0)} lb${detail}
      </div>
    </div>
  `;
}

function flowHtml() {
  const limiting = materials[0];

  const extruders = EXTRUDER_INFO.map(ext => {
    const feeders = materials.filter(m => m[ext.key] > 0);

    const chips = feeders.map(f =>
      `<span class="chip">${f.id} · ${(f[ext.key] * 100).toFixed(0)}%</span>`
    ).join("");

    return `
      <div class="flow-box">
        <div class="flow-box-title">${ext.name}</div>
        <div class="flow-box-rate">${fmt(ext.rate)} lb/h</div>
        <div class="chip-row">${chips}</div>
      </div>
      <div class="arrow">→</div>
    `;
  }).join("");

  return `
    <div class="panel">
      <div class="panel-label">El proceso</div>
      <div class="flow-wrap">
        ${extruders}
        <div class="flow-box" style="border-color:${COLORS.teal}">
          <div class="flow-box-title">Línea de producción</div>
          <div class="flow-box-rate" style="color:${COLORS.teal}">${fmt(LINE_RATE)} lb/h</div>
        </div>
        <div class="arrow">→</div>
        <div class="flow-box" style="border-color:${COLORS.amber};min-width:110px">
          <div class="flow-box-title">Rollos</div>
          <div class="flow-box-rate" style="color:${COLORS.amber}">75 min c/u</div>
        </div>
      </div>
    </div>
  `;
}

function materialRowInventory(m, limiting) {
  const maxTimeH = limiting.duration;
  const used = Math.min(m.inventory, m.consumption * maxTimeH);
  const remaining = Math.max(0, m.inventory - used);
  const remainPct = m.inventory > 0 ? (remaining / m.inventory) * 100 : 100;
  const isLimiting = m.id === limiting.id;
  const accent = isLimiting ? COLORS.red : remainPct < 25 ? COLORS.amber : COLORS.teal;

  return `
    <div class="material-row">
      <div class="material-info">
        <div class="material-title">
          <span class="id-badge" style="border-color:${isLimiting ? COLORS.red : COLORS.border};color:${isLimiting ? COLORS.red : COLORS.text}">${m.id}</span>
          <span style="font-weight:600;font-size:13.5px">${m.grade}</span>
        </div>
        <div class="supplier">${m.supplier}</div>
        <div class="mono-line">${fmt(m.consumption, 2)} lb/h · agota en ${fmt(m.duration, 1)} h</div>
        <div class="material-amount">
          Quedan <b style="color:${accent}">${fmt(remaining, 0)} lb</b>
          de ${fmt(m.inventory, 0)} lb (${fmt(remainPct, 0)}%)
        </div>
      </div>
      <div class="material-gaylords">
        ${gaylordGroup(remaining, accent, `inv-${m.id}`)}
      </div>
    </div>
  `;
}

function inventoryMode() {
  const limiting = materials[0];
  const maxTimeH = limiting.duration;
  const maxTimeDays = maxTimeH / 24;
  const approxRolls = !Number.isFinite(maxTimeH) || maxTimeH <= 0
    ? 0
    : Math.max(0, Math.round((maxTimeH * 60 - 120) / 150) * 2);

  return `
    <div class="stat-row">
      <div class="stat-card" style="border-top-color:${COLORS.teal}">
        <div class="stat-label">Tiempo máximo de operación</div>
        <div class="stat-value" style="color:${COLORS.teal}">${fmt(maxTimeH, 2)} h</div>
        <div class="stat-sub">≈ ${fmt(maxTimeDays, 2)} días</div>
      </div>
      <div class="stat-card" style="border-top-color:${COLORS.amber}">
        <div class="stat-label">Rollos aproximados</div>
        <div class="stat-value" style="color:${COLORS.amber}">${approxRolls}</div>
        <div class="stat-sub">al ritmo actual de blend</div>
      </div>
      <div class="stat-card" style="border-top-color:${COLORS.red}">
        <div class="stat-label">Material limitante</div>
        <div class="stat-value" style="color:${COLORS.red}">${limiting.id}</div>
        <div class="stat-sub">${limiting.grade}</div>
      </div>
    </div>

    <div class="panel">
      <div class="panel-label">Gaylords restantes al agotarse el material limitante (${limiting.id})</div>
      <div class="material-list">
        ${materials.map(m => materialRowInventory(m, limiting)).join("")}
      </div>
    </div>
  `;
}

function targetMode() {
  const cyclesNeeded = Math.ceil(Math.max(desiredRolls, 0) / 2);
  const timeNeededMin = cyclesNeeded > 0 ? 120 + cyclesNeeded * 150 : 0;
  const timeNeededH = timeNeededMin / 60;

  const targetMaterials = materials
    .map(m => {
      const needed = m.consumption * timeNeededH;
      const shortage = Math.max(0, needed - m.inventory);
      return { ...m, needed, shortage };
    })
    .sort((a, b) => b.needed - a.needed);

  const shortageList = targetMaterials.filter(m => m.shortage > 0.05);
  const hasShortage = shortageList.length > 0;

  return `
    <div class="panel">
      <div class="panel-label">¿Cuántos rollos quieres producir?</div>
      <div class="target-controls">
        <div class="stepper">
          <button class="step-btn" data-action="decrease">–</button>
          <input id="roll-input" class="num-input" type="number" min="0" value="${desiredRolls}">
          <button class="step-btn" data-action="increase">+</button>
          <span style="color:${COLORS.muted};font-size:13px">rollos</span>
        </div>

        <div class="preset-row">
          ${[8, 16, 24, 50].map(n =>
            `<button class="preset-btn" data-preset="${n}">${n}</button>`
          ).join("")}
        </div>
      </div>

      <div class="assumption-note">
        Cada ciclo produce 2 rollos en 150 min, más 120 min fijos de arranque de línea →
        se necesitan <b style="color:${COLORS.text}">${cyclesNeeded}</b> ciclo(s), es decir
        <b style="color:${COLORS.text}">${fmt(timeNeededH, 2)} h</b> de operación continua.
      </div>
    </div>

    <div class="banner ${hasShortage ? "warning" : "ok"}">
      ${hasShortage ? `
        <div class="banner-title warning">⚠ El inventario actual no alcanza para ${desiredRolls} rollos</div>
        <div class="banner-detail">
          ${shortageList.map(m =>
            `<div>Faltan <b>${fmt(m.shortage, 0)} lb</b> de <b>${m.grade}</b> (${m.id})</div>`
          ).join("")}
        </div>
      ` : `
        <div class="banner-title ok">✓ El inventario actual alcanza para producir ${desiredRolls} rollos</div>
      `}
    </div>

    <div class="panel">
      <div class="panel-label">Gaylords necesarios por material — ${desiredRolls} rollos</div>
      <div class="material-list">
        ${targetMaterials.map(m => {
          const accent = m.shortage > 0.05 ? COLORS.red : COLORS.teal;

          return `
            <div class="material-row">
              <div class="material-info">
                <div class="material-title">
                  <span class="id-badge">${m.id}</span>
                  <span style="font-weight:600;font-size:13.5px">${m.grade}</span>
                </div>
                <div class="supplier">${m.supplier}</div>
                <div class="mono-line">${fmt(m.consumption, 2)} lb/h</div>
                <div class="material-amount">
                  Necesitas <b style="color:${accent}">${fmt(m.needed, 0)} lb</b>
                  · hay ${fmt(m.inventory, 0)} lb en inventario
                  ${m.shortage > 0.05
                    ? `<span style="color:${COLORS.red}"> (faltan ${fmt(m.shortage, 0)} lb)</span>`
                    : ""}
                </div>
              </div>
              <div class="material-gaylords">
                ${gaylordGroup(m.needed, accent, `tgt-${m.id}`)}
              </div>
            </div>
          `;
        }).join("")}
      </div>
    </div>
  `;
}

function render() {
  const app = document.getElementById("app");

  app.innerHTML = `
    <div class="header">
      <div class="eyebrow">LÍNEA DE EXTRUSIÓN · ROLLOS DE PLÁSTICO</div>
      <h1>Simulador de consumo de material</h1>
      <p class="subhead">
        Con el inventario de gaylords disponible, calcula hasta cuándo puede correr la línea
        y cuántos rollos salen — o define una meta de rollos y te muestra, en gaylords de
        ${fmt(GAYLORD_CAPACITY, 0)} lb, exactamente cuánto material de cada uno necesitas.
      </p>
    </div>

    ${flowHtml()}

    <div class="segment">
      <button data-mode="inventory" class="${mode === "inventory" ? "active" : ""}">
        Producción con inventario actual
      </button>
      <button data-mode="target" class="${mode === "target" ? "active" : ""}">
        Definir cantidad de rollos
      </button>
    </div>

    <section>
      ${mode === "inventory" ? inventoryMode() : targetMode()}
    </section>
  `;

  document.querySelectorAll("[data-mode]").forEach(btn => {
    btn.addEventListener("click", () => {
      mode = btn.dataset.mode;
      render();
    });
  });

  document.querySelectorAll("[data-preset]").forEach(btn => {
    btn.addEventListener("click", () => {
      desiredRolls = Number(btn.dataset.preset);
      render();
    });
  });

  const input = document.getElementById("roll-input");
  if (input) {
    input.addEventListener("input", e => {
      const value = parseInt(e.target.value || "0", 10);
      desiredRolls = Math.max(0, Number.isFinite(value) ? value : 0);
      render();
      const newInput = document.getElementById("roll-input");
      if (newInput) {
        newInput.focus();
        newInput.setSelectionRange(newInput.value.length, newInput.value.length);
      }
    });
  }

  document.querySelectorAll("[data-action]").forEach(btn => {
    btn.addEventListener("click", () => {
      if (btn.dataset.action === "decrease") {
        desiredRolls = Math.max(0, desiredRolls - 2);
      } else {
        desiredRolls += 2;
      }
      render();
    });
  });
}

render();
