import React, { useState, useMemo } from "react";

/* ---------------------------------------------------------------------- */
/* Datos base (tomados de Material_Consumption.xlsx)                       */
/* ---------------------------------------------------------------------- */

const RATE_A = 32.407914;
const RATE_BF = 108.467304;
const RATE_G = 24.25082;
const LINE_RATE = RATE_A + RATE_BF + RATE_G;
const GAYLORD_CAPACITY = 1500; // lb

const RAW_MATERIALS = [
  { id: "A", grade: "Marlex HHM 5502BN", supplier: "Chevron Phillips Chemicals", inventory: 1500, pctA: 0.83, pctBF: 0.051, pctG: 0.83 },
  { id: "C", grade: "D115", supplier: "Granic", inventory: 5000, pctA: 0, pctBF: 0.12, pctG: 0 },
  { id: "D", grade: "MB27", supplier: "Mutalc", inventory: 1900, pctA: 0, pctBF: 0.009, pctG: 0 },
  { id: "F", grade: "Marlex 1122B", supplier: "Chevron", inventory: 4875, pctA: 0, pctBF: 0.35, pctG: 0 },
  { id: "G", grade: "Clair FP120-D", supplier: "Nova Chemicals", inventory: 3375, pctA: 0.15, pctBF: 0, pctG: 0.15 },
  { id: "H", grade: "FIN-HD-007-BAG", supplier: "Biffa", inventory: 1500, pctA: 0, pctBF: 0.47, pctG: 0 },
  { id: "J", grade: "WH3028E", supplier: "Color Master Inc", inventory: 15, pctA: 0.02, pctBF: 0, pctG: 0.02 },
];

const EXTRUDER_INFO = [
  { key: "pctA", name: "Extrusora A", rate: RATE_A },
  { key: "pctBF", name: "Extrusora B/F", rate: RATE_BF },
  { key: "pctG", name: "Extrusora G", rate: RATE_G },
];

const COLORS = {
  bg: "#12151A",
  panel: "#1B1F27",
  panelAlt: "#20242E",
  border: "#2B3140",
  borderSoft: "#232833",
  teal: "#4BBAB0",
  tealSoft: "#2C4643",
  amber: "#E3A73E",
  amberSoft: "#4A3C22",
  red: "#DD5E55",
  redSoft: "#4A2A28",
  text: "#E9ECF1",
  muted: "#8891A0",
  mutedDim: "#5C6474",
  kraft: "#D8C39C",
  kraftStroke: "#9C7F55",
  kraftDark: "#6E5233",
  kraftPlank: "#8A6A44",
};

function computeMaterials() {
  return RAW_MATERIALS.map((m) => {
    const consumption = RATE_A * m.pctA + RATE_BF * m.pctBF + RATE_G * m.pctG;
    const duration = consumption > 0 ? m.inventory / consumption : Infinity;
    return { ...m, consumption, duration };
  }).sort((a, b) => a.duration - b.duration);
}

function fmt(n, dec = 1) {
  if (n === null || n === undefined || !isFinite(n)) return "—";
  return n.toLocaleString("es-CO", { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

/* ---------------------------------------------------------------------- */
/* Icono de gaylord (SVG) con nivel de llenado                             */
/* ---------------------------------------------------------------------- */

function GaylordIcon({ uid, fraction, accent, size = 56 }) {
  const clipId = `gclip-${uid}`;
  const x1 = 8, x2 = 92, y1 = 14, y2 = 110, c = 14;
  const boxPath = `M${x1 + c},${y1} L${x2 - c},${y1} L${x2},${y1 + c} L${x2},${y2 - c} L${x2 - c},${y2} L${x1 + c},${y2} L${x1},${y2 - c} L${x1},${y1 + c} Z`;
  const f = Math.max(0, Math.min(1, fraction));
  const fillH = f * (y2 - y1);
  const fillY = y2 - fillH;
  return (
    <svg viewBox="0 0 100 132" width={size} height={size * 1.32}>
      <defs>
        <clipPath id={clipId}>
          <path d={boxPath} />
        </clipPath>
      </defs>
      {/* pallet */}
      <rect x={x1 - 4} y={y2} width={x2 - x1 + 8} height={15} rx={1.5} fill={COLORS.kraftDark} />
      <rect x={x1 - 4} y={y2 + 4} width={x2 - x1 + 8} height={2} fill={COLORS.kraftPlank} />
      <rect x={x1 - 4} y={y2 + 9} width={x2 - x1 + 8} height={2} fill={COLORS.kraftPlank} />
      <rect x={22} y={y2 + 4} width={9} height={11} fill={COLORS.bg} />
      <rect x={x2 - 31} y={y2 + 4} width={9} height={11} fill={COLORS.bg} />
      {/* caja vacía (kraft) */}
      <path d={boxPath} fill={COLORS.kraft} stroke={COLORS.kraftStroke} strokeWidth="2" />
      {/* nivel de llenado */}
      {f > 0.004 && (
        <rect x="0" y={fillY} width="100" height={fillH} fill={accent} opacity="0.87" clipPath={`url(#${clipId})`} />
      )}
      {/* contorno encima */}
      <path d={boxPath} fill="none" stroke={COLORS.kraftStroke} strokeWidth="2" />
      {/* solapa superior */}
      <path d={`M${x1 + c},${y1} L50,${y1 + 7} L${x2 - c},${y1}`} fill="none" stroke={COLORS.kraftStroke} strokeWidth="1.4" opacity="0.55" />
    </svg>
  );
}

function GaylordGroup({ amountLb, accent, capacity = GAYLORD_CAPACITY, prefix }) {
  if (!amountLb || amountLb <= 0.5) {
    return <div style={{ fontSize: 12.5, color: COLORS.mutedDim, fontStyle: "italic" }}>No requiere gaylords</div>;
  }
  const fullCount = Math.floor(amountLb / capacity + 1e-9);
  const remainder = amountLb - fullCount * capacity;
  const hasPartial = remainder > 0.5;
  const totalCount = fullCount + (hasPartial ? 1 : 0);
  const MAX_ICONS = 8;

  const icons = [];
  if (fullCount <= MAX_ICONS) {
    for (let i = 0; i < fullCount; i++) icons.push({ key: `f${i}`, fraction: 1 });
    if (hasPartial) icons.push({ key: "p", fraction: remainder / capacity });
  } else {
    icons.push({ key: "f0", fraction: 1, multiplier: fullCount });
    if (hasPartial) icons.push({ key: "p", fraction: remainder / capacity });
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
        {icons.map((ic) => (
          <div key={ic.key} style={{ position: "relative", textAlign: "center" }}>
            <GaylordIcon uid={`${prefix}-${ic.key}`} fraction={ic.fraction} accent={accent} size={54} />
            {ic.multiplier && (
              <span style={styles.multiplierBadge}>×{ic.multiplier}</span>
            )}
            <div style={styles.gaylordCaption}>
              {ic.fraction >= 0.999 ? `${fmt(capacity, 0)} lb` : `${fmt(ic.fraction * capacity, 0)} lb`}
            </div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 12, color: COLORS.muted, marginTop: 8 }}>
        Total: <b style={{ color: COLORS.text }}>{totalCount}</b> gaylord{totalCount !== 1 ? "s" : ""} de {fmt(capacity, 0)} lb
        {hasPartial && fullCount > 0 &&
          ` (${fullCount} lleno${fullCount !== 1 ? "s" : ""} + 1 parcial al ${fmt((remainder / capacity) * 100, 0)}%)`}
        {hasPartial && fullCount === 0 && ` (1 parcial al ${fmt((remainder / capacity) * 100, 0)}%)`}
        {!hasPartial && fullCount > 0 && ` (todos llenos)`}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */

export default function ExtrusionSimulator() {
  const [mode, setMode] = useState("inventory");
  const [desiredRolls, setDesiredRolls] = useState(24);

  const materials = useMemo(computeMaterials, []);

  const limiting = materials[0];
  const maxTimeH = limiting.duration;
  const maxTimeDays = maxTimeH / 24;
  const approxRolls = useMemo(() => {
    if (!isFinite(maxTimeH) || maxTimeH <= 0) return 0;
    return Math.max(0, Math.round((maxTimeH * 60 - 120) / 150) * 2);
  }, [maxTimeH]);

  const cyclesNeeded = Math.ceil(Math.max(desiredRolls, 0) / 2);
  const timeNeededMin = cyclesNeeded > 0 ? 120 + cyclesNeeded * 150 : 0;
  const timeNeededH = timeNeededMin / 60;

  const targetMaterials = useMemo(() => {
    return materials
      .map((m) => {
        const needed = m.consumption * timeNeededH;
        const shortage = Math.max(0, needed - m.inventory);
        return { ...m, needed, shortage };
      })
      .sort((a, b) => b.needed - a.needed);
  }, [materials, timeNeededH]);

  const shortageList = targetMaterials.filter((m) => m.shortage > 0.05);
  const hasShortage = shortageList.length > 0;

  return (
    <div style={styles.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@500;600&display=swap');
        * { box-sizing: border-box; }
        .esim-seg button { transition: background .15s ease, color .15s ease; }
        .esim-num-btn { transition: background .15s ease, border-color .15s ease; }
        .esim-num-btn:hover { border-color: ${COLORS.teal} !important; }
        .esim-flow-wrap { display: flex; flex-wrap: wrap; align-items: stretch; justify-content: center; gap: 10px; }
        .esim-arrow { display: flex; align-items: center; justify-content: center; color: ${COLORS.mutedDim}; font-size: 20px; min-width: 20px; }
      `}</style>

      {/* ---------------- Encabezado ---------------- */}
      <div style={{ marginBottom: 22 }}>
        <div style={styles.eyebrow}>LÍNEA DE EXTRUSIÓN · ROLLOS DE PLÁSTICO</div>
        <h1 style={styles.h1}>Simulador de consumo de material</h1>
        <p style={styles.subhead}>
          Con el inventario de gaylords disponible, calcula hasta cuándo puede correr la línea
          y cuántos rollos salen — o define una meta de rollos y te muestra, en gaylords de{" "}
          {fmt(GAYLORD_CAPACITY, 0)} lb, exactamente cuánto material de cada uno necesitas.
        </p>
      </div>

      {/* ---------------- Diagrama del proceso ---------------- */}
      <div style={styles.panel}>
        <div style={styles.panelLabel}>El proceso</div>
        <div className="esim-flow-wrap">
          {EXTRUDER_INFO.map((ext) => {
            const feeders = materials.filter((m) => m[ext.key] > 0);
            return (
              <React.Fragment key={ext.key}>
                <div style={styles.flowBox}>
                  <div style={styles.flowBoxTitle}>{ext.name}</div>
                  <div style={styles.flowBoxRate}>{fmt(ext.rate)} lb/h</div>
                  <div style={styles.chipRow}>
                    {feeders.map((f) => (
                      <span key={f.id} style={styles.chip}>
                        {f.id} · {(f[ext.key] * 100).toFixed(0)}%
                      </span>
                    ))}
                  </div>
                </div>
                <div className="esim-arrow">→</div>
              </React.Fragment>
            );
          })}
          <div style={{ ...styles.flowBox, borderColor: COLORS.teal }}>
            <div style={styles.flowBoxTitle}>Línea de producción</div>
            <div style={{ ...styles.flowBoxRate, color: COLORS.teal }}>{fmt(LINE_RATE)} lb/h</div>
          </div>
          <div className="esim-arrow">→</div>
          <div style={{ ...styles.flowBox, borderColor: COLORS.amber, minWidth: 110 }}>
            <div style={styles.flowBoxTitle}>Rollos</div>
            <div style={{ ...styles.flowBoxRate, color: COLORS.amber }}>75 min c/u</div>
          </div>
        </div>
      </div>

      {/* ---------------- Selector de modo ---------------- */}
      <div className="esim-seg" style={styles.segWrap}>
        <button
          onClick={() => setMode("inventory")}
          style={{ ...styles.segBtn, ...(mode === "inventory" ? styles.segBtnActive : {}) }}
        >
          Producción con inventario actual
        </button>
        <button
          onClick={() => setMode("target")}
          style={{ ...styles.segBtn, ...(mode === "target" ? styles.segBtnActive : {}) }}
        >
          Definir cantidad de rollos
        </button>
      </div>

      {/* ================= MODO 1: INVENTARIO ================= */}
      {mode === "inventory" && (
        <>
          <div style={styles.statRow}>
            <StatCard label="Tiempo máximo de operación" value={`${fmt(maxTimeH, 2)} h`} sub={`≈ ${fmt(maxTimeDays, 2)} días`} accent={COLORS.teal} />
            <StatCard label="Rollos aproximados" value={approxRolls} sub="al ritmo actual de blend" accent={COLORS.amber} />
            <StatCard label="Material limitante" value={limiting.id} sub={limiting.grade} accent={COLORS.red} />
          </div>

          <div style={styles.panel}>
            <div style={styles.panelLabel}>Gaylords restantes al agotarse el material limitante ({limiting.id})</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 20, marginTop: 10 }}>
              {materials.map((m) => {
                const used = Math.min(m.inventory, m.consumption * maxTimeH);
                const remaining = Math.max(0, m.inventory - used);
                const remainPct = m.inventory > 0 ? (remaining / m.inventory) * 100 : 100;
                const isLimiting = m.id === limiting.id;
                const accent = isLimiting ? COLORS.red : remainPct < 25 ? COLORS.amber : COLORS.teal;
                return (
                  <div key={m.id} style={styles.materialRow}>
                    <div style={styles.materialInfo}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <span style={{ ...styles.idBadge, borderColor: isLimiting ? COLORS.red : COLORS.border, color: isLimiting ? COLORS.red : COLORS.text }}>{m.id}</span>
                        <span style={{ fontWeight: 600, fontSize: 13.5 }}>{m.grade}</span>
                      </div>
                      <div style={{ fontSize: 11.5, color: COLORS.muted }}>{m.supplier}</div>
                      <div style={{ fontSize: 12, color: COLORS.muted, marginTop: 6, fontFamily: "'IBM Plex Mono', monospace" }}>
                        {fmt(m.consumption, 2)} lb/h · agota en {fmt(m.duration, 1)} h
                      </div>
                      <div style={{ fontSize: 12.5, marginTop: 4 }}>
                        Quedan <b style={{ color: accent }}>{fmt(remaining, 0)} lb</b> de {fmt(m.inventory, 0)} lb ({fmt(remainPct, 0)}%)
                      </div>
                    </div>
                    <div style={styles.materialGaylords}>
                      <GaylordGroup amountLb={remaining} accent={accent} prefix={`inv-${m.id}`} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* ================= MODO 2: META DE ROLLOS ================= */}
      {mode === "target" && (
        <>
          <div style={styles.panel}>
            <div style={styles.panelLabel}>¿Cuántos rollos quieres producir?</div>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 10, flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button className="esim-num-btn" style={styles.stepBtn} onClick={() => setDesiredRolls((v) => Math.max(0, v - 2))}>–</button>
                <input
                  type="number"
                  value={desiredRolls}
                  min={0}
                  onChange={(e) => setDesiredRolls(Math.max(0, parseInt(e.target.value || "0", 10)))}
                  style={styles.numInput}
                />
                <button className="esim-num-btn" style={styles.stepBtn} onClick={() => setDesiredRolls((v) => v + 2)}>+</button>
                <span style={{ color: COLORS.muted, fontSize: 13 }}>rollos</span>
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {[8, 16, 24, 50].map((n) => (
                  <button key={n} className="esim-num-btn" style={styles.presetBtn} onClick={() => setDesiredRolls(n)}>
                    {n}
                  </button>
                ))}
              </div>
            </div>
            <div style={styles.assumptionNote}>
              Cada ciclo produce 2 rollos en 150 min, más 120 min fijos de arranque de línea →
              se necesitan <b style={{ color: COLORS.text }}>{cyclesNeeded}</b> ciclo(s), es decir{" "}
              <b style={{ color: COLORS.text }}>{fmt(timeNeededH, 2)} h</b> de operación continua.
            </div>
          </div>

          <div
            style={{
              ...styles.banner,
              borderColor: hasShortage ? COLORS.red : COLORS.teal,
              background: hasShortage ? COLORS.redSoft : COLORS.tealSoft,
            }}
          >
            {hasShortage ? (
              <>
                <div style={{ fontWeight: 600, color: COLORS.red, marginBottom: 4 }}>
                  ⚠ El inventario actual no alcanza para {desiredRolls} rollos
                </div>
                <div style={{ fontSize: 13, color: COLORS.text, lineHeight: 1.6 }}>
                  {shortageList.map((m) => (
                    <div key={m.id}>
                      Faltan <b>{fmt(m.shortage, 0)} lb</b> de <b>{m.grade}</b> ({m.id})
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div style={{ fontWeight: 600, color: COLORS.teal }}>
                ✓ El inventario actual alcanza para producir {desiredRolls} rollos
              </div>
            )}
          </div>

          <div style={styles.panel}>
            <div style={styles.panelLabel}>Gaylords necesarios por material — {desiredRolls} rollos</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 20, marginTop: 10 }}>
              {targetMaterials.map((m) => {
                const accent = m.shortage > 0.05 ? COLORS.red : COLORS.teal;
                return (
                  <div key={m.id} style={styles.materialRow}>
                    <div style={styles.materialInfo}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <span style={styles.idBadge}>{m.id}</span>
                        <span style={{ fontWeight: 600, fontSize: 13.5 }}>{m.grade}</span>
                      </div>
                      <div style={{ fontSize: 11.5, color: COLORS.muted }}>{m.supplier}</div>
                      <div style={{ fontSize: 12, color: COLORS.muted, marginTop: 6, fontFamily: "'IBM Plex Mono', monospace" }}>
                        {fmt(m.consumption, 2)} lb/h
                      </div>
                      <div style={{ fontSize: 12.5, marginTop: 4 }}>
                        Necesitas <b style={{ color: accent }}>{fmt(m.needed, 0)} lb</b> · hay {fmt(m.inventory, 0)} lb en inventario
                        {m.shortage > 0.05 && <span style={{ color: COLORS.red }}> (faltan {fmt(m.shortage, 0)} lb)</span>}
                      </div>
                    </div>
                    <div style={styles.materialGaylords}>
                      <GaylordGroup amountLb={m.needed} accent={accent} prefix={`tgt-${m.id}`} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ label, value, sub, accent }) {
  return (
    <div style={{ ...styles.statCard, borderTopColor: accent }}>
      <div style={styles.statLabel}>{label}</div>
      <div style={{ ...styles.statValue, color: accent }}>{value}</div>
      <div style={styles.statSub}>{sub}</div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Estilos                                                                  */
/* ---------------------------------------------------------------------- */

const styles = {
  page: {
    background: COLORS.bg,
    color: COLORS.text,
    fontFamily: "'Inter', sans-serif",
    padding: "28px 22px",
    minHeight: "100%",
    borderRadius: 10,
  },
  eyebrow: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 11,
    letterSpacing: 1.2,
    color: COLORS.teal,
    marginBottom: 8,
  },
  h1: {
    fontFamily: "'Space Grotesk', sans-serif",
    fontSize: 26,
    fontWeight: 700,
    margin: "0 0 8px 0",
  },
  subhead: {
    color: COLORS.muted,
    fontSize: 14.5,
    lineHeight: 1.55,
    maxWidth: 660,
    margin: 0,
  },
  panel: {
    background: COLORS.panel,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 6,
    padding: "18px 18px",
    marginBottom: 16,
  },
  panelLabel: {
    fontFamily: "'Space Grotesk', sans-serif",
    fontSize: 13,
    fontWeight: 600,
    color: COLORS.text,
    marginBottom: 10,
  },
  flowBox: {
    background: COLORS.panelAlt,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 5,
    padding: "10px 14px",
    minWidth: 150,
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
  },
  flowBoxTitle: { fontSize: 12.5, fontWeight: 600, marginBottom: 3 },
  flowBoxRate: { fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, color: COLORS.muted, marginBottom: 6 },
  chipRow: { display: "flex", flexWrap: "wrap", gap: 4 },
  chip: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 10.5,
    color: COLORS.text,
    background: COLORS.bg,
    border: `1px solid ${COLORS.borderSoft}`,
    borderRadius: 3,
    padding: "1.5px 5px",
  },
  segWrap: {
    display: "inline-flex",
    background: COLORS.panelAlt,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 6,
    padding: 3,
    marginBottom: 18,
    gap: 3,
  },
  segBtn: {
    background: "transparent",
    border: "none",
    color: COLORS.muted,
    fontSize: 13,
    fontWeight: 500,
    padding: "8px 14px",
    borderRadius: 4,
    cursor: "pointer",
  },
  segBtnActive: {
    background: COLORS.teal,
    color: "#0E1512",
    fontWeight: 600,
  },
  statRow: { display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 16 },
  statCard: {
    flex: "1 1 200px",
    background: COLORS.panel,
    border: `1px solid ${COLORS.border}`,
    borderTop: "3px solid",
    borderRadius: 6,
    padding: "14px 16px",
  },
  statLabel: { fontSize: 12, color: COLORS.muted, marginBottom: 8 },
  statValue: { fontFamily: "'IBM Plex Mono', monospace", fontSize: 26, fontWeight: 600, lineHeight: 1 },
  statSub: { fontSize: 12, color: COLORS.mutedDim, marginTop: 6 },
  materialRow: {
    display: "grid",
    gridTemplateColumns: "230px 1fr",
    gap: 18,
    paddingBottom: 18,
    borderBottom: `1px solid ${COLORS.borderSoft}`,
  },
  materialInfo: { minWidth: 0 },
  materialGaylords: { display: "flex", alignItems: "flex-start" },
  idBadge: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 11,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 4,
    padding: "1px 6px",
  },
  multiplierBadge: {
    position: "absolute",
    top: -6,
    right: -6,
    background: COLORS.amber,
    color: "#241C0E",
    borderRadius: "50%",
    width: 24,
    height: 24,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 10.5,
    fontWeight: 700,
    border: `2px solid ${COLORS.panel}`,
  },
  gaylordCaption: {
    fontSize: 10,
    color: COLORS.muted,
    marginTop: 3,
    fontFamily: "'IBM Plex Mono', monospace",
  },
  stepBtn: {
    width: 30, height: 30, borderRadius: 4, border: `1px solid ${COLORS.border}`,
    background: COLORS.panelAlt, color: COLORS.text, fontSize: 16, cursor: "pointer",
  },
  numInput: {
    width: 84, height: 30, borderRadius: 4, border: `1px solid ${COLORS.border}`,
    background: COLORS.panelAlt, color: COLORS.text, fontSize: 15, textAlign: "center",
    fontFamily: "'IBM Plex Mono', monospace",
  },
  presetBtn: {
    height: 30, padding: "0 10px", borderRadius: 4, border: `1px solid ${COLORS.border}`,
    background: "transparent", color: COLORS.muted, fontSize: 12.5, cursor: "pointer",
  },
  assumptionNote: { fontSize: 12.5, color: COLORS.muted, marginTop: 12, lineHeight: 1.6 },
  banner: { border: "1px solid", borderRadius: 6, padding: "12px 16px", marginBottom: 16 },
};
