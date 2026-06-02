/* ============================================================
   Datos de producción — OVAs RISE / H5P
   Jerarquía: Ciclo (Nivel de formación) → Curso → UMA → Recurso → Estado
   Fuente: "Relación cursos y UMA - Producción OVAs RISE-H5P.csv"
   ============================================================ */

window.STATES = [
  { id: 'sin_iniciar',    label: 'Sin iniciar',    short: 'SI', color: '#94a3b8', soft: '#eef1f5', tone: '#475569', order: 0 },
  { id: 'en_elaboracion', label: 'En elaboración', short: 'EL', color: '#3b82f6', soft: '#e6effe', tone: '#1d4ed8', order: 1 },
  { id: 'en_revision',    label: 'En revisión',    short: 'RV', color: '#f59e0b', soft: '#fdf2dc', tone: '#b45309', order: 2 },
  { id: 'en_ajustes',     label: 'En ajustes',     short: 'AJ', color: '#ef4444', soft: '#fde8e8', tone: '#b91c1c', order: 3 },
  { id: 'implementado',   label: 'Implementado',   short: 'IM', color: '#14b8a6', soft: '#dcf5f1', tone: '#0f766e', order: 4 },
  { id: 'aprobado',       label: 'Aprobado',       short: 'AP', color: '#16a34a', soft: '#ddf3e4', tone: '#15803d', order: 5 },
];

// Mapea un estado crudo del CSV a uno de los 6 estados canónicos
window.mapState = function (raw) {
  const r = (raw || '').toLowerCase().trim();
  if (!r || r.includes('por asignar')) return 'sin_iniciar';
  if (r.includes('montaje') || r.includes('aula virtual')) return 'implementado';
  if (r.includes('aprob')) return 'aprobado';
  if (r.includes('ajuste')) return 'en_ajustes';
  if (r.includes('revis')) return 'en_revision';
  if (r.includes('guioniz') || r.includes('diseño') || r.includes('diseno')) return 'en_elaboracion';
  return 'sin_iniciar';
};

window.CICLOS = [
  { id: 'b1',  name: 'Básico 1',   color: '#2563eb', soft: '#e8effb' },
  { id: 'b2',  name: 'Básico 2',   color: '#7c3aed', soft: '#efe8fb' },
  { id: 'int', name: 'Intermedio', color: '#0891b2', soft: '#e0f2f7' },
  { id: 'av',  name: 'Avanzado',   color: '#be185d', soft: '#fbe8f1' },
];

// Atajo para construir un recurso
function R(type, label, asesor, fecha, raw, link) {
  return { type, label, asesor, fecha: fecha || '', raw: raw || '', state: window.mapState(raw), link: link || '' };
}
const RISE = (asesor, fecha, raw, link) => R('OVA RISE', 'OVA en RISE', asesor, fecha, raw, link);
const CIERRE = R('Infografía', 'Infografía de cierre', 'Asesor/a 7', '', '', '');
const H5P = R('Caso H5P', 'OVA H5P · caso ramificado + podcast', 'Asesor/a 1', '', '', '');

window.COURSES = [
  /* ---------------- BÁSICO 1 ---------------- */
  { num: 1, ciclo: 'b1', name: 'Marco conceptual de género e interseccionalidad',
    umas: [
      { num: 1, name: 'Perspectiva histórica del enfoque de género', resources: [
        R('OVA RISE', 'OVA en RISE (parte 1)', 'Asesor/a 1', '11 may 2026', 'Listo para montaje en aula virtual', ''),
        R('OVA RISE', 'OVA en RISE (parte 2)', 'Asesor/a 1', '11 may 2026', 'Listo para montaje en aula virtual', ''),
      ]},
      { num: 2, name: 'De la historia a la clasificación del relacionamiento socio-sexual (siglo XX)', resources: [RISE('Asesor/a 1', '11 may 2026', 'Lista para diseño')] },
      { num: 3, name: 'Integración del pensamiento femenino camino a la interseccionalidad', resources: [RISE('Asesor/a 1', '14 may 2026', 'Lista para diseño')] },
      { num: 4, name: 'Reconocimiento a la protección de los DD.HH. de las mujeres (siglo XX)', resources: [RISE('Asesor/a 1', '21 may 2026', 'Lista para diseño')] },
      { num: 5, name: 'La conceptualización de sesgos y estereotipos', resources: [RISE('Asesor/a 1', '21 may 2026', 'Lista para diseño')] },
    ], cierre: CIERRE },

  { num: 2, ciclo: 'b1', name: 'Normativa nacional e internacional: marco constitucional y legal',
    umas: [
      { num: 1, name: 'Sistema internacional de protección de los derechos de las mujeres', resources: [RISE('Asesor/a 1', '21 may 2026', 'Lista para diseño')] },
      { num: 2, name: 'Sistema internacional de DD.HH. desde la interseccionalidad', resources: [RISE('Asesor/a 1', '21 may 2026', 'Lista para diseño')] },
      { num: 3, name: 'Marco constitucional del enfoque de género', resources: [RISE('Asesor/a 1', '21 may 2026', 'Lista para diseño')] },
      { num: 4, name: 'Normativa nacional sobre género, interseccionalidad y VBG', resources: [RISE('Asesor/a 1', '21 may 2026', 'Lista para diseño')] },
    ], cierre: CIERRE },

  { num: 3, ciclo: 'b1', name: 'Tipologías de Violencias Basadas en Género',
    umas: [
      { num: 1, name: 'Las violencias y su impacto en el género', resources: [RISE('Asesor/a 2', '26 may 2026', 'Lista para diseño')] },
      { num: 2, name: 'Las violencias y su reflejo en la interseccionalidad', resources: [RISE('Asesor/a 2', '26 may 2026', 'Lista para diseño')] },
      { num: 3, name: 'Tipos de violencias producidas en espacios privados', resources: [RISE('Asesor/a 2', '26 may 2026', 'Lista para diseño')] },
      { num: 4, name: 'Tipos de violencias producidas en espacios públicos', resources: [RISE('Asesor/a 3', '26 may 2026', 'Lista para diseño')] },
    ], cierre: CIERRE },

  /* ---------------- BÁSICO 2 ---------------- */
  { num: 4, ciclo: 'b2', name: 'Enfoque Diferencial Étnico-Racial',
    umas: [
      { num: 1, name: 'Perspectiva histórica de los roles de mujeres indígenas y negras', resources: [RISE('Asesor/a 3', '26 may 2026', 'Lista para diseño')] },
      { num: 2, name: 'Impacto del racismo estructural en las mujeres racializadas', resources: [RISE('Asesor/a 3', '26 may 2026', 'Lista para diseño')] },
      { num: 3, name: 'Impacto del racismo estructural en las mujeres indígenas', resources: [RISE('Asesor/a 1', '28 may 2026', 'Lista para diseño')] },
      { num: 4, name: 'Protocolos y estándares: mujeres indígenas y afrodescendientes', resources: [RISE('Asesor/a 1', '28 may 2026', 'Lista para diseño')] },
      { num: 5, name: 'Interseccionalidad aplicada: superar la invisibilización', resources: [RISE('Asesor/a 1', '28 may 2026', 'Lista para diseño')] },
    ], cierre: CIERRE },

  { num: 5, ciclo: 'b2', name: 'Enfoque Diferencial LGBTIQ+ y Discapacidad',
    umas: [
      { num: 1, name: 'Evolución histórica del sistema de relaciones socio-sexuales', resources: [RISE('Asesor/a 1', '28 may 2026', 'Lista para diseño')] },
      { num: 2, name: 'Evolución histórica del concepto de la discapacidad', resources: [RISE('Asesor/a 1', '28 may 2026', 'Lista para diseño')] },
      { num: 3, name: 'Protocolos y estándares: derechos LGBTIQ+ y discapacidad', resources: [RISE('Asesor/a 1', '28 may 2026', 'Lista para diseño')] },
      { num: 4, name: 'Interseccionalidad aplicada: diagnósticos y sistemas socio-sexuales', resources: [RISE('Asesor/a 6', '29 may 2026', 'En ajustes', '')] },
    ], cierre: CIERRE },

  { num: 6, ciclo: 'b2', name: 'Mujeres en el territorio: enfoques diferenciales',
    umas: [
      { num: 1, name: 'Brechas generacionales en el acceso a la justicia en la ruralidad', resources: [RISE('Asesor/a 4', '29 may 2026', 'En revisión de Natalia')] },
      { num: 2, name: 'Relaciones territorio–mujeres: origen de la violencia patrimonial', resources: [RISE('Asesor/a 4', '29 may 2026', 'En revisión de Natalia')] },
      { num: 3, name: 'Protocolos: niñas y mujeres mayores en territorio urbano y rural', resources: [RISE('Asesor/a 4', '29 may 2026', 'En revisión de Natalia')] },
      { num: 4, name: 'Interseccionalidad: modelo patriarcal y propiedad privada', resources: [RISE('Asesor/a 5', '29 may 2026', 'En guionización')] },
    ], cierre: CIERRE },

  /* ---------------- INTERMEDIO ---------------- */
  { num: 7, ciclo: 'int', name: 'Interseccionalidad aplicada: casos complejos',
    umas: [
      { num: 1, name: 'Análisis del contexto sociocultural: caso por género', resources: [RISE('Asesor/a 2', '1 jun 2026', 'En revisión de Natalia')] },
      { num: 2, name: 'Caso de personas con discapacidad', resources: [RISE('Asesor/a 2', '1 jun 2026', 'En revisión de Natalia')] },
      { num: 3, name: 'Caso por rango etario', resources: [RISE('Asesor/a 2', '1 jun 2026', 'En guionización')] },
      { num: 4, name: 'Caso por etnia, territorio y clase', resources: [RISE('Asesor/a 3', '1 jun 2026', 'En revisión de Natalia')] },
      { num: 5, name: 'Factores múltiples de discriminación: estereotipos cruzados', resources: [RISE('Asesor/a 3', '1 jun 2026', 'En revisión de Natalia')] },
    ], cierre: CIERRE, h5p: H5P },

  { num: 8, ciclo: 'int', name: 'Protocolos y rutas interinstitucionales de atención',
    umas: [
      { num: 1, name: '¿Cómo se activa la debida diligencia?', resources: [RISE('Asesor/a 3', '1 jun 2026', 'En revisión de Natalia')] },
      { num: 2, name: 'Debida diligencia en violencias por medios sexuales', resources: [RISE('Asesor/a 1', '4 jun 2026', 'En guionización')] },
      { num: 3, name: 'La debida diligencia en otras violencias', resources: [RISE('Asesor/a 1', '4 jun 2026', 'En guionización')] },
      { num: 4, name: 'Identificación de fallas de la debida diligencia', resources: [RISE('Asesor/a 1', '4 jun 2026', 'En guionización')] },
      { num: 5, name: 'Construyendo el mapa para aplicar la debida diligencia', resources: [RISE('Asesor/a 6', '8 jun 2026', 'En guionización')] },
    ], cierre: CIERRE, h5p: H5P },

  { num: 9, ciclo: 'int', name: 'Prevención de la revictimización',
    umas: [
      { num: 1, name: 'La huella invisible de la víctima', resources: [RISE('Asesor/a 1', '4 jun 2026', 'En guionización')] },
      { num: 2, name: 'Marco normativo: claves para la no revictimización', resources: [RISE('Asesor/a 1', '4 jun 2026', 'En guionización')] },
      { num: 3, name: 'Condición política de las víctimas de VBG', resources: [RISE('Asesor/a 1', '4 jun 2026', 'En guionización')] },
      { num: 4, name: 'Enfoques de protección ante la revictimización', resources: [RISE('Asesor/a 5', '4 jun 2026', 'POR ASIGNAR')] },
      { num: 5, name: 'Enfoque de género que transforma el despacho judicial', resources: [RISE('Asesor/a 4', '5 jun 2026', 'En guionización')] },
    ], cierre: CIERRE, h5p: H5P },

  { num: 10, ciclo: 'int', name: 'De la teoría al expediente: valoración probatoria',
    umas: [
      { num: 1, name: 'Estándares de la valoración de la prueba', resources: [RISE('Asesor/a 4', '5 jun 2026', 'En guionización')] },
      { num: 2, name: 'Valoración probatoria con enfoque de género', resources: [RISE('Asesor/a 4', '5 jun 2026', 'En guionización')] },
      { num: 3, name: 'Desigualdades en la valoración probatoria', resources: [RISE('Asesor/a 2', '9 jun 2026', 'En guionización')] },
      { num: 4, name: 'Estereotipos en la valoración probatoria', resources: [RISE('Asesor/a 2', '9 jun 2026', 'En guionización')] },
      { num: 5, name: 'Sesgos en la valoración probatoria', resources: [RISE('Asesor/a 2', '9 jun 2026', 'En guionización')] },
    ], cierre: CIERRE, h5p: H5P },

  /* ---------------- AVANZADO ---------------- */
  { num: 11, ciclo: 'av', name: 'Lenguaje inclusivo y no sexista en el ámbito judicial',
    umas: [
      { num: 1, name: 'La comunicación: el poder de nombrar', resources: [RISE('Asesor/a 2', '9 jun 2026', 'En guionización')] },
      { num: 2, name: 'El uso del lenguaje en el ámbito judicial', resources: [RISE('Asesor/a 3', '9 jun 2026', 'En guionización')] },
      { num: 3, name: 'Efectos del lenguaje en el reconocimiento', resources: [RISE('Asesor/a 3', '9 jun 2026', 'En guionización')] },
      { num: 4, name: 'La aplicación del lenguaje en ámbitos judiciales', resources: [RISE('Asesor/a 3', '9 jun 2026', 'En guionización')] },
    ], cierre: CIERRE, h5p: H5P },

  { num: 12, ciclo: 'av', name: 'Autoconciencia y transformación personal',
    umas: [
      { num: 1, name: '¿Por qué los prejuicios generan resistencia?', resources: [RISE('Asesor/a 3', '9 jun 2026', 'En guionización')] },
      { num: 2, name: '¿Cuál fue la primera vez que sintió que tenía derechos?', resources: [RISE('Asesor/a 1', '11 jun 2026', 'POR ASIGNAR')] },
      { num: 3, name: '¿Quién soy y cómo afectan mis prejuicios?', resources: [RISE('Asesor/a 1', '11 jun 2026', 'POR ASIGNAR')] },
      { num: 4, name: 'Prima la humanidad: quien juzga siempre será persona', resources: [RISE('Asesor/a 4', '11 jun 2026', 'POR ASIGNAR')] },
      { num: 5, name: 'Reflexión sobre las consecuencias de mis prejuicios', resources: [RISE('Asesor/a 6', '8 jun 2026', 'En guionización')] },
    ], cierre: CIERRE, h5p: H5P },

  { num: 13, ciclo: 'av', name: 'Cultura organizacional y cambio institucional',
    umas: [
      { num: 1, name: 'Construyendo una cultura con enfoque de género', resources: [RISE('Asesor/a 4', '11 jun 2026', 'POR ASIGNAR')] },
      { num: 2, name: 'Realidades institucionales: el triángulo de la violencia', resources: [RISE('Asesor/a 4', '11 jun 2026', 'POR ASIGNAR')] },
      { num: 3, name: 'Observar el estado actual del enfoque de género', resources: [RISE('Asesor/a 4', '11 jun 2026', 'POR ASIGNAR')] },
      { num: 4, name: 'Analizar lo observado frente al enfoque de género', resources: [RISE('Asesor/a 8', '4 jun 2026', 'En guionización')] },
      { num: 5, name: 'Cómo transformar el despacho hacia el enfoque de género', resources: [RISE('Asesor/a 8', '4 jun 2026', 'En guionización')] },
      { num: 6, name: '¿Cómo superar resistencias, tensiones y emociones?', resources: [RISE('Asesor/a 8', '4 jun 2026', 'En guionización')] },
    ], cierre: CIERRE, h5p: H5P },

  { num: 14, ciclo: 'av', name: 'De enseñar contenidos a formar pedagógicamente',
    umas: [
      { num: 1, name: '¿Qué es la pedagogía con enfoque de género?', resources: [RISE('Asesor/a 9', '', 'POR ASIGNAR')] },
      { num: 2, name: 'Pedagogía que deconstruye las relaciones hegemónicas', resources: [RISE('Asesor/a 9', '', 'POR ASIGNAR')] },
      { num: 3, name: 'Contra-pedagogías de la crueldad de género', resources: [RISE('Asesor/a 9', '', 'POR ASIGNAR')] },
      { num: 4, name: '¿Cómo aprenden los adultos? Seis principios', resources: [RISE('Asesor/a 9', '', 'POR ASIGNAR')] },
      { num: 5, name: 'Aprendizaje transformativo', resources: [RISE('Asesor/a 9', '', 'POR ASIGNAR')] },
      { num: 6, name: 'Reflexión sobre el rol de formador y formadora', resources: [RISE('Asesor/a 9', '', 'POR ASIGNAR')] },
    ], cierre: CIERRE, h5p: H5P },
];
