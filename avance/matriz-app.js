/* global React, ReactDOM, STATES, CICLOS, COURSES */
const { useState, useMemo, useRef, useEffect } = React;

const STATE_BY = Object.fromEntries(STATES.map((s) => [s.id, s]));
const CICLO_BY = Object.fromEntries(CICLOS.map((c) => [c.id, c]));
const COLS = [
  { key: 'u1', label: 'UMA 1', kind: 'uma', n: 1 },
  { key: 'u2', label: 'UMA 2', kind: 'uma', n: 2 },
  { key: 'u3', label: 'UMA 3', kind: 'uma', n: 3 },
  { key: 'u4', label: 'UMA 4', kind: 'uma', n: 4 },
  { key: 'u5', label: 'UMA 5', kind: 'uma', n: 5 },
  { key: 'u6', label: 'UMA 6', kind: 'uma', n: 6 },
  { key: 'cierre', label: 'Cierre', kind: 'cierre' },
  { key: 'h5p', label: 'Caso H5P', kind: 'h5p' },
];

function buildItems() {
  const items = [];
  COURSES.forEach((c) => {
    c.umas.forEach((u) => {
      u.resources.forEach((r, ri) => {
        items.push({ id: `c${c.num}-u${u.num}-r${ri}`, course: c, col: 'u' + u.num, uma: u, res: r, kind: 'uma' });
      });
    });
    if (c.cierre) items.push({ id: `c${c.num}-cierre`, course: c, col: 'cierre', uma: null, res: c.cierre, kind: 'cierre' });
    if (c.h5p) items.push({ id: `c${c.num}-h5p`, course: c, col: 'h5p', uma: null, res: c.h5p, kind: 'h5p' });
  });
  return items;
}
const ALL_ITEMS = buildItems();
const pad2 = (n) => String(n).padStart(2, '0');

const OVERRIDES_KEY = 'drj_matriz_overrides_v1';
function loadOverrides() {
  try { return JSON.parse(localStorage.getItem(OVERRIDES_KEY) || '{}'); } catch (e) { return {}; }
}
function saveOverrides(o) {
  try { localStorage.setItem(OVERRIDES_KEY, JSON.stringify(o)); } catch (e) {}
}

// Valores fijos (eran tweaks en el original, ahora constantes)
const T = {
  shape: 'rounded',
  fill: 'solid',
  cellLabel: 'code',
  density: 'regular',
  showBars: true,
  accent: '#1e40af',
};

function App() {
  const [overrides, setOverrides] = useState(loadOverrides);
  const [activeCiclos, setActiveCiclos] = useState(() => new Set(CICLOS.map((c) => c.id)));
  const [activeStates, setActiveStates] = useState(() => new Set());
  const [asesor, setAsesor] = useState('');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(null);
  const [tip, setTip] = useState(null);

  useEffect(() => { saveOverrides(overrides); }, [overrides]);

  const effState = (it) => overrides[it.id] || it.res.state;

  const cellMap = useMemo(() => {
    const m = {};
    ALL_ITEMS.forEach((it) => {
      const k = it.course.num + ':' + it.col;
      (m[k] = m[k] || []).push(it);
    });
    return m;
  }, []);

  const asesores = useMemo(() => {
    const s = new Set();
    ALL_ITEMS.forEach((it) => it.res.asesor && s.add(it.res.asesor));
    return [...s].sort();
  }, []);

  const counts = useMemo(() => {
    const c = Object.fromEntries(STATES.map((s) => [s.id, 0]));
    let total = 0;
    ALL_ITEMS.forEach((it) => {
      if (!activeCiclos.has(it.course.ciclo)) return;
      c[effState(it)]++; total++;
    });
    return { c, total };
  }, [activeCiclos, overrides]);

  const q = query.trim().toLowerCase();
  const matches = (it) => {
    if (asesor && it.res.asesor !== asesor) return false;
    if (q) {
      const hay = (it.course.name + ' ' + (it.uma ? it.uma.name : '') + ' ' + it.res.asesor).toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (activeStates.size && !activeStates.has(effState(it))) return false;
    return true;
  };
  const anyFilter = !!asesor || !!q || activeStates.size > 0;

  const visibleCourses = COURSES.filter((c) => activeCiclos.has(c.ciclo));

  const toggleCiclo = (id) => {
    setActiveCiclos((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n.size ? n : prev;
    });
  };
  const toggleState = (id) => {
    setActiveStates((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const cellH = T.density === 'compact' ? 30 : T.density === 'comfy' ? 52 : 40;
  const rowGap = T.density === 'compact' ? 4 : T.density === 'comfy' ? 8 : 6;
  const navW = 248;
  const umaW = 78;
  const extraW = 86;
  const gridTemplate = `${navW}px repeat(6, minmax(54px, ${umaW}px)) ${extraW}px ${extraW}px`;

  return (
    <div style={S.page}>
      <div style={S.wrap}>
        <section style={S.card}>
          <div style={S.cardHead}>
            <div>
              <h1 style={S.h1}>Matriz dinámica de estados — Banco de recursos interactivos</h1>
              <p style={S.lede}>
                Cada cruce relaciona un <b>curso</b> (fila, agrupado por <b>ciclo</b>) con una <b>UMA</b> o recurso
                de cierre (columna). El color indica el <b>estado de producción</b>. Pasa el cursor para ver el detalle,
                haz clic en una celda para abrir el panel y reasignar estados.
              </p>
            </div>
          </div>

          <div style={S.legend}>
            {STATES.map((s) => {
              const on = activeStates.has(s.id);
              const dim = activeStates.size && !on;
              return (
                <button key={s.id} onClick={() => toggleState(s.id)}
                  style={{ ...S.legChip, borderColor: on ? s.color : '#e5e8ef', background: on ? s.soft : '#fff', opacity: dim ? 0.45 : 1 }}>
                  <span style={{ ...S.legDot, background: s.color }} />
                  <span style={S.legLbl}>{s.label}</span>
                  <span style={{ ...S.legCount, color: s.tone, background: s.soft }}>{counts.c[s.id]}</span>
                </button>
              );
            })}
            <div style={S.legTotal}><b>{counts.total}</b> recursos</div>
          </div>

          <div style={S.controls}>
            <div style={S.ciclos}>
              {CICLOS.map((c) => {
                const on = activeCiclos.has(c.id);
                return (
                  <button key={c.id} onClick={() => toggleCiclo(c.id)}
                    style={{ ...S.cicloChip, borderColor: on ? c.color : '#e5e8ef', color: on ? c.color : '#9aa3b2', background: on ? c.soft : '#fff' }}>
                    <span style={{ ...S.cicloBar, background: c.color, opacity: on ? 1 : 0.3 }} />
                    {c.name}
                  </button>
                );
              })}
            </div>
            <div style={S.rightControls}>
              <select value={asesor} onChange={(e) => setAsesor(e.target.value)} style={S.select}>
                <option value="">Todos los asesores</option>
                {asesores.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar curso o UMA…" style={S.input} />
              {anyFilter && (
                <button style={S.clearBtn} onClick={() => { setAsesor(''); setQuery(''); setActiveStates(new Set()); }}>Limpiar</button>
              )}
            </div>
          </div>

          <div style={S.matrixScroll}>
            <div style={{ minWidth: navW + 6 * umaW + 2 * extraW + 40 }}>
              <div style={{ display: 'grid', gridTemplateColumns: gridTemplate, position: 'sticky', top: 0, zIndex: 5 }}>
                <div style={{ ...S.colHeadNav }}>Curso / Ciclo</div>
                {COLS.map((c) => (
                  <div key={c.key} style={{ ...S.colHead, ...(c.kind !== 'uma' ? S.colHeadExtra : {}) }}>{c.label}</div>
                ))}
              </div>

              {CICLOS.filter((cc) => activeCiclos.has(cc.id)).map((cc) => {
                const courses = visibleCourses.filter((c) => c.ciclo === cc.id);
                return (
                  <div key={cc.id}>
                    <div style={{ ...S.cicloBand, background: cc.soft, color: cc.color, borderLeft: `4px solid ${cc.color}` }}>
                      <span style={{ ...S.cicloBandDot, background: cc.color }} />
                      {cc.name}
                      <span style={S.cicloBandCount}>{courses.length} cursos</span>
                    </div>

                    {courses.map((course) => (
                      <div key={course.num} style={{ display: 'grid', gridTemplateColumns: gridTemplate, marginBottom: rowGap }}>
                        <CourseNav course={course} cc={cc} items={ALL_ITEMS.filter((it) => it.course.num === course.num)}
                          effState={effState} showBars={T.showBars} h={cellH} />
                        {COLS.map((col) => {
                          const items = cellMap[course.num + ':' + col.key] || [];
                          return (
                            <Cell key={col.key} items={items} col={col} t={T} h={cellH}
                              effState={effState} matches={matches} anyFilter={anyFilter}
                              onTip={setTip} onClick={() => items.length && setSelected({ course, col })} />
                          );
                        })}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </div>

      {tip && (
        <div style={{ ...S.tooltip, left: Math.min(tip.x + 14, window.innerWidth - 290), top: tip.y + 16 }}>
          <div style={S.tipHead}>
            <span style={{ ...S.tipDot, background: STATE_BY[tip.state].color }} />
            {STATE_BY[tip.state].label}
          </div>
          <div style={S.tipTitle}>{tip.title}</div>
          {tip.sub && <div style={S.tipSub}>{tip.sub}</div>}
          <div style={S.tipMeta}>
            <span>{tip.asesor || '—'}</span>
            {tip.fecha && <span>· entrega {tip.fecha}</span>}
          </div>
          {tip.raw && <div style={S.tipRaw}>Estado original: «{tip.raw}»</div>}
        </div>
      )}

      {selected && (
        <Drawer selected={selected} cellMap={cellMap} effState={effState}
          onClose={() => setSelected(null)}
          onSetState={(id, st) => setOverrides((o) => ({ ...o, [id]: st }))} />
      )}
    </div>
  );
}

function CourseNav({ course, cc, items, effState, showBars, h }) {
  const segs = STATES.map((s) => ({ s, n: items.filter((it) => effState(it) === s.id).length })).filter((x) => x.n);
  const total = items.length;
  return (
    <div style={{ ...S.navCell, minHeight: h, borderLeft: `3px solid ${cc.color}` }}>
      <div style={S.navTop}>
        <span style={S.navId}>{pad2(course.num)}</span>
        <span style={S.navName} title={course.name}>{course.name}</span>
      </div>
      {showBars && (
        <div style={S.navBar}>
          {segs.map(({ s, n }) => (
            <span key={s.id} title={`${s.label}: ${n}`} style={{ width: (n / total) * 100 + '%', background: s.color }} />
          ))}
        </div>
      )}
    </div>
  );
}

function Cell({ items, col, t, h, effState, matches, anyFilter, onTip, onClick }) {
  if (!items.length) {
    return <div style={{ ...S.cellWrap, minHeight: h }}><div style={S.cellEmpty}>·</div></div>;
  }
  const dim = anyFilter && !items.some(matches);
  const radius = t.shape === 'square' ? 4 : t.shape === 'dot' ? 999 : 8;
  const isDot = t.shape === 'dot';

  return (
    <div style={{ ...S.cellWrap, minHeight: h, opacity: dim ? 0.16 : 1 }}>
      <div style={{ display: 'flex', gap: 3, width: isDot ? 'auto' : '100%', height: isDot ? 'auto' : '100%', alignItems: 'center', justifyContent: 'center' }}
        onClick={onClick} role="button">
        {items.map((it) => {
          const st = STATE_BY[effState(it)];
          const bg = t.fill === 'soft' ? st.soft : st.color;
          const fg = t.fill === 'soft' ? st.tone : '#fff';
          const label = t.cellLabel === 'code' ? st.short : t.cellLabel === 'uma' ? (it.uma ? it.uma.num : (it.kind === 'h5p' ? 'H5' : 'C')) : '';
          const dotStyle = isDot
            ? { width: 16, height: 16, borderRadius: 999, background: st.color, border: t.fill === 'soft' ? `2px solid ${st.color}` : 'none', backgroundColor: t.fill === 'soft' ? st.soft : st.color }
            : { flex: 1, height: '100%', minHeight: h - 8, borderRadius: radius, background: bg, color: fg,
                border: t.fill === 'soft' ? `1px solid ${st.color}33` : 'none' };
          return (
            <div key={it.id} className="matrix-seg" style={{ ...S.seg, ...dotStyle }}
              onMouseEnter={(e) => onTip({ x: e.clientX, y: e.clientY, state: effState(it),
                title: it.uma ? `Curso ${it.course.num} · UMA ${it.uma.num}` : `Curso ${it.course.num} · ${col.label}`,
                sub: it.uma ? it.uma.name : it.res.label, asesor: it.res.asesor, fecha: it.res.fecha, raw: it.res.raw })}
              onMouseLeave={() => onTip(null)}>
              {!isDot && label && <span style={S.segLbl}>{label}</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Drawer({ selected, cellMap, effState, onClose, onSetState }) {
  const { course, col } = selected;
  const items = cellMap[course.num + ':' + col.key] || [];
  const cc = CICLO_BY[course.ciclo];
  return (
    <div style={S.drawerScrim} onClick={onClose}>
      <aside className="drawer-enter" style={S.drawer} onClick={(e) => e.stopPropagation()}>
        <div style={{ ...S.drawerHead, background: cc.soft }}>
          <div style={{ ...S.drawerCiclo, color: cc.color }}>
            <span style={{ ...S.cicloBandDot, background: cc.color }} />{cc.name}
          </div>
          <button style={S.drawerClose} onClick={onClose}>✕</button>
          <div style={S.drawerId}>Curso {pad2(course.num)} · {col.label}</div>
          <div style={S.drawerTitle}>{course.name}</div>
        </div>
        <div style={S.drawerBody}>
          {items.map((it) => {
            const cur = effState(it);
            return (
              <div key={it.id} style={S.resCard}>
                <div style={S.resType}>{it.res.type}</div>
                {it.uma && <div style={S.resUma}>UMA {it.uma.num} — {it.uma.name}</div>}
                {!it.uma && <div style={S.resUma}>{it.res.label}</div>}
                <div style={S.resMeta}>
                  <span><b>Asesor(a):</b> {it.res.asesor || '—'}</span>
                  {it.res.fecha && <span><b>Entrega:</b> {it.res.fecha}</span>}
                </div>
                {it.res.raw && <div style={S.resRaw}>Estado en hoja: «{it.res.raw}»</div>}
                <div style={S.stateRow}>
                  {STATES.map((s) => (
                    <button key={s.id} onClick={() => onSetState(it.id, s.id)}
                      style={{ ...S.stateBtn, background: cur === s.id ? s.color : s.soft,
                        color: cur === s.id ? '#fff' : s.tone, borderColor: cur === s.id ? s.color : 'transparent' }}>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </aside>
    </div>
  );
}

const MONO = "'JetBrains Mono','SFMono-Regular',ui-monospace,Menlo,monospace";
const S = {
  page: { minHeight: '100vh', background: '#eef1f6', fontFamily: "'Inter',system-ui,-apple-system,'Segoe UI',sans-serif", color: '#1f2738', paddingBottom: 60 },
  wrap: { maxWidth: 1320, margin: '0 auto', padding: '24px 28px 0' },
  card: { background: '#fff', border: '1px solid #e6e9f0', borderRadius: 14, boxShadow: '0 1px 2px rgba(20,30,60,.05), 0 8px 24px rgba(20,30,60,.04)', padding: '22px 24px 18px' },
  cardHead: { marginBottom: 16 },
  h1: { margin: 0, fontSize: 20, fontWeight: 700, letterSpacing: -0.3 },
  lede: { margin: '6px 0 0', fontSize: 13.5, lineHeight: 1.5, color: '#5b6577', maxWidth: 860 },

  legend: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, padding: '12px 0 14px', borderTop: '1px solid #eef1f6', borderBottom: '1px solid #eef1f6' },
  legChip: { display: 'inline-flex', alignItems: 'center', gap: 7, padding: '5px 9px 5px 8px', borderRadius: 999, border: '1px solid #e5e8ef', cursor: 'pointer', font: 'inherit', transition: 'all .12s' },
  legDot: { width: 11, height: 11, borderRadius: 3 },
  legLbl: { fontSize: 12.5, fontWeight: 500, color: '#36404f' },
  legCount: { fontSize: 11.5, fontWeight: 700, padding: '1px 7px', borderRadius: 999, minWidth: 18, textAlign: 'center' },
  legTotal: { marginLeft: 'auto', fontSize: 12.5, color: '#5b6577' },

  controls: { display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between', padding: '14px 0 16px' },
  ciclos: { display: 'flex', flexWrap: 'wrap', gap: 8 },
  cicloChip: { display: 'inline-flex', alignItems: 'center', gap: 7, padding: '6px 12px', borderRadius: 8, border: '1px solid #e5e8ef', cursor: 'pointer', font: 'inherit', fontSize: 12.5, fontWeight: 600, transition: 'all .12s' },
  cicloBar: { width: 8, height: 8, borderRadius: 2 },
  rightControls: { display: 'flex', gap: 8, alignItems: 'center' },
  select: { font: 'inherit', fontSize: 12.5, padding: '7px 10px', border: '1px solid #dfe3ec', borderRadius: 8, background: '#fff', color: '#36404f' },
  input: { font: 'inherit', fontSize: 12.5, padding: '7px 11px', border: '1px solid #dfe3ec', borderRadius: 8, width: 190, color: '#36404f' },
  clearBtn: { font: 'inherit', fontSize: 12, padding: '7px 11px', border: '1px solid #dfe3ec', borderRadius: 8, background: '#f6f7fb', color: '#5b6577', cursor: 'pointer' },

  matrixScroll: { overflowX: 'auto', overflowY: 'visible', paddingBottom: 6 },
  colHeadNav: { fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6, color: '#8a93a4', padding: '8px 10px', background: '#fbfcfe', position: 'sticky', left: 0, zIndex: 6, borderBottom: '1px solid #eef1f6' },
  colHead: { fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4, color: '#8a93a4', padding: '8px 4px', textAlign: 'center', background: '#fbfcfe', borderBottom: '1px solid #eef1f6' },
  colHeadExtra: { color: '#b0688f' },

  cicloBand: { display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', margin: '10px 0 8px', borderRadius: 6, fontSize: 12.5, fontWeight: 700, letterSpacing: 0.2 },
  cicloBandDot: { width: 9, height: 9, borderRadius: 3 },
  cicloBandCount: { marginLeft: 8, fontSize: 11, fontWeight: 500, opacity: 0.7 },

  navCell: { position: 'sticky', left: 0, zIndex: 4, background: '#fff', padding: '5px 10px 5px 11px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 5, borderRight: '1px solid #f0f2f7' },
  navTop: { display: 'flex', alignItems: 'baseline', gap: 8 },
  navId: { font: `700 11px ${MONO}`, color: '#cf3a3a', flexShrink: 0 },
  navName: { fontSize: 12.5, fontWeight: 600, color: '#2a3447', lineHeight: 1.25, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' },
  navBar: { display: 'flex', height: 5, borderRadius: 3, overflow: 'hidden', background: '#eef1f6' },

  cellWrap: { display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 4 },
  cellEmpty: { color: '#d6dbe4', fontSize: 16, lineHeight: 1, userSelect: 'none' },
  seg: { display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'transform .1s' },
  segLbl: { font: `700 9.5px ${MONO}`, letterSpacing: 0.3, opacity: 0.92 },

  tooltip: { position: 'fixed', zIndex: 50, width: 272, background: '#fff', border: '1px solid #e2e6ef', borderRadius: 10, boxShadow: '0 12px 30px rgba(20,30,60,.16)', padding: '11px 13px', pointerEvents: 'none' },
  tipHead: { display: 'flex', alignItems: 'center', gap: 7, fontSize: 11.5, fontWeight: 700, color: '#36404f' },
  tipDot: { width: 10, height: 10, borderRadius: 3 },
  tipTitle: { font: `700 11px ${MONO}`, color: '#1f2738', marginTop: 6 },
  tipSub: { fontSize: 12.5, color: '#2a3447', marginTop: 3, lineHeight: 1.35 },
  tipMeta: { display: 'flex', gap: 6, flexWrap: 'wrap', fontSize: 11.5, color: '#7c8698', marginTop: 6 },
  tipRaw: { fontSize: 11, color: '#a6aebc', marginTop: 6, fontStyle: 'italic' },

  drawerScrim: { position: 'fixed', inset: 0, background: 'rgba(20,28,48,.32)', zIndex: 40 },
  drawer: { position: 'fixed', top: 0, right: 0, bottom: 0, width: 430, maxWidth: '92vw', background: '#fff', boxShadow: '-12px 0 40px rgba(20,30,60,.18)', display: 'flex', flexDirection: 'column', zIndex: 41 },
  drawerHead: { padding: '18px 22px 16px', position: 'relative', borderBottom: '1px solid #eef1f6' },
  drawerCiclo: { display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12, fontWeight: 700 },
  drawerClose: { position: 'absolute', top: 14, right: 16, width: 30, height: 30, borderRadius: 8, border: '1px solid #e2e6ef', background: '#fff', cursor: 'pointer', color: '#5b6577', fontSize: 13 },
  drawerId: { font: `700 11px ${MONO}`, color: '#cf3a3a', marginTop: 10 },
  drawerTitle: { fontSize: 16, fontWeight: 700, lineHeight: 1.3, marginTop: 4, color: '#1f2738', paddingRight: 20 },
  drawerBody: { padding: 18, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 },
  resCard: { border: '1px solid #e9ecf3', borderRadius: 10, padding: '13px 14px', background: '#fbfcfe' },
  resType: { display: 'inline-block', fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: '#5b6577', background: '#eef1f6', padding: '2px 8px', borderRadius: 5 },
  resUma: { fontSize: 13.5, fontWeight: 600, color: '#2a3447', marginTop: 8, lineHeight: 1.35 },
  resMeta: { display: 'flex', flexWrap: 'wrap', gap: 12, fontSize: 12, color: '#5b6577', marginTop: 8 },
  resRaw: { fontSize: 11.5, color: '#9aa3b2', fontStyle: 'italic', marginTop: 7 },
  stateRow: { display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 11 },
  stateBtn: { font: 'inherit', fontSize: 11, fontWeight: 600, padding: '5px 9px', borderRadius: 999, border: '1px solid transparent', cursor: 'pointer', transition: 'all .1s' },
};

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
