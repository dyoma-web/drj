// ===================================
// Sistema de Gestión de Entregables
// Google Sheets como fuente de verdad
// ===================================

let deliverablesData = null;
let currentDeliverableId = null;
let dataSource = 'local'; // 'sheets' | 'local'
let _currentComments = []; // Comments array for active modal

// Config: qué fase determina las fechas del cronograma
// Valores: 'ultima_fecha' (default) | 'en_elaboracion' | 'en_revision' | 'en_ajuste' | 'enviado' | 'aprobado'
let _cronogramaFechaRef = 'ultima_fecha';

// ===================================
// Bloqueo de edición
// ===================================
const EDIT_PASSWORD = 'P4p1SHvl0';
window._dashboardEditUnlocked = false;

function toggleEditLock() {
    if (window._dashboardEditUnlocked) {
        // Bloquear
        window._dashboardEditUnlocked = false;
        updateEditLockUI();
    } else {
        // Pedir clave
        const pwd = prompt('Ingrese la clave de edición:');
        if (pwd === EDIT_PASSWORD) {
            window._dashboardEditUnlocked = true;
            updateEditLockUI();
        } else if (pwd !== null) {
            alert('Clave incorrecta');
        }
    }
}

function updateEditLockUI() {
    const btn = document.getElementById('editLockBtn');
    if (!btn) return;
    const icon = btn.querySelector('.edit-lock-icon');
    const text = btn.querySelector('.edit-lock-text');

    const reportBtn = document.getElementById('btnReport');

    if (window._dashboardEditUnlocked) {
        btn.classList.add('unlocked');
        btn.classList.remove('locked');
        if (icon) icon.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>';
        if (text) text.textContent = 'Edicion activa';
        if (reportBtn) reportBtn.style.display = 'flex';
    } else {
        btn.classList.add('locked');
        btn.classList.remove('unlocked');
        if (icon) icon.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>';
        if (text) text.textContent = 'Solo lectura';
        if (reportBtn) reportBtn.style.display = 'none';
    }
}

// ===================================
// Constantes
// ===================================
const STATUS_CONFIG = {
    'no_iniciado':    { label: 'No iniciado',     progress: 0   },
    'en_elaboracion': { label: 'En elaboración',  progress: 30  },
    'enviado':        { label: 'Enviado',         progress: 50  },
    'en_revision':    { label: 'En revisión',     progress: 65  },
    'en_ajuste':      { label: 'En ajuste',       progress: 75  },
    'aprobado':       { label: 'Aprobado',        progress: 100 }
};

const ABSOLUTE_STATES = ['no_iniciado', 'enviado', 'aprobado'];
const PROCESS_STATES  = ['en_elaboracion', 'en_revision', 'en_ajuste'];
const MILESTONE_STATES = ['enviado', 'aprobado'];
const DURATION_STATES  = ['en_elaboracion', 'en_revision', 'en_ajuste'];

const MILESTONE_COLORS = {
    'enviado':  '#86efac',  // verde claro
    'aprobado': '#10b981'   // verde aprobado
};

const DEFAULT_PHASE_ORDER = ['no_iniciado', 'en_elaboracion', 'enviado', 'en_revision', 'en_ajuste', 'aprobado'];
const RESPONSIBLE_OPTIONS = ['Innovahub', 'EJRLB', 'Externo'];

const STAGE_WEIGHTS = {
    '1': 10, '2': 30, '3': 35, '4': 22, '5': 3
};

// Actividades estimadas por entregable según su naturaleza/complejidad real.
// Estos valores se usan como default cuando el entregable no tiene un valor manual asignado.
const DEFAULT_ACTIVIDADES = {
    // Etapa 1 - Planificación (productos ya entregados)
    '1.1.1': 15, // Plan general del proyecto
    '1.1.2': 5,  // Presentación del plan
    '1.2.1': 20, // Análisis de contexto y diagnóstico
    '1.2.2': 8,  // Informe de actividades y hallazgos
    '1.3.1': 12, // Resultados de revisión de insumos
    '1.3.2': 10, // Matriz de información sistematizada
    '1.3.3': 8,  // Carpeta compartida indizada
    '1.3.4': 5,  // Informe de avance (corte)

    // Etapa 2 - Desarrollo curricular (columna vertebral del proyecto)
    '2.1.1': 25, // Documento del ciclo y rutas de aprendizaje
    '2.1.2': 15, // Esquema gráfico del ciclo
    '2.1.3': 10, // Informe del taller de validación
    '2.1.4': 12, // Infografía Sentencia T-016 e informe
    '2.1.5': 8,  // Informe de actividades y recomendaciones
    '2.2.1': 55, // 14 syllabus digitales (×14 espacios curriculares)
    '2.2.2': 45, // 14 guías didácticas para discentes
    '2.2.3': 30, // 14 informes de talleres de validación
    '2.2.4': 8,  // Informe de actividades diseño formativo
    '2.3.1': 20, // Diseño de metodología innovadora
    '2.3.2': 8,  // Presentación de la metodología
    '2.3.3': 8,  // Informe de actividades metodología
    '2.4.1': 15, // Lineamientos de monitoreo
    '2.4.2': 12, // Instrumentos de recolección
    '2.4.3': 10, // Matriz de indicadores
    '2.4.4': 18, // Tablero de control (dashboard)
    '2.4.5': 10, // Protocolo de seguimiento
    '2.4.6': 8,  // Informe de validación mecanismos
    '2.4.7': 6,  // Informe de actividades mecanismos
    '2.5.1': 15, // Diseño del entorno virtual
    '2.5.2': 12, // Informe de pruebas funcionalidad
    '2.5.3': 8,  // Plan de ajustes del entorno
    '2.5.4': 10, // Guía técnica implementación
    '2.5.5': 15, // 5 piezas promocionales
    '2.5.6': 6,  // Informe de actividades virtualización
    '2.6.1': 18, // Diseño funcional y gráfico micrositio
    '2.6.2': 10, // Informe de pruebas micrositio
    '2.6.3': 8,  // Manual de administración micrositio
    '2.6.4': 35, // Versión final del micrositio web
    '2.6.5': 6,  // Informe de actividades micrositio

    // Etapa 3 - Virtualización de contenidos (mayor volumen de producción)
    '3.1.1': 55, // 14 guiones instruccionales
    '3.1.2': 25, // 14 informes de revisión experto temático
    '3.1.3': 20, // Informe de ajustes a guiones
    '3.1.4': 15, // Manual técnico-pedagógico Moodle
    '3.1.5': 12, // Manual de usuario por roles
    '3.1.6': 8,  // Informe lecciones aprendidas
    '3.1.7': 6,  // Informe consolidado
    '3.2.1': 40, // Banco de recursos interactivos
    '3.2.2': 25, // Actividades interactivas y lúdicas
    '3.2.3': 15, // Recursos de navegación guiada
    '3.2.4': 12, // Materiales descargables
    '3.2.5': 8,  // Repositorio estructurado
    '3.2.6': 10, // Informe validación pedagógica
    '3.3.1': 45, // 14 EVA configurados en Moodle
    '3.3.2': 12, // Manual de usuario entorno virtual
    '3.3.3': 6,  // Informe de actividades configuración
    '3.4.1': 25, // Módulos LMS, alertas y dashboard
    '3.4.2': 10, // Instrumentos de recolección integrados
    '3.4.3': 15, // Repositorio código fuente
    '3.4.4': 12, // Informe técnico y videos
    '3.4.5': 10, // Manual uso administradores/tutores
    '3.4.6': 12, // Especificaciones técnicas integración
    '3.4.7': 5,  // Informe de avance (corte)

    // Etapa 4 - Pruebas e implementación
    '4.1.1': 12, // Plan de pruebas funcionales
    '4.1.2': 15, // Informe resultados pruebas funcionales
    '4.1.3': 10, // Protocolo pruebas usabilidad
    '4.1.4': 12, // Informe resultados usabilidad
    '4.1.5': 10, // Informe ajustes post-usabilidad
    '4.1.6': 8,  // Checklist validación técnica
    '4.2.1': 15, // Plan implementación piloto
    '4.2.2': 5,  // Registro participantes
    '4.2.3': 12, // Informe evaluación piloto
    '4.2.4': 10, // Informe ajustes post-piloto
    '4.2.5': 3,  // Acta cierre piloto
    '4.3.1': 8,  // Documento transferencia PI
    '4.3.2': 45, // 14 paquetes SCORM funcionales
    '4.3.3': 12, // Paquete micrositio y script
    '4.3.4': 8,  // Guía instalación SCORM
    '4.3.5': 3,  // Acta entrega SCORM
    '4.3.6': 3,  // Acta entrega micrositio

    // Etapa 5 - Transferencia y cierre
    '5.1.1': 12, // Plan capacitación y materiales
    '5.1.2': 3,  // Registro asistencia
    '5.1.3': 8,  // Informe capacitación
    '5.1.4': 5,  // Informe de avance (corte)
    '5.1.5': 10, // Informe final de ejecución (cierre)
    'FAC':   3,  // Facturación
};

function getDefaultActividades(delId) {
    return DEFAULT_ACTIVIDADES[delId] || 13;
}

function getActividades(del) {
    return parseInt(del.actividades, 10) || getDefaultActividades(del.id);
}

const STATUS_COLORS = {
    'no_iniciado':    '#d1d5db',
    'en_elaboracion': '#3b82f6',
    'enviado':        '#8b5cf6',
    'en_revision':    '#f59e0b',
    'en_ajuste':      '#f43f5e',
    'aprobado':       '#10b981'
};

// ===================================
// Utilidad: limpiar fechas ISO → yyyy-MM-dd
// ===================================
function cleanDateStr(val) {
    if (!val) return '';
    const s = String(val).trim();
    // Ya es yyyy-MM-dd
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    // ISO como "2026-01-02T05:00:00.000Z" → extraer parte de fecha
    const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
    if (m) return m[1];
    // Intentar parsear como Date
    const d = new Date(s);
    if (!isNaN(d.getTime())) {
        return d.getFullYear() + '-' +
            String(d.getMonth() + 1).padStart(2, '0') + '-' +
            String(d.getDate()).padStart(2, '0');
    }
    return s;
}

// Formato de última actualización: "Marzo 01 de 2026 - 07:16"
function formatLastUpdate(date) {
    if (!date) date = new Date();
    const months = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    const day = String(date.getDate()).padStart(2, '0');
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${month} ${day} de ${year} - ${hours}:${minutes}`;
}

// ===================================
// Sistema de comentarios (observaciones)
// ===================================
function parseComments(val) {
    if (!val) return [];
    const s = String(val).trim();
    if (!s) return [];
    // Try JSON parse
    if (s.charAt(0) === '[') {
        try { return JSON.parse(s); } catch (e) { /* fallback below */ }
    }
    // Legacy: plain text → single comment
    return [{ id: 'legacy_' + Date.now(), date: '', text: s }];
}

function serializeComments(arr) {
    if (!arr || arr.length === 0) return '';
    return JSON.stringify(arr);
}

function formatCommentDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T00:00:00');
    if (isNaN(d.getTime())) return dateStr;
    const months = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    return d.getDate() + ' ' + months[d.getMonth()] + ' ' + d.getFullYear();
}

function renderComments(readOnly) {
    const container = document.getElementById('modalCommentsList');
    if (!container) return;

    if (_currentComments.length === 0) {
        container.innerHTML = '<div class="comments-empty">Sin observaciones</div>';
    } else {
        let html = '';
        for (const c of _currentComments) {
            html += '<div class="comment-item" data-comment-id="' + c.id + '">';
            html += '<div class="comment-header">';
            html += '<span class="comment-date">' + formatCommentDate(c.date) + '</span>';
            if (!readOnly) {
                html += '<div class="comment-actions">';
                html += '<button class="comment-btn comment-edit-btn" onclick="editComment(\'' + c.id + '\')" title="Editar">&#9998;</button>';
                html += '<button class="comment-btn comment-delete-btn" onclick="deleteComment(\'' + c.id + '\')" title="Eliminar">&times;</button>';
                html += '</div>';
            }
            html += '</div>';
            html += '<div class="comment-text">' + escapeHtml(c.text) + '</div>';
            html += '</div>';
        }
        container.innerHTML = html;
    }

    // Show/hide add section
    const addSection = document.getElementById('commentAddSection');
    if (addSection) addSection.style.display = readOnly ? 'none' : '';
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function addComment() {
    const textarea = document.getElementById('newCommentText');
    if (!textarea) return;
    const text = textarea.value.trim();
    if (!text) return;

    const today = new Date().toISOString().split('T')[0];
    _currentComments.push({
        id: 'c' + Date.now(),
        date: today,
        text: text
    });

    textarea.value = '';
    renderComments(false);
    checkModalDirty();
}

function editComment(id) {
    const item = document.querySelector('.comment-item[data-comment-id="' + id + '"]');
    if (!item) return;
    const comment = _currentComments.find(c => c.id === id);
    if (!comment) return;

    const textDiv = item.querySelector('.comment-text');
    const actionsDiv = item.querySelector('.comment-actions');

    // Replace text with textarea
    textDiv.innerHTML = '<textarea class="comment-edit-textarea" id="editText_' + id + '" rows="2">' + escapeHtml(comment.text) + '</textarea>';
    textDiv.querySelector('textarea').value = comment.text; // Set value properly

    // Replace actions with save/cancel
    actionsDiv.innerHTML =
        '<button class="comment-btn comment-save-btn" onclick="saveCommentEdit(\'' + id + '\')" title="Guardar">&#10003;</button>' +
        '<button class="comment-btn comment-cancel-btn" onclick="cancelCommentEdit()" title="Cancelar">&#10007;</button>';
}

function saveCommentEdit(id) {
    const textarea = document.getElementById('editText_' + id);
    if (!textarea) return;
    const newText = textarea.value.trim();
    if (!newText) return;

    const comment = _currentComments.find(c => c.id === id);
    if (comment) {
        comment.text = newText;
    }
    renderComments(false);
    checkModalDirty();
}

function cancelCommentEdit() {
    renderComments(false);
}

function deleteComment(id) {
    if (!confirm('¿Eliminar este comentario?')) return;
    _currentComments = _currentComments.filter(c => c.id !== id);
    renderComments(false);
    checkModalDirty();
}

// ===================================
// Ciclos: Migración y helpers
// ===================================
function ensureCycles(del) {
    if (del.cycles && del.cycles.length > 0) return;
    // Migrar entregable legacy a un ciclo con todas las fases por defecto
    del.cycles = [createDefaultCycle(del, 'Ciclo 1')];
}

function createDefaultCycle(del, name) {
    const cycle = {
        id: 'cyc_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        name: name || 'Nuevo ciclo',
        phases: DEFAULT_PHASE_ORDER.map(status => {
            const phase = { status };
            if (DURATION_STATES.includes(status)) {
                phase.startDate = '';
                phase.endDate = '';
                phase.responsible = '';
            } else if (MILESTONE_STATES.includes(status)) {
                phase.date = '';
                phase.responsible = '';
            }
            // no_iniciado has no dates/responsible
            return phase;
        })
    };

    // If the deliverable already had data, populate the first cycle
    if (del && del.status && del.status !== 'no_iniciado') {
        const activePhase = cycle.phases.find(p => p.status === del.status);
        if (activePhase) {
            if (DURATION_STATES.includes(del.status)) {
                activePhase.startDate = del.startDate || '';
                activePhase.endDate = del.dueDate || '';
                activePhase.responsible = del.responsible || '';
            } else if (MILESTONE_STATES.includes(del.status)) {
                activePhase.date = del.dueDate || '';
                activePhase.responsible = del.responsible || '';
            }
        }
    }

    return cycle;
}

function createEmptyCycle(name) {
    return {
        id: 'cyc_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        name: name || 'Nuevo ciclo',
        phases: DEFAULT_PHASE_ORDER.map(status => {
            const phase = { status };
            if (DURATION_STATES.includes(status)) {
                phase.startDate = '';
                phase.endDate = '';
                phase.responsible = '';
            } else if (MILESTONE_STATES.includes(status)) {
                phase.date = '';
                phase.responsible = '';
            }
            return phase;
        })
    };
}

function getCycleStatus(cycle) {
    // If aprobado phase has a date → cycle is approved
    const aprobado = cycle.phases.find(p => p.status === 'aprobado');
    if (aprobado && aprobado.date) return 'aprobado';

    const today = new Date().toISOString().slice(0, 10);

    // 1. Find the phase where today falls within its date range
    for (const p of cycle.phases) {
        if (DURATION_STATES.includes(p.status) && p.startDate && p.endDate) {
            if (p.startDate <= today && today <= p.endDate) return p.status;
        }
        if (MILESTONE_STATES.includes(p.status) && p.date === today) return p.status;
    }

    // 2. If today is past all dated phases, return the last one with dates
    for (let i = cycle.phases.length - 1; i >= 0; i--) {
        const p = cycle.phases[i];
        if (DURATION_STATES.includes(p.status) && p.endDate && p.endDate < today) return p.status;
        if (MILESTONE_STATES.includes(p.status) && p.date && p.date < today) return p.status;
    }

    // 3. If today is before all dated phases → not started yet
    return 'no_iniciado';
}

function isCycleApproved(cycle) {
    return getCycleStatus(cycle) === 'aprobado';
}

function getCycleDateRange(cycle) {
    let min = null, max = null;
    for (const p of cycle.phases) {
        const dates = [];
        if (p.startDate) dates.push(p.startDate);
        if (p.endDate) dates.push(p.endDate);
        if (p.date) dates.push(p.date);
        for (const d of dates) {
            const clean = cleanDateStr(d);
            if (!clean) continue;
            if (!min || clean < min) min = clean;
            if (!max || clean > max) max = clean;
        }
    }
    return { min, max };
}

/** Returns { startDate, endDate } for a deliverable based on _cronogramaFechaRef config.
 *  mode='config' uses _cronogramaFechaRef filter (for Gantt), mode='all' uses all dated phases (for table display) */
function getDeliverableScheduleDates(del, mode) {
    if (!del.cycles || del.cycles.length === 0) {
        return { startDate: del.startDate || null, endDate: del.dueDate || null };
    }

    const useAll = mode === 'all' || _cronogramaFechaRef === 'ultima_fecha';
    let minDate = null, maxDate = null;

    for (const cycle of del.cycles) {
        for (const phase of cycle.phases) {
            if (!useAll && phase.status !== _cronogramaFechaRef) continue;

            const dates = [];
            if (phase.startDate) dates.push(cleanDateStr(phase.startDate));
            if (phase.endDate) dates.push(cleanDateStr(phase.endDate));
            if (phase.date) dates.push(cleanDateStr(phase.date));

            for (const d of dates) {
                if (!d) continue;
                if (!minDate || d < minDate) minDate = d;
                if (!maxDate || d > maxDate) maxDate = d;
            }
        }
    }

    // Fallback to legacy dates if no matching phase dates found
    if (!minDate) minDate = cleanDateStr(del.startDate);
    if (!maxDate) maxDate = cleanDateStr(del.dueDate);

    return { startDate: minDate || null, endDate: maxDate || null };
}

function getDeliverableProgressFromCycles(del) {
    if (!del.cycles || del.cycles.length === 0) return 0;

    const today = new Date().toISOString().slice(0, 10);

    // Collect all phases with dates across all cycles (excluding no_iniciado)
    const datedPhases = [];
    for (const cycle of del.cycles) {
        for (const phase of cycle.phases) {
            if (phase.status === 'no_iniciado') continue;
            const hasDates = (DURATION_STATES.includes(phase.status) && phase.startDate && phase.endDate)
                          || (MILESTONE_STATES.includes(phase.status) && phase.date);
            if (hasDates) datedPhases.push(phase);
        }
    }

    if (datedPhases.length === 0) return 0;

    // Each dated phase has equal weight; "aprobado" always completes to 100%
    const phaseWeight = 100 / datedPhases.length;
    let progress = 0;

    for (const phase of datedPhases) {
        if (phase.status === 'aprobado') {
            // Aprobado is a milestone: completed if date exists and date <= today
            if (phase.date && phase.date <= today) progress += phaseWeight;
        } else if (DURATION_STATES.includes(phase.status)) {
            if (phase.endDate < today) {
                // Phase fully completed
                progress += phaseWeight;
            } else if (phase.startDate <= today) {
                // Phase in progress: partial credit based on elapsed time
                const start = new Date(phase.startDate + 'T00:00:00');
                const end = new Date(phase.endDate + 'T00:00:00');
                const now = new Date(today + 'T00:00:00');
                const total = Math.max(1, (end - start) / 86400000);
                const elapsed = Math.max(0, (now - start) / 86400000);
                progress += phaseWeight * Math.min(1, elapsed / total);
            }
            // Future phases contribute 0
        } else if (MILESTONE_STATES.includes(phase.status)) {
            // Enviado milestone: completed if date <= today
            if (phase.date && phase.date <= today) progress += phaseWeight;
        }
    }

    return Math.min(100, Math.round(progress));
}

// Get active phase status for a phase within a cycle context
function getPhaseVisualState(cycle, phaseIndex) {
    if (isCycleApproved(cycle)) return 'approved-cycle';

    const phase = cycle.phases[phaseIndex];
    if (phase.status === 'no_iniciado') return 'skip';

    const today = new Date().toISOString().slice(0, 10);
    const isDuration = DURATION_STATES.includes(phase.status);
    const isMilestone = MILESTONE_STATES.includes(phase.status);

    if (isDuration && phase.startDate && phase.endDate) {
        if (phase.endDate < today) return 'completed';
        if (phase.startDate <= today) return 'active';
        return 'future';
    }
    if (isMilestone && phase.date) {
        if (phase.date < today) return 'completed';
        if (phase.date === today) return 'active';
        return 'future';
    }

    // No dates: use order-based fallback
    const cycleStatus = getCycleStatus(cycle);
    const cycleStatusIdx = DEFAULT_PHASE_ORDER.indexOf(cycleStatus);
    const phaseStatusIdx = DEFAULT_PHASE_ORDER.indexOf(phase.status);
    if (phaseStatusIdx < cycleStatusIdx) return 'completed';
    if (phaseStatusIdx === cycleStatusIdx) return 'active';
    return 'future';
}

/** Get the active phase status for a deliverable (based on today's date across all cycles) */
function getActivePhaseStatus(del) {
    if (!del.cycles || del.cycles.length === 0) return del.status;
    const today = new Date().toISOString().slice(0, 10);

    for (const cycle of del.cycles) {
        if (isCycleApproved(cycle)) continue;
        for (const phase of cycle.phases) {
            const isDuration = DURATION_STATES.includes(phase.status);
            if (isDuration && phase.startDate && phase.endDate) {
                if (phase.startDate <= today && today <= phase.endDate) return phase.status;
            }
            const isMilestone = MILESTONE_STATES.includes(phase.status);
            if (isMilestone && phase.date === today) return phase.status;
        }
    }
    // Fallback: use getCycleStatus of first non-approved cycle
    for (const cycle of del.cycles) {
        if (!isCycleApproved(cycle)) return getCycleStatus(cycle);
    }
    return 'aprobado';
}

/** Returns { startDate, endDate } based on the currently active phase.
 *  - If a phase is active today (date range includes today), use its dates.
 *  - If no phase is active (not started), use "en_elaboracion" dates from first non-approved cycle.
 *  - startDate is always the earliest date across all phases (for Gantt start). */
function getActivePhaseSchedule(del) {
    if (!del.cycles || del.cycles.length === 0) {
        return { startDate: del.startDate || null, endDate: del.dueDate || null };
    }

    const today = new Date().toISOString().slice(0, 10);

    // Get global start date (earliest date across all phases)
    let globalMin = null;
    for (const cycle of del.cycles) {
        for (const phase of cycle.phases) {
            const dates = [phase.startDate, phase.endDate, phase.date]
                .map(d => cleanDateStr(d)).filter(Boolean);
            for (const d of dates) {
                if (!globalMin || d < globalMin) globalMin = d;
            }
        }
    }

    // Find the active phase using EXACT same logic as getActivePhaseStatus
    const activeStatus = getActivePhaseStatus(del);

    // Find the LAST matching phase across all cycles (last cycle takes priority)
    let lastMatchEnd = null;
    for (const cycle of del.cycles) {
        if (isCycleApproved(cycle)) continue;
        for (const phase of cycle.phases) {
            if (phase.status !== activeStatus) continue;
            const isDuration = DURATION_STATES.includes(phase.status);
            if (isDuration && phase.startDate && phase.endDate) {
                if (phase.startDate <= today && today <= phase.endDate) {
                    lastMatchEnd = cleanDateStr(phase.endDate);
                }
            }
            const isMilestone = MILESTONE_STATES.includes(phase.status);
            if (isMilestone && phase.date) {
                if (phase.date <= today) lastMatchEnd = cleanDateStr(phase.date);
            }
        }
    }
    if (lastMatchEnd) return { startDate: globalMin, endDate: lastMatchEnd };

    // Fallback: find last phase with that status that has dates
    for (const cycle of [...del.cycles].reverse()) {
        if (isCycleApproved(cycle)) continue;
        for (const phase of cycle.phases) {
            if (phase.status !== activeStatus) continue;
            if (phase.endDate) return { startDate: globalMin, endDate: cleanDateStr(phase.endDate) };
            if (phase.date) return { startDate: globalMin, endDate: cleanDateStr(phase.date) };
        }
    }

    // No active phase: use en_elaboracion from first non-approved cycle
    for (const cycle of del.cycles) {
        if (isCycleApproved(cycle)) continue;
        for (const phase of cycle.phases) {
            if (phase.status === 'en_elaboracion' && phase.endDate) {
                return { startDate: globalMin, endDate: cleanDateStr(phase.endDate) };
            }
        }
    }

    // Final fallback: use global min/max
    let globalMax = null;
    for (const cycle of del.cycles) {
        for (const phase of cycle.phases) {
            const dates = [phase.startDate, phase.endDate, phase.date]
                .map(d => cleanDateStr(d)).filter(Boolean);
            for (const d of dates) {
                if (!globalMax || d > globalMax) globalMax = d;
            }
        }
    }
    return { startDate: globalMin, endDate: globalMax };
}

/** Get the responsible from the active phase (or first phase with a responsible) */
function getActivePhaseResponsible(del) {
    if (!del.cycles || del.cycles.length === 0) return del.responsible || '';
    const today = new Date().toISOString().slice(0, 10);

    // First: try to get responsible from the currently active phase
    for (const cycle of del.cycles) {
        if (isCycleApproved(cycle)) continue;
        for (const phase of cycle.phases) {
            const isDuration = DURATION_STATES.includes(phase.status);
            if (isDuration && phase.startDate && phase.endDate) {
                if (phase.startDate <= today && today <= phase.endDate && phase.responsible) return phase.responsible;
            }
            const isMilestone = MILESTONE_STATES.includes(phase.status);
            if (isMilestone && phase.date === today && phase.responsible) return phase.responsible;
        }
    }

    // Fallback: first phase with a responsible assigned (in any cycle)
    for (const cycle of del.cycles) {
        for (const phase of cycle.phases) {
            if (phase.responsible) return phase.responsible;
        }
    }

    return del.responsible || '';
}

// ===================================
// Dirty tracking (cambios sin guardar)
// ===================================
let modalOriginalValues = {};
let modalIsDirty = false;
let _modalCycles = []; // Working copy of cycles for active modal

function captureModalSnapshot() {
    modalOriginalValues = {
        cycles: JSON.stringify(_modalCycles),
        comments: JSON.stringify(_currentComments),
        url: document.getElementById('modalDelUrl').value
    };
    modalIsDirty = false;
    updateDirtyIndicator();
}

function checkModalDirty() {
    const current = {
        cycles: JSON.stringify(_modalCycles),
        comments: JSON.stringify(_currentComments),
        url: document.getElementById('modalDelUrl').value
    };
    modalIsDirty = Object.keys(modalOriginalValues).some(
        key => current[key] !== modalOriginalValues[key]
    );
    updateDirtyIndicator();
}

function updateDirtyIndicator() {
    const indicator = document.getElementById('unsavedIndicator');
    const saveBtn = document.getElementById('btnSaveDeliverable');
    if (!indicator || !saveBtn) return;

    if (modalIsDirty) {
        indicator.classList.add('visible');
        saveBtn.classList.add('has-changes');
    } else {
        indicator.classList.remove('visible');
        saveBtn.classList.remove('has-changes');
    }
}

function setupDirtyTracking() {
    const el = document.getElementById('modalDelUrl');
    if (el) el.addEventListener('change', checkModalDirty);
}

// ===================================
// Modal: Cycle rendering & management
// ===================================
function renderModalCycles(readOnly) {
    const container = document.getElementById('modalCyclesList');
    if (!container) return;

    const addBtn = document.getElementById('btnAddCycle');
    if (addBtn) addBtn.style.display = readOnly ? 'none' : '';

    if (_modalCycles.length === 0) {
        container.innerHTML = '<div class="cycles-empty">Sin ciclos definidos</div>';
        return;
    }

    let html = '';
    for (let ci = 0; ci < _modalCycles.length; ci++) {
        const cycle = _modalCycles[ci];
        const cycleStatus = getCycleStatus(cycle);
        const isApproved = cycleStatus === 'aprobado';
        const statusLabel = STATUS_CONFIG[cycleStatus] ? STATUS_CONFIG[cycleStatus].label : cycleStatus;

        html += '<div class="cycle-item' + (isApproved ? ' cycle-approved' : '') + '" data-cycle-index="' + ci + '">';

        // Cycle header (collapsible)
        html += '<div class="cycle-header" onclick="toggleCycleAccordion(' + ci + ')">';
        html += '<div class="cycle-header-left">';
        html += '<span class="cycle-arrow" id="cycleArrow' + ci + '">&#9654;</span>';
        if (!readOnly) {
            html += '<input type="text" class="cycle-name-input" value="' + escapeHtml(cycle.name) + '" onclick="event.stopPropagation()" onchange="updateCycleName(' + ci + ', this.value)">';
        } else {
            html += '<span class="cycle-name">' + escapeHtml(cycle.name) + '</span>';
        }
        html += '</div>';
        html += '<div class="cycle-header-right">';
        html += '<span class="del-status-badge status-' + cycleStatus + '">' + statusLabel + '</span>';
        if (!readOnly) {
            html += '<div class="btn-group-cycle">';
            if (ci > 0) html += '<button class="btn-move" onclick="event.stopPropagation();moveCycle(' + ci + ',-1)" title="Subir ciclo">&#9650;</button>';
            if (ci < _modalCycles.length - 1) html += '<button class="btn-move" onclick="event.stopPropagation();moveCycle(' + ci + ',1)" title="Bajar ciclo">&#9660;</button>';
            html += '<button class="btn-remove-cycle" onclick="event.stopPropagation();removeCycle(' + ci + ')" title="Eliminar ciclo">&times;</button>';
            html += '</div>';
        }
        html += '</div>';
        html += '</div>';

        // Cycle body (phases) - collapsed by default
        html += '<div class="cycle-body" id="cycleBody' + ci + '" style="display:none;">';

        for (let pi = 0; pi < cycle.phases.length; pi++) {
            const phase = cycle.phases[pi];
            const phaseLabel = STATUS_CONFIG[phase.status] ? STATUS_CONFIG[phase.status].label : phase.status;
            const isDuration = DURATION_STATES.includes(phase.status);
            const isMilestone = MILESTONE_STATES.includes(phase.status);
            const isNoIniciado = phase.status === 'no_iniciado';

            html += '<div class="phase-row">';
            html += '<div class="phase-info">';
            html += '<span class="phase-status-dot" style="background:' + STATUS_COLORS[phase.status] + '"></span>';
            html += '<span class="phase-label">' + phaseLabel + '</span>';
            if (isMilestone) html += '<span class="phase-type-badge">Hito</span>';
            html += '</div>';

            if (!isNoIniciado) {
                html += '<div class="phase-fields">';
                if (isDuration) {
                    html += '<div class="phase-field"><label>Inicio</label><input type="date" value="' + (phase.startDate || '') + '"' + (readOnly ? ' disabled' : '') + ' onchange="updatePhaseField(' + ci + ',' + pi + ',\'startDate\',this.value)"></div>';
                    html += '<div class="phase-field"><label>Fin</label><input type="date" value="' + (phase.endDate || '') + '"' + (readOnly ? ' disabled' : '') + ' onchange="updatePhaseField(' + ci + ',' + pi + ',\'endDate\',this.value)"></div>';
                } else if (isMilestone) {
                    html += '<div class="phase-field"><label>Fecha</label><input type="date" value="' + (phase.date || '') + '"' + (readOnly ? ' disabled' : '') + ' onchange="updatePhaseField(' + ci + ',' + pi + ',\'date\',this.value)"></div>';
                }
                html += '<div class="phase-field"><label>Responsable</label><select' + (readOnly ? ' disabled' : '') + ' onchange="updatePhaseField(' + ci + ',' + pi + ',\'responsible\',this.value)">';
                html += '<option value="">--</option>';
                for (const opt of RESPONSIBLE_OPTIONS) {
                    html += '<option value="' + opt + '"' + ((phase.responsible || '') === opt ? ' selected' : '') + '>' + opt + '</option>';
                }
                html += '</select></div>';

                if (!readOnly) {
                    html += '<div class="btn-group-phase">';
                    if (pi > 0) html += '<button class="btn-move btn-move-sm" onclick="movePhase(' + ci + ',' + pi + ',-1)" title="Subir fase">&#9650;</button>';
                    if (pi < cycle.phases.length - 1) html += '<button class="btn-move btn-move-sm" onclick="movePhase(' + ci + ',' + pi + ',1)" title="Bajar fase">&#9660;</button>';
                    html += '<button class="btn-remove-phase" onclick="removePhase(' + ci + ',' + pi + ')" title="Quitar fase">&times;</button>';
                    html += '</div>';
                }
                html += '</div>';
            } else {
                // no_iniciado: just show status, no fields
                html += '<div class="phase-fields"><span class="phase-no-fields">Estado del ciclo</span>';
                if (!readOnly) {
                    html += '<div class="btn-group-phase">';
                    if (pi > 0) html += '<button class="btn-move btn-move-sm" onclick="movePhase(' + ci + ',' + pi + ',-1)" title="Subir fase">&#9650;</button>';
                    if (pi < cycle.phases.length - 1) html += '<button class="btn-move btn-move-sm" onclick="movePhase(' + ci + ',' + pi + ',1)" title="Bajar fase">&#9660;</button>';
                    html += '<button class="btn-remove-phase" onclick="removePhase(' + ci + ',' + pi + ')" title="Quitar fase">&times;</button>';
                    html += '</div>';
                }
                html += '</div>';
            }

            html += '</div>';
        }

        // Add phase button
        if (!readOnly) {
            html += '<div class="phase-add-row">';
            html += '<select id="addPhaseSelect' + ci + '">';
            for (const s of DEFAULT_PHASE_ORDER) {
                html += '<option value="' + s + '">' + STATUS_CONFIG[s].label + '</option>';
            }
            html += '</select>';
            html += '<button class="btn-add-phase" onclick="addPhase(' + ci + ')">+ Agregar fase</button>';
            html += '</div>';
        }

        html += '</div>'; // cycle-body
        html += '</div>'; // cycle-item
    }

    container.innerHTML = html;
}

function toggleCycleAccordion(ci) {
    const body = document.getElementById('cycleBody' + ci);
    const arrow = document.getElementById('cycleArrow' + ci);
    if (!body) return;
    if (body.style.display === 'none') {
        body.style.display = 'block';
        if (arrow) arrow.innerHTML = '&#9660;';
    } else {
        body.style.display = 'none';
        if (arrow) arrow.innerHTML = '&#9654;';
    }
}

function updateCycleName(ci, value) {
    if (_modalCycles[ci]) {
        _modalCycles[ci].name = value;
        checkModalDirty();
    }
}

function updatePhaseField(ci, pi, field, value) {
    if (_modalCycles[ci] && _modalCycles[ci].phases[pi]) {
        _modalCycles[ci].phases[pi][field] = value;
        checkModalDirty();
        // Re-render to update status badge
        const readOnly = !window._dashboardEditUnlocked;
        renderModalCycles(readOnly);
        // Re-open the accordion that was being edited
        const body = document.getElementById('cycleBody' + ci);
        const arrow = document.getElementById('cycleArrow' + ci);
        if (body) body.style.display = 'block';
        if (arrow) arrow.innerHTML = '&#9660;';
    }
}

function addCycleToModal() {
    const num = _modalCycles.length + 1;
    _modalCycles.push(createEmptyCycle('Ciclo ' + num));
    renderModalCycles(false);
    checkModalDirty();
    // Open the new cycle
    const ci = _modalCycles.length - 1;
    const body = document.getElementById('cycleBody' + ci);
    const arrow = document.getElementById('cycleArrow' + ci);
    if (body) body.style.display = 'block';
    if (arrow) arrow.innerHTML = '&#9660;';
}

function removeCycle(ci) {
    if (_modalCycles.length <= 1) {
        alert('Debe haber al menos un ciclo.');
        return;
    }
    if (!confirm('¿Eliminar este ciclo?')) return;
    _modalCycles.splice(ci, 1);
    renderModalCycles(false);
    checkModalDirty();
}

function addPhase(ci) {
    const select = document.getElementById('addPhaseSelect' + ci);
    if (!select) return;
    const status = select.value;
    const phase = { status };
    if (DURATION_STATES.includes(status)) {
        phase.startDate = '';
        phase.endDate = '';
        phase.responsible = '';
    } else if (MILESTONE_STATES.includes(status)) {
        phase.date = '';
        phase.responsible = '';
    }
    _modalCycles[ci].phases.push(phase);
    renderModalCycles(false);
    checkModalDirty();
    // Keep accordion open
    const body = document.getElementById('cycleBody' + ci);
    const arrow = document.getElementById('cycleArrow' + ci);
    if (body) body.style.display = 'block';
    if (arrow) arrow.innerHTML = '&#9660;';
}

function removePhase(ci, pi) {
    if (_modalCycles[ci].phases.length <= 1) {
        alert('El ciclo debe tener al menos una fase.');
        return;
    }
    _modalCycles[ci].phases.splice(pi, 1);
    renderModalCycles(false);
    checkModalDirty();
    // Keep accordion open
    const body = document.getElementById('cycleBody' + ci);
    const arrow = document.getElementById('cycleArrow' + ci);
    if (body) body.style.display = 'block';
    if (arrow) arrow.innerHTML = '&#9660;';
}

function movePhase(ci, pi, direction) {
    const phases = _modalCycles[ci].phases;
    const newIndex = pi + direction;
    if (newIndex < 0 || newIndex >= phases.length) return;
    const temp = phases[pi];
    phases[pi] = phases[newIndex];
    phases[newIndex] = temp;
    renderModalCycles(false);
    checkModalDirty();
    const body = document.getElementById('cycleBody' + ci);
    const arrow = document.getElementById('cycleArrow' + ci);
    if (body) body.style.display = 'block';
    if (arrow) arrow.innerHTML = '&#9660;';
}

function moveCycle(ci, direction) {
    const newIndex = ci + direction;
    if (newIndex < 0 || newIndex >= _modalCycles.length) return;
    const temp = _modalCycles[ci];
    _modalCycles[ci] = _modalCycles[newIndex];
    _modalCycles[newIndex] = temp;
    renderModalCycles(false);
    checkModalDirty();
}

// ===================================
// Loading overlay
// ===================================
function showLoadingOverlay() {
    const el = document.getElementById('loadingOverlay');
    if (el) el.classList.remove('hidden');
}

function hideLoadingOverlay() {
    const el = document.getElementById('loadingOverlay');
    if (el) el.classList.add('hidden');
}

// ===================================
// Carga de datos (Sheets → fallback local)
// ===================================
async function loadDeliverables() {
    showLoadingOverlay();

    try {
        if (window.SheetsAPI && SheetsAPI.isConfigured()) {
            try {
                const sheetsData = await SheetsAPI.loadAll();

                if (sheetsData.success && sheetsData.deliverables && sheetsData.deliverables.length > 0) {
                    // Detectar si los IDs están corrompidos (Sheets convirtió "1.1.1" a fecha)
                    const sampleId = String(sheetsData.deliverables[0].entregable_id || '');
                    const idsCorrupted = /\d{4}-\d{2}-\d{2}/.test(sampleId) || sampleId.includes('T');

                    if (idsCorrupted) {
                        console.warn('[Dashboard] IDs corrompidos en Sheets (auto-conversión a fecha). Re-migrando desde datos locales...');
                        await loadLocalData();
                        await migrateToSheets();
                        dataSource = 'sheets';
                        console.log('[Dashboard] Re-migración completada con IDs corregidos');
                    } else {
                        deliverablesData = reconstructFromSheets(sheetsData);
                        dataSource = 'sheets';

                        if (sheetsData.config && sheetsData.config.length > 0) applyConfig(sheetsData.config);
                        if (sheetsData.risks && sheetsData.risks.length > 0) renderRisksTable(sheetsData.risks);

                        const totalDels = deliverablesData.stages.reduce((s, st) => s + st.products.reduce((p, pr) => p + pr.deliverables.length, 0), 0);
                        console.log('[Dashboard] Datos cargados desde Google Sheets (' + totalDels + ' entregables)');
                    }
                } else {
                    // Sheets vacío — cargar local y migrar
                    await loadLocalData();
                    await migrateToSheets();
                    dataSource = 'sheets';
                    console.log('[Dashboard] Datos migrados a Google Sheets');
                }
            } catch (sheetsErr) {
                console.warn('[Dashboard] Sheets no disponible, usando datos locales:', sheetsErr.message);
                await loadLocalData();
                dataSource = 'local';
            }
        } else {
            await loadLocalData();
            dataSource = 'local';
        }
    } catch (err) {
        console.error('Error al cargar entregables:', err);
        hideLoadingOverlay();
        return;
    }

    // Si los riesgos no se cargaron de Sheets, usar defaults
    const riskBody = document.getElementById('riskTableBody');
    if (riskBody && riskBody.children.length === 0) {
        renderRisksTable(getDefaultRisks());
    }

    invalidateCriticalPath();
    renderDeliverablesSummaryTable();
    renderDeliverablesAccordion();
    renderGanttChart();
    updateInProgressCount();
    updateDataSourceBadge();
    hideLoadingOverlay();
}

async function loadLocalData() {
    const response = await fetch('deliverables_data.json');
    if (!response.ok) throw new Error('No se pudo cargar los entregables');
    deliverablesData = await response.json();
}

async function migrateToSheets() {
    if (!window.SheetsAPI || !SheetsAPI.isConfigured() || !deliverablesData) return;

    try {
        const flatDels = flattenDeliverables(deliverablesData);
        const flatHistory = flattenHistory(deliverablesData);
        const config = getDefaultConfig();
        const risks = getDefaultRisks();

        await SheetsAPI.init({
            deliverables: flatDels,
            history: flatHistory,
            config: config,
            risks: risks
        });

        showSaveNotification('Datos migrados a Google Sheets');
    } catch (err) {
        console.error('[Migration]', err);
        showSaveNotification('Error en migración a Sheets', true);
    }
}

function updateInProgressCount() {
    if (!deliverablesData || !deliverablesData.stages) return;
    let count = 0;
    for (const stage of deliverablesData.stages) {
        for (const product of stage.products) {
            for (const del of product.deliverables) {
                ensureCycles(del);
                if (getActivePhaseStatus(del) === 'en_elaboracion') count++;
            }
        }
    }
    const el = document.getElementById('inProgressCount');
    if (el) el.textContent = count;
}

function updateDataSourceBadge() {
    const badge = document.getElementById('dataSourceBadge');
    if (!badge) return;
    if (dataSource === 'sheets') {
        badge.textContent = 'Conectado';
        badge.className = 'data-source-badge connected';
    } else {
        badge.textContent = 'Error de conexion';
        badge.className = 'data-source-badge local';
    }
}

// ===================================
// Reconstrucción: Sheets plano → jerárquico
// ===================================
function reconstructFromSheets(sheetsData) {
    const flatDels = sheetsData.deliverables || [];
    const flatHistory = sheetsData.history || [];

    // Construir mapa de historial
    const historyMap = {};
    for (const h of flatHistory) {
        const id = String(h.entregable_id);
        if (!historyMap[id]) historyMap[id] = [];
        historyMap[id].push({
            date: cleanDateStr(h.fecha),
            status: String(h.estado || ''),
            by: String(h.usuario || '')
        });
    }
    for (const id in historyMap) {
        historyMap[id].sort((a, b) => a.date.localeCompare(b.date));
    }

    // Construir estructura jerárquica
    const stagesMap = {};
    for (const row of flatDels) {
        const stageId = String(row.etapa_id);
        const prodId = String(row.producto_id);
        const delId = String(row.entregable_id);

        if (!stagesMap[stageId]) {
            stagesMap[stageId] = {
                id: stageId,
                name: String(row.etapa_nombre || ''),
                products: {}
            };
        }

        const stage = stagesMap[stageId];
        if (!stage.products[prodId]) {
            stage.products[prodId] = {
                id: prodId,
                name: String(row.producto_nombre || ''),
                deliverables: []
            };
        }

        let cycles = null;
        if (row.cycles) {
            try { cycles = JSON.parse(String(row.cycles)); } catch (e) { /* ignore */ }
        }

        stage.products[prodId].deliverables.push({
            id: delId,
            name: String(row.entregable_nombre || ''),
            description: String(row.descripcion || ''),
            status: String(row.estado || 'no_iniciado'),
            responsible: String(row.responsable || ''),
            startDate: cleanDateStr(row.fecha_inicio),
            dueDate: cleanDateStr(row.fecha_entrega),
            lastStatusChange: cleanDateStr(row.ultimo_cambio),
            observations: String(row.observaciones || ''),
            repositoryUrl: String(row.url_repositorio || ''),
            actividades: parseInt(row.actividades, 10) || 0,
            history: historyMap[delId] || [],
            cycles: cycles || []
        });
    }

    // Ordenar y convertir a arrays
    const sortId = (a, b) => {
        const pa = a.split('.').map(Number);
        const pb = b.split('.').map(Number);
        for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
            if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) - (pb[i] || 0);
        }
        return 0;
    };

    const stages = Object.keys(stagesMap).sort(sortId).map(sId => ({
        ...stagesMap[sId],
        products: Object.keys(stagesMap[sId].products).sort(sortId).map(pId => stagesMap[sId].products[pId])
    }));

    return { metadata: { version: '2.0', source: 'google_sheets' }, stages };
}

// ===================================
// Aplanamiento: jerárquico → Sheets plano
// ===================================
function flattenDeliverables(data) {
    const rows = [];
    for (const stage of data.stages) {
        for (const product of stage.products) {
            for (const del of product.deliverables) {
                rows.push({
                    etapa_id: stage.id,
                    etapa_nombre: stage.name,
                    producto_id: product.id,
                    producto_nombre: product.name,
                    entregable_id: del.id,
                    entregable_nombre: del.name,
                    descripcion: del.description || '',
                    estado: del.status,
                    responsable: del.responsible || '',
                    fecha_inicio: del.startDate || '',
                    fecha_entrega: del.dueDate || '',
                    ultimo_cambio: del.lastStatusChange || '',
                    observaciones: typeof del.observations === 'string' ? del.observations : serializeComments(del.observations || []),
                    url_repositorio: del.repositoryUrl || '',
                    actividades: del.actividades || 0,
                    cycles: del.cycles ? JSON.stringify(del.cycles) : ''
                });
            }
        }
    }
    return rows;
}

function flattenHistory(data) {
    const rows = [];
    for (const stage of data.stages) {
        for (const product of stage.products) {
            for (const del of product.deliverables) {
                if (del.history) {
                    for (const h of del.history) {
                        rows.push({
                            fecha: h.date,
                            entregable_id: del.id,
                            estado: h.status,
                            usuario: h.by || ''
                        });
                    }
                }
            }
        }
    }
    return rows;
}

function flattenSingleDeliverable(del, product, stage) {
    return {
        etapa_id: stage.id,
        etapa_nombre: stage.name,
        producto_id: product.id,
        producto_nombre: product.name,
        entregable_id: del.id,
        entregable_nombre: del.name,
        descripcion: del.description || '',
        estado: del.status,
        responsable: del.responsible || '',
        fecha_inicio: del.startDate || '',
        fecha_entrega: del.dueDate || '',
        ultimo_cambio: del.lastStatusChange || '',
        observaciones: typeof del.observations === 'string' ? del.observations : serializeComments(del.observations || []),
        url_repositorio: del.repositoryUrl || '',
        actividades: del.actividades || 0,
        cycles: del.cycles ? JSON.stringify(del.cycles) : ''
    };
}

// ===================================
// Config (valores hardcoded → Sheets)
// ===================================
function getDefaultConfig() {
    return [
        { clave: 'valor_contrato', valor: '1099762423' },
        { clave: 'avance_fisico', valor: '4.32' },
        { clave: 'tareas_completadas', valor: '4' },
        { clave: 'tareas_total', valor: '93' },
        { clave: 'tareas_en_progreso', valor: '17' },
        { clave: 'spi_value', valor: '0.97' },
        { clave: 'spi_status', valor: 'Leve retraso' },
        { clave: 'cpi_value', valor: '0.98' },
        { clave: 'cpi_status', valor: 'Leve sobrecosto' },
        { clave: 'cumplimiento_pct', valor: '97' },
        { clave: 'cumplimiento_tareas', valor: '32' },
        { clave: 'ultima_actualizacion', valor: formatLastUpdate() }
    ];
}

function applyConfig(configRows) {
    const cfg = {};
    for (const row of configRows) {
        cfg[String(row.clave)] = String(row.valor || '');
    }

    // Valor del contrato (usado en renderDeliverablesSummaryTable)
    if (cfg.valor_contrato) {
        window._dashboardValorContrato = parseFloat(cfg.valor_contrato);
    }

    // Avance físico — ahora se calcula dinámicamente en renderDeliverablesSummaryTable()
    // Los valores de cfg.avance_fisico y cfg.tareas_completadas ya no se usan

    // En progreso — ya no se usa desde Config, se calcula dinámicamente en updateInProgressCount()

    // Fecha referencia cronograma
    if (cfg.fecha_referencia_cronograma) {
        _cronogramaFechaRef = cfg.fecha_referencia_cronograma;
    }

    // SPI
    const spiEl = document.getElementById('spiValue');
    const spiStatEl = document.getElementById('spiStatus');
    if (spiEl && cfg.spi_value) {
        spiEl.textContent = cfg.spi_value;
        const spiNum = parseFloat(cfg.spi_value);
        spiEl.style.color = spiNum >= 1 ? 'var(--success-color)' : (spiNum >= 0.9 ? 'var(--warning-color)' : 'var(--danger-color)');
    }
    if (spiStatEl && cfg.spi_status) spiStatEl.textContent = cfg.spi_status;

    // CPI
    const cpiEl = document.getElementById('cpiValue');
    const cpiStatEl = document.getElementById('cpiStatus');
    if (cpiEl && cfg.cpi_value) {
        cpiEl.textContent = cfg.cpi_value;
        const cpiNum = parseFloat(cfg.cpi_value);
        cpiEl.style.color = cpiNum >= 1 ? 'var(--success-color)' : (cpiNum >= 0.9 ? 'var(--warning-color)' : 'var(--danger-color)');
    }
    if (cpiStatEl && cfg.cpi_status) cpiStatEl.textContent = cfg.cpi_status;

    // Cumplimiento de fechas
    const compEl = document.getElementById('onTimePercentage');
    if (compEl && cfg.cumplimiento_pct) compEl.textContent = cfg.cumplimiento_pct + '%';
    const compCountEl = document.getElementById('onTimeCount');
    if (compCountEl && cfg.cumplimiento_tareas) compCountEl.textContent = cfg.cumplimiento_tareas + ' tareas a tiempo';

    // Última actualización
    const updEl = document.getElementById('lastUpdate');
    if (updEl && cfg.ultima_actualizacion) {
        let updText = cfg.ultima_actualizacion;
        // Si viene como ISO string desde Sheets, reformatear
        if (/^\d{4}-\d{2}-\d{2}T/.test(updText)) {
            updText = formatLastUpdate(new Date(updText));
        }
        updEl.textContent = updText;
    }
}

// ===================================
// Riesgos (hardcoded → Sheets)
// ===================================
function getDefaultRisks() {
    return [
        { id: 'RC-02', descripcion: 'Retrasos en ciclos de revisión y aprobación', categoria: 'Cronograma', disparador: 'Ciclo > 3 días de lo planificado', estado: 'En observación' },
        { id: 'RR-01', descripcion: 'Sobrecarga de recursos en actividades paralelas', categoria: 'Recursos', disparador: 'Asignación recursos > 95% capacidad', estado: 'En observación' },
        { id: 'RC-03', descripcion: 'Dependencias secuenciales que causan efecto dominó', categoria: 'Cronograma', disparador: 'Retraso afecta > 2 actividades dependientes', estado: 'En observación' },
        { id: 'RT-01', descripcion: 'Incompatibilidades con plataforma Moodle', categoria: 'Técnico', disparador: 'Fallo en pruebas de integración', estado: 'En observación' }
    ];
}

function renderRisksTable(risks) {
    const tbody = document.getElementById('riskTableBody');
    if (!tbody || !risks || risks.length === 0) return;

    tbody.innerHTML = '';
    for (const r of risks) {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><span class="risk-id-badge">${r.id}</span></td>
            <td>${r.descripcion}</td>
            <td class="text-center">${r.categoria}</td>
            <td>${r.disparador}</td>
            <td class="text-center"><span class="status-monitoring">${r.estado}</span></td>
        `;
        tbody.appendChild(row);
    }
}

// ===================================
// Renderizado del acordeón
// ===================================
function renderDeliverablesAccordion() {
    const container = document.getElementById('deliverablesAccordion');
    if (!container || !deliverablesData) return;

    const openStages = [];
    for (const stage of deliverablesData.stages) {
        const content = document.getElementById('content-' + stage.id);
        if (content && content.style.display !== 'none') {
            openStages.push(stage.id);
        }
    }

    container.innerHTML = '';

    for (const stage of deliverablesData.stages) {
        const summary = getStageSummary(stage);
        const accordionItem = document.createElement('div');
        accordionItem.className = 'accordion-item';

        const isOpen = openStages.includes(stage.id);
        const summaryBadges = Object.entries(summary.byStatus)
            .filter(([, count]) => count > 0)
            .map(([status, count]) =>
                `<span class="summary-badge status-${status}">${count} ${STATUS_CONFIG[status].label.toLowerCase()}</span>`
            ).join('');

        accordionItem.innerHTML = `
            <div class="accordion-header" onclick="toggleAccordion('${stage.id}')">
                <div class="accordion-header-left">
                    <span class="accordion-arrow${isOpen ? ' open' : ''}" id="arrow-${stage.id}">${isOpen ? '&#9660;' : '&#9654;'}</span>
                    <span class="accordion-title">${stage.id}. ${stage.name}</span>
                    <span class="accordion-count">${summary.total} entregables</span>
                </div>
                <div class="accordion-summary">${summaryBadges}</div>
            </div>
            <div class="accordion-content" id="content-${stage.id}" style="display: ${isOpen ? 'block' : 'none'};">
                ${renderStageProducts(stage)}
            </div>
        `;

        container.appendChild(accordionItem);
    }
}

function renderStageProducts(stage) {
    let html = '';

    for (const product of stage.products) {
        html += `<div class="product-group">`;
        html += `<div class="product-header">${product.id}. ${product.name}</div>`;
        html += `<div class="deliverables-list">`;
        html += `<div class="deliverables-list-header">
            <span class="dlh-id">ID</span>
            <span class="dlh-name">Entregable</span>
            <span class="dlh-status">Estado</span>
            <span class="dlh-progress">Avance</span>
            <span class="dlh-responsible">Responsable</span>
            <span class="dlh-date">F. Fase</span>
            <span class="dlh-date-final">F. Final</span>
            <span class="dlh-notes"></span>
            <span class="dlh-alert"></span>
        </div>`;

        const cpIds = getCriticalPathIds();
        for (const del of product.deliverables) {
            ensureCycles(del);
            const progress = getDeliverableProgressFromCycles(del);
            const displayStatus = getActivePhaseStatus(del);
            const cfg = STATUS_CONFIG[displayStatus] || STATUS_CONFIG[del.status];
            const sched = getActivePhaseSchedule(del);
            const schedFull = getDeliverableScheduleDates(del, 'all');
            const alertClass = getAlertClass(del, sched.endDate);
            const isCritical = cpIds.has(del.id);

            html += `
                <div class="deliverable-row${isCritical ? ' critical-path-row' : ''}" onclick="openDeliverableModal('${del.id}')">
                    <span class="del-id">${/^\d/.test(del.id) ? del.id : ''}${isCritical ? '<span class="critical-path-icon" title="Ruta crítica">&#9670;</span>' : ''}</span>
                    <span class="del-name">${/^\d/.test(del.id) ? del.name : '<strong>' + del.name + '</strong>'}</span>
                    <span class="del-status"><span class="del-status-badge status-${displayStatus}">${cfg.label}</span></span>
                    <span class="del-progress">
                        <span class="progress-bar-mini"><span class="progress-fill status-${displayStatus}" style="width:${progress}%"></span></span>
                        <span class="progress-text">${progress}%</span>
                    </span>
                    <span class="del-responsible">${getActivePhaseResponsible(del) || '—'}</span>
                    <span class="del-date">${formatDateShort(sched.endDate)}</span>
                    <span class="del-date-final">${formatDateShort(schedFull.endDate)}</span>
                    <span class="del-notes">${del.observations ? '<svg class="icon-notes" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path><line x1="9" y1="9" x2="15" y2="9"></line><line x1="9" y1="13" x2="13" y2="13"></line></svg>' : ''}</span>
                    <span class="del-alert"><span class="alert-dot ${alertClass}"></span></span>
                </div>
            `;
        }

        html += `</div></div>`;
    }

    return html;
}

// ===================================
// Tabla resumen por etapa (dinámica)
// ===================================
function renderDeliverablesSummaryTable() {
    const tbody = document.getElementById('deliverablesSummaryBody');
    if (!tbody || !deliverablesData) return;

    tbody.innerHTML = '';
    let overallImpact = 0;

    for (const stage of deliverablesData.stages) {
        let totalDel = 0;
        let aprobados = 0;
        let sumWeightedProgress = 0;
        let sumActividades = 0;

        for (const product of stage.products) {
            for (const del of product.deliverables) {
                ensureCycles(del);
                totalDel++;
                const act = getActividades(del);
                const p = getDeliverableProgressFromCycles(del);
                sumWeightedProgress += act * p;
                sumActividades += act;
                if (del.status === 'aprobado') aprobados++;
            }
        }

        const avgProgress = sumActividades > 0 ? sumWeightedProgress / sumActividades : 0;
        const weight = STAGE_WEIGHTS[stage.id] || 0;
        overallImpact += (avgProgress * weight) / 100;

        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${stage.name}</strong></td>
            <td class="text-center">${weight}%</td>
            <td class="text-center"><strong>${avgProgress.toFixed(1)}%</strong></td>
            <td class="text-center">${aprobados} / ${totalDel}</td>
        `;
        tbody.appendChild(row);
    }

    // KPI Avance por Impacto
    const impactEl = document.getElementById('impactProgress');
    if (impactEl) impactEl.textContent = overallImpact.toFixed(2) + '%';
    const impactBar = document.getElementById('impactProgressBar');
    if (impactBar) impactBar.style.width = Math.min(100, overallImpact).toFixed(2) + '%';

    // Valor monetario ganado
    const impactValueEl = document.getElementById('impactValue');
    if (impactValueEl) {
        const totalValue = window._dashboardValorContrato || 1099762423;
        const earnedValue = (overallImpact / 100) * totalValue;
        impactValueEl.textContent = '$' + new Intl.NumberFormat('es-CO', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(earnedValue);
    }

    // KPI Avance Físico (ponderado por actividades estimadas por entregable)
    let totalActividades = 0;
    let completedActividades = 0;

    for (const stage of deliverablesData.stages) {
        for (const product of stage.products) {
            for (const del of product.deliverables) {
                ensureCycles(del);
                const act = getActividades(del);
                const p = getDeliverableProgressFromCycles(del);
                totalActividades += act;
                completedActividades += act * (p / 100);
            }
        }
    }

    const overallPhys = totalActividades > 0 ? (completedActividades / totalActividades) * 100 : 0;
    const physEl = document.getElementById('overallProgress');
    if (physEl) physEl.textContent = overallPhys.toFixed(2) + '%';

    const tasksEl = document.getElementById('tasksCompleted');
    if (tasksEl) tasksEl.textContent = Math.round(completedActividades) + ' de ' + totalActividades + ' actividades';
}

// ===================================
// Acordeón toggle
// ===================================
function toggleAccordion(stageId) {
    const content = document.getElementById('content-' + stageId);
    const arrow = document.getElementById('arrow-' + stageId);

    if (content.style.display === 'none') {
        content.style.display = 'block';
        arrow.innerHTML = '&#9660;';
        arrow.classList.add('open');
    } else {
        content.style.display = 'none';
        arrow.innerHTML = '&#9654;';
        arrow.classList.remove('open');
    }
}

function getStageSummary(stage) {
    const summary = { total: 0, byStatus: {} };
    Object.keys(STATUS_CONFIG).forEach(s => summary.byStatus[s] = 0);

    for (const product of stage.products) {
        for (const del of product.deliverables) {
            ensureCycles(del);
            const displayStatus = getActivePhaseStatus(del);
            summary.total++;
            summary.byStatus[displayStatus] = (summary.byStatus[displayStatus] || 0) + 1;
        }
    }
    return summary;
}

// ===================================
// Buscar entregable por ID
// ===================================
function findDeliverable(id) {
    for (const stage of deliverablesData.stages) {
        for (const product of stage.products) {
            for (const del of product.deliverables) {
                if (del.id === id) return { deliverable: del, product, stage };
            }
        }
    }
    return null;
}

// ===================================
// Modal
// ===================================
function openDeliverableModal(deliverableId) {
    const result = findDeliverable(deliverableId);
    if (!result) return;

    const readOnly = !window._dashboardEditUnlocked;
    currentDeliverableId = deliverableId;
    const { deliverable, product, stage } = result;

    // Ensure cycles exist (migrate legacy data)
    ensureCycles(deliverable);

    // Info de contexto
    document.getElementById('modalDelId').textContent = deliverable.id;
    document.getElementById('modalDelName').textContent = deliverable.name;
    document.getElementById('modalDelDesc').textContent = deliverable.description || '';
    document.getElementById('modalDelStage').textContent = stage.id + '. ' + stage.name;
    document.getElementById('modalDelProduct').textContent = product.id + '. ' + product.name;

    // Barra de avance (calculated from cycles)
    const progress = getDeliverableProgressFromCycles(deliverable);
    document.getElementById('modalDelProgress').textContent = progress + '%';
    const progressBar = document.getElementById('modalDelProgressBar');
    progressBar.style.width = progress + '%';
    // Determine color based on progress
    if (progress >= 100) {
        progressBar.className = 'modal-progress-fill status-aprobado';
    } else if (progress > 0) {
        progressBar.className = 'modal-progress-fill status-en_elaboracion';
    } else {
        progressBar.className = 'modal-progress-fill status-no_iniciado';
    }

    // URL field
    document.getElementById('modalDelUrl').value = deliverable.repositoryUrl || '';

    // Actividades estimadas
    const actInput = document.getElementById('modalDelActividades');
    if (actInput) {
        actInput.value = deliverable.actividades || '';
        actInput.placeholder = getDefaultActividades(deliverable.id) + ' (auto)';
        actInput.disabled = readOnly;
    }

    // Load cycles working copy
    _modalCycles = JSON.parse(JSON.stringify(deliverable.cycles));
    renderModalCycles(readOnly);

    // Cargar comentarios
    _currentComments = parseComments(deliverable.observations);
    renderComments(readOnly);

    // Historial
    renderHistory(deliverable.history);

    // View-only mode: URL field
    const urlField = document.getElementById('modalDelUrl');
    if (urlField) urlField.disabled = readOnly;

    // Save button visibility
    const modal = document.getElementById('deliverableModal');
    const saveBtn = document.getElementById('btnSaveDeliverable');
    if (saveBtn) saveBtn.style.display = readOnly ? 'none' : '';

    // Cancel button text
    const cancelBtn = modal.querySelector('.btn-cancel');
    if (cancelBtn) cancelBtn.textContent = readOnly ? 'Cerrar' : 'Cancelar';

    // Read-only badge
    const existingBadge = modal.querySelector('.modal-readonly-badge');
    if (existingBadge) existingBadge.remove();
    if (readOnly) {
        const badge = document.createElement('div');
        badge.className = 'modal-readonly-badge';
        badge.textContent = 'Solo lectura';
        modal.querySelector('.modal-header').appendChild(badge);
    }

    // Capturar snapshot para dirty tracking
    captureModalSnapshot();

    // Mostrar modal
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function renderHistory(history) {
    const tbody = document.getElementById('modalDelHistoryBody');
    tbody.innerHTML = '';

    if (!history || history.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;color:#9ca3af;">Sin historial de cambios</td></tr>';
        return;
    }

    const sorted = [...history].reverse();
    for (const entry of sorted) {
        const cfg = STATUS_CONFIG[entry.status];
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${formatDateShort(entry.date)}</td>
            <td><span class="del-status-badge status-${entry.status}">${cfg ? cfg.label : entry.status}</span></td>
            <td>${entry.by || '—'}</td>
        `;
        tbody.appendChild(row);
    }
}

function closeDeliverableModal() {
    if (modalIsDirty && window._dashboardEditUnlocked) {
        if (!confirm('Hay cambios sin guardar. ¿Desea salir sin guardar?')) return;
    }
    document.getElementById('deliverableModal').classList.remove('active');
    document.body.style.overflow = '';
    currentDeliverableId = null;
    _currentComments = [];
    _modalCycles = [];
    modalIsDirty = false;
    updateDirtyIndicator();
}

// ===================================
// Guardar cambios
// ===================================
async function saveDeliverable() {
    if (!currentDeliverableId) return;
    if (!window._dashboardEditUnlocked) return;

    // Bloquear botón durante el guardado
    const saveBtn = document.getElementById('btnSaveDeliverable');
    if (saveBtn.disabled) return; // Ya está guardando
    saveBtn.disabled = true;
    saveBtn.dataset.originalText = saveBtn.textContent;
    saveBtn.textContent = 'Guardando...';
    saveBtn.classList.add('is-saving');

    const result = findDeliverable(currentDeliverableId);
    if (!result) {
        saveBtn.disabled = false;
        saveBtn.textContent = saveBtn.dataset.originalText;
        saveBtn.classList.remove('is-saving');
        return;
    }

    const { deliverable, product, stage } = result;
    const newObservations = serializeComments(_currentComments);
    const newUrl = document.getElementById('modalDelUrl').value;

    // Historial entries to push to Sheets
    const newHistoryEntries = [];

    // Derive overall status from cycles
    const oldStatus = deliverable.status;
    let newStatus = 'no_iniciado';
    let allApproved = true;
    let anyActive = false;
    for (const cycle of _modalCycles) {
        const cs = getCycleStatus(cycle);
        if (cs !== 'aprobado') allApproved = false;
        if (cs !== 'no_iniciado') anyActive = true;
        // Use the "most advanced non-approved" status
        if (cs !== 'no_iniciado' && cs !== 'aprobado') {
            newStatus = cs;
        }
    }
    if (allApproved && _modalCycles.length > 0) newStatus = 'aprobado';
    else if (anyActive && newStatus === 'no_iniciado') newStatus = 'en_elaboracion';

    if (newStatus !== oldStatus) {
        const today = new Date().toISOString().split('T')[0];
        if (!deliverable.history) deliverable.history = [];
        const entry = { date: today, status: newStatus, by: 'Usuario' };
        deliverable.history.push(entry);
        deliverable.lastStatusChange = today;

        newHistoryEntries.push({
            fecha: today,
            entregable_id: deliverable.id,
            estado: newStatus,
            usuario: 'Usuario'
        });
    }

    // Update cycles
    deliverable.cycles = JSON.parse(JSON.stringify(_modalCycles));

    // Derive dates from cycles for backwards compatibility
    let minDate = null, maxDate = null;
    for (const cycle of deliverable.cycles) {
        const range = getCycleDateRange(cycle);
        if (range.min && (!minDate || range.min < minDate)) minDate = range.min;
        if (range.max && (!maxDate || range.max > maxDate)) maxDate = range.max;
    }

    // Update legacy fields
    deliverable.status = newStatus;
    deliverable.startDate = minDate || '';
    deliverable.dueDate = maxDate || '';
    deliverable.observations = newObservations;
    deliverable.repositoryUrl = newUrl;
    // Actividades estimadas
    const actInput = document.getElementById('modalDelActividades');
    if (actInput) {
        deliverable.actividades = actInput.value ? parseInt(actInput.value, 10) : 0;
    }
    // Responsible: take from first active cycle's active phase
    deliverable.responsible = '';
    for (const cycle of deliverable.cycles) {
        const cs = getCycleStatus(cycle);
        const activePhase = cycle.phases.find(p => p.status === cs);
        if (activePhase && activePhase.responsible) {
            deliverable.responsible = activePhase.responsible;
            break;
        }
    }

    // Guardar posición de scroll
    const scrollY = window.scrollY;

    try {
        if (dataSource === 'sheets' && window.SheetsAPI && SheetsAPI.isConfigured()) {
            // Guardar en Google Sheets
            const flatRow = flattenSingleDeliverable(deliverable, product, stage);
            await SheetsAPI.saveDeliverable(flatRow);

            // Agregar historial al sheet
            if (newHistoryEntries.length > 0) {
                SheetsAPI.addHistory(newHistoryEntries); // fire-and-forget
            }

            // Actualizar última actualización en Config
            const now = formatLastUpdate();
            SheetsAPI.saveConfig('ultima_actualizacion', now); // fire-and-forget
            const updEl = document.getElementById('lastUpdate');
            if (updEl) updEl.textContent = now;
        } else {
            // Fallback: guardar local via PHP
            const response = await fetch('save_deliverables.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(deliverablesData)
            });
            if (!response.ok) throw new Error('Error al guardar');
        }

        modalIsDirty = false;
        saveBtn.disabled = false;
        saveBtn.textContent = saveBtn.dataset.originalText;
        saveBtn.classList.remove('is-saving');

        renderDeliverablesSummaryTable();
        renderDeliverablesAccordion();
        renderGanttChart();
        closeDeliverableModal();
        showSaveNotification('Cambios guardados correctamente');

        window.scrollTo(0, scrollY);
    } catch (error) {
        console.error('Error al guardar:', error);
        saveBtn.disabled = false;
        saveBtn.textContent = saveBtn.dataset.originalText;
        saveBtn.classList.remove('is-saving');
        showSaveNotification('Error al guardar. Intente nuevamente.', true);
    }
}

// ===================================
// Sincronización manual completa
// ===================================
async function syncToGoogleSheets() {
    if (!window._dashboardEditUnlocked) {
        showSaveNotification('Active el modo edicion para sincronizar', true);
        return;
    }
    if (!window.SheetsAPI || !SheetsAPI.isConfigured() || !deliverablesData) {
        showSaveNotification('Google Sheets no configurado', true);
        return;
    }

    try {
        showSaveNotification('Sincronizando...');
        const flatDels = flattenDeliverables(deliverablesData);
        const flatHistory = flattenHistory(deliverablesData);

        await SheetsAPI.syncAllDeliverables(flatDels);
        await SheetsAPI.syncHistory(flatHistory);

        showSaveNotification('Sincronización completa con Google Sheets');
    } catch (err) {
        console.error('[Sync]', err);
        showSaveNotification('Error en sincronización', true);
    }
}

// ===================================
// Notificaciones
// ===================================
function showSaveNotification(message, isError) {
    const existing = document.querySelector('.save-notification');
    if (existing) existing.remove();

    const el = document.createElement('div');
    el.className = 'save-notification' + (isError ? ' error' : '');
    el.textContent = message;
    document.body.appendChild(el);

    requestAnimationFrame(() => el.classList.add('show'));
    setTimeout(() => {
        el.classList.remove('show');
        setTimeout(() => el.remove(), 300);
    }, 2500);
}

// ===================================
// Alerta por fecha de vencimiento
// ===================================
function getAlertClass(del, overrideDueDate) {
    const displayStatus = getActivePhaseStatus(del);
    if (displayStatus === 'aprobado') return 'dot-ok';
    const dueDate = overrideDueDate || del.dueDate;
    if (!dueDate) return 'dot-none';

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const clean = cleanDateStr(dueDate);
    if (!clean) return 'dot-none';
    const due = new Date(clean + 'T00:00:00');
    if (isNaN(due.getTime())) return 'dot-none';
    const diff = Math.ceil((due - today) / 86400000);

    if (diff < 0) return 'dot-overdue';
    if (diff <= 7) return 'dot-warning';
    return 'dot-ok';
}

// ===================================
// Critical Path (simplified: sequential deliverables per product)
// ===================================
let _criticalPathCache = null;

function getCriticalPathIds() {
    if (!_criticalPathCache) _criticalPathCache = calculateCriticalPath();
    return _criticalPathCache;
}

function invalidateCriticalPath() {
    _criticalPathCache = null;
}

function calculateCriticalPath() {
    if (!deliverablesData || !deliverablesData.stages) return new Set();

    // 1. Calculate individual deliverable duration in days
    const delDurations = []; // { id, stageId, productId, days, minDate, maxDate }

    for (const stage of deliverablesData.stages) {
        for (const product of stage.products) {
            for (const del of product.deliverables) {
                ensureCycles(del);
                let delMin = null, delMax = null;
                if (del.cycles && del.cycles.length > 0) {
                    for (const cycle of del.cycles) {
                        const range = getCycleDateRange(cycle);
                        if (range.min && (!delMin || range.min < delMin)) delMin = range.min;
                        if (range.max && (!delMax || range.max > delMax)) delMax = range.max;
                    }
                }
                if (!delMin) delMin = cleanDateStr(del.startDate);
                if (!delMax) delMax = cleanDateStr(del.dueDate);

                let days = 0;
                if (delMin && delMax) {
                    const start = new Date(delMin + 'T00:00:00');
                    const end = new Date(delMax + 'T00:00:00');
                    days = Math.max(1, Math.ceil((end - start) / 86400000));
                }

                delDurations.push({
                    id: del.id,
                    stageId: stage.id,
                    productId: product.id,
                    days,
                    minDate: delMin,
                    maxDate: delMax
                });
            }
        }
    }

    if (delDurations.length === 0) return new Set();

    // 2. Calculate the median duration to set a threshold
    const withDays = delDurations.filter(d => d.days > 0);
    if (withDays.length === 0) return new Set();

    const sortedDays = withDays.map(d => d.days).sort((a, b) => a - b);
    const median = sortedDays[Math.floor(sortedDays.length / 2)];

    // 3. Critical = deliverables whose duration >= median (top 50% by duration)
    // This ensures only the longest deliverables are on the critical path
    const criticalIds = new Set();
    for (const d of delDurations) {
        if (d.days >= median) {
            criticalIds.add(d.id);
        }
    }

    return criticalIds;
}

// ===================================
// Gantt Chart
// ===================================
function getDeliverableStartDate(del) {
    if (!del.history || del.history.length === 0) return null;
    const firstActive = del.history.find(h => h.status !== 'no_iniciado');
    return firstActive ? firstActive.date : null;
}

// Gantt expand/collapse state
const _ganttExpandedDels = new Set();

function toggleGanttDeliverable(delId) {
    if (_ganttExpandedDels.has(delId)) {
        _ganttExpandedDels.delete(delId);
    } else {
        _ganttExpandedDels.add(delId);
    }
    renderGanttChart();
}

function renderGanttChart() {
    const container = document.getElementById('ganttContainer');
    const legendContainer = document.getElementById('ganttLegend');
    if (!container || !deliverablesData) return;

    // Collect all items and ensure cycles
    const items = [];
    for (const stage of deliverablesData.stages) {
        for (const product of stage.products) {
            for (const del of product.deliverables) {
                ensureCycles(del);
                const sched = getActivePhaseSchedule(del);
                items.push({ del, product, stage, startDate: sched.startDate, endDate: sched.endDate });
            }
        }
    }

    // Collect ALL dates (including from cycle phases) for range calculation
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let minDate = new Date('2099-01-01');
    let maxDate = new Date('2000-01-01');

    for (const item of items) {
        // Legacy dates
        const legacyDates = [item.startDate, item.endDate].filter(Boolean);
        // Cycle phase dates
        if (item.del.cycles) {
            for (const cycle of item.del.cycles) {
                for (const phase of cycle.phases) {
                    if (phase.startDate) legacyDates.push(phase.startDate);
                    if (phase.endDate) legacyDates.push(phase.endDate);
                    if (phase.date) legacyDates.push(phase.date);
                }
            }
        }
        for (const d of legacyDates) {
            const c = cleanDateStr(d);
            if (!c) continue;
            const dt = new Date(c + 'T00:00:00');
            if (isNaN(dt.getTime())) continue;
            if (dt < minDate) minDate = new Date(dt);
            if (dt > maxDate) maxDate = new Date(dt);
        }
    }

    if (minDate > maxDate) {
        container.innerHTML = '<p style="text-align:center;color:var(--gray-400);padding:40px;">No hay entregables con fechas definidas.</p>';
        return;
    }

    if (today < minDate) minDate = new Date(today);
    if (today > maxDate) maxDate = new Date(today);

    minDate = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
    maxDate = new Date(maxDate.getFullYear(), maxDate.getMonth() + 2, 0);

    const totalDays = Math.ceil((maxDate - minDate) / 86400000);

    function dateToPct(dateStr) {
        const clean = cleanDateStr(dateStr);
        if (!clean) return 0;
        const d = new Date(clean + 'T00:00:00');
        return ((d - minDate) / 86400000) / totalDays * 100;
    }

    function todayPct() {
        return ((today - minDate) / 86400000) / totalDays * 100;
    }

    const months = [];
    const cursor = new Date(minDate);
    while (cursor <= maxDate) {
        const monthStart = new Date(cursor);
        const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
        const startPct = ((monthStart - minDate) / 86400000) / totalDays * 100;
        const endPct = ((monthEnd - minDate) / 86400000) / totalDays * 100;
        months.push({
            label: monthStart.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' }),
            startPct,
            widthPct: endPct - startPct
        });
        cursor.setMonth(cursor.getMonth() + 1);
    }

    function monthBgHtml() {
        let h = '';
        for (let i = 0; i < months.length; i++) {
            h += `<div class="gantt-month-bg${i % 2 === 1 ? ' alt' : ''}" style="left:${months[i].startPct}%;width:${months[i].widthPct}%"></div>`;
        }
        return h;
    }

    // Calculate critical path
    const criticalPathIds = calculateCriticalPath();

    const stageGroups = {};
    for (const item of items) {
        if (!stageGroups[item.stage.id]) {
            stageGroups[item.stage.id] = { stage: item.stage, items: [] };
        }
        stageGroups[item.stage.id].items.push(item);
    }

    let html = '<div class="gantt-wrapper">';
    html += '<div class="gantt-grid">';

    // Header
    html += '<div class="gantt-header-label">Entregable</div>';
    html += '<div class="gantt-header-timeline">';
    for (const m of months) {
        html += `<div class="gantt-month" style="left:${m.startPct}%;width:${m.widthPct}%">${m.label}</div>`;
    }
    html += `<div class="gantt-today-line" style="left:${todayPct()}%"><span class="gantt-today-label">Hoy</span></div>`;
    html += '</div>';

    // Data rows
    for (const stageId of Object.keys(stageGroups).sort()) {
        const group = stageGroups[stageId];

        html += `<div class="gantt-stage-label">${group.stage.id}. ${group.stage.name}</div>`;
        html += '<div class="gantt-stage-timeline">' + monthBgHtml() + '</div>';

        for (const item of group.items) {
            const del = item.del;
            const hasCycles = del.cycles && del.cycles.length > 0;
            const isExpanded = _ganttExpandedDels.has(del.id);
            const hasDates = hasCycles && del.cycles.some(c => {
                const r = getCycleDateRange(c);
                return r.min || r.max;
            });

            // Main deliverable row (consolidated)
            const isCritical = criticalPathIds.has(del.id);
            const criticalClass = isCritical ? ' gantt-critical' : '';
            const expandIcon = hasCycles ? (isExpanded ? '&#9660; ' : '&#9654; ') : '';
            const clickExpand = hasCycles ? `onclick="toggleGanttDeliverable('${del.id}')"` : `onclick="openDeliverableModal('${del.id}')"`;
            const ganttLabel = /^\d/.test(del.id) ? `${del.id} ${del.name}` : `<strong>${del.name}</strong>`;
            html += `<div class="gantt-row-label gantt-row-deliverable${criticalClass}" ${clickExpand} title="${del.name}${isCritical ? ' [RUTA CRÍTICA]' : ''}">${expandIcon}${ganttLabel}</div>`;
            html += `<div class="gantt-row-timeline">`;
            html += monthBgHtml();
            html += `<div class="gantt-today-line" style="left:${todayPct()}%"></div>`;

            // Draw consolidated bar from overall start to end
            if (item.startDate && item.endDate) {
                const barStart = Math.min(dateToPct(item.startDate), dateToPct(item.endDate));
                const barEnd = Math.max(dateToPct(item.startDate), dateToPct(item.endDate));
                let barWidth = barEnd - barStart;
                if (barWidth < 0.5) barWidth = 0.5;
                const activePhase = getActivePhaseStatus(del);
                const color = STATUS_COLORS[activePhase] || STATUS_COLORS[del.status];
                const opacity = del.status === 'no_iniciado' ? '0.3' : '1';
                html += `<div class="gantt-bar" style="left:${barStart}%;width:${barWidth}%;background:${color};opacity:${opacity}"
                    onclick="openDeliverableModal('${del.id}')"
                    title="${del.name}\nAvance: ${getDeliverableProgressFromCycles(del)}%${isCritical ? '\n⚠ Ruta crítica' : ''}">
                    <span class="gantt-bar-text">${barWidth > 3 ? (/^\d/.test(del.id) ? del.id : del.name) : ''}</span>
                </div>`;
                // Critical path line under the bar
                if (isCritical) {
                    html += `<div class="gantt-critical-line" style="left:${barStart}%;width:${barWidth}%"></div>`;
                }
            } else if (!hasDates) {
                // No dates at all
            }
            html += '</div>';

            // Expanded cycle rows
            if (isExpanded && hasCycles) {
                for (const cycle of del.cycles) {
                    const cycleStatus = getCycleStatus(cycle);
                    const isApproved = isCycleApproved(cycle);

                    // Cycle header row
                    html += `<div class="gantt-row-label gantt-row-cycle" title="${cycle.name}">&nbsp;&nbsp;${cycle.name}</div>`;
                    html += `<div class="gantt-row-timeline gantt-row-cycle-timeline">`;
                    html += monthBgHtml();
                    html += `<div class="gantt-today-line" style="left:${todayPct()}%"></div>`;

                    // Draw consolidated cycle bar
                    const cRange = getCycleDateRange(cycle);
                    if (cRange.min && cRange.max) {
                        const cStart = dateToPct(cRange.min);
                        const cEnd = dateToPct(cRange.max);
                        let cWidth = cEnd - cStart;
                        if (cWidth < 0.5) cWidth = 0.5;
                        let cColor;
                        if (isApproved) {
                            cColor = STATUS_COLORS['aprobado'];
                        } else {
                            // Use the color of the currently active phase in this cycle
                            const today = new Date().toISOString().slice(0, 10);
                            let activeCyclePhase = cycleStatus;
                            for (const ph of cycle.phases) {
                                if (DURATION_STATES.includes(ph.status) && ph.startDate && ph.endDate) {
                                    if (ph.startDate <= today && today <= ph.endDate) { activeCyclePhase = ph.status; break; }
                                }
                            }
                            cColor = STATUS_COLORS[activeCyclePhase];
                        }
                        html += `<div class="gantt-bar gantt-bar-cycle" style="left:${cStart}%;width:${cWidth}%;--cycle-color:${cColor}"></div>`;
                    }
                    html += '</div>';

                    // Phase rows
                    for (let pi = 0; pi < cycle.phases.length; pi++) {
                        const phase = cycle.phases[pi];
                        if (phase.status === 'no_iniciado') continue; // Don't show in gantt

                        const phaseLabel = STATUS_CONFIG[phase.status] ? STATUS_CONFIG[phase.status].label : phase.status;
                        const isDuration = DURATION_STATES.includes(phase.status);
                        const isMilestone = MILESTONE_STATES.includes(phase.status);
                        const visualState = getPhaseVisualState(cycle, pi);

                        html += `<div class="gantt-row-label gantt-row-phase" title="${phaseLabel}">&nbsp;&nbsp;&nbsp;&nbsp;${phaseLabel}</div>`;
                        html += `<div class="gantt-row-timeline gantt-row-phase-timeline">`;
                        html += monthBgHtml();
                        html += `<div class="gantt-today-line" style="left:${todayPct()}%"></div>`;

                        if (isDuration && phase.startDate && phase.endDate) {
                            const pStart = dateToPct(phase.startDate);
                            const pEnd = dateToPct(phase.endDate);
                            let pWidth = pEnd - pStart;
                            if (pWidth < 0.5) pWidth = 0.5;

                            let barColor, barOpacity;
                            if (isApproved) {
                                // Whole cycle approved: all bars green
                                barColor = STATUS_COLORS['aprobado'];
                                barOpacity = '1';
                            } else if (visualState === 'completed') {
                                barColor = STATUS_COLORS[phase.status];
                                barOpacity = '0.4';
                            } else if (visualState === 'active') {
                                barColor = STATUS_COLORS[phase.status];
                                barOpacity = '1';
                            } else {
                                // future
                                barColor = '#9ca3af'; // grey
                                barOpacity = '0.6';
                            }

                            html += `<div class="gantt-bar gantt-bar-phase" style="left:${pStart}%;width:${pWidth}%;background:${barColor};opacity:${barOpacity}"
                                title="${phaseLabel}\n${phase.startDate} — ${phase.endDate}${phase.responsible ? '\nResponsable: ' + phase.responsible : ''}"></div>`;
                        } else if (isMilestone && phase.date) {
                            const mPos = dateToPct(phase.date);
                            const mColor = isApproved ? MILESTONE_COLORS['aprobado'] : (visualState === 'future' ? '#9ca3af' : MILESTONE_COLORS[phase.status] || STATUS_COLORS[phase.status]);
                            const mOpacity = (visualState === 'completed' && !isApproved) ? '0.4' : '1';
                            html += `<div class="gantt-diamond" style="left:${mPos}%;--diamond-color:${mColor};opacity:${mOpacity}"
                                title="${phaseLabel}: ${phase.date}${phase.responsible ? '\nResponsable: ' + phase.responsible : ''}"></div>`;
                        } else {
                            // No dates: grey dashed pattern
                            html += `<div class="gantt-no-date-indicator"></div>`;
                        }

                        html += '</div>';
                    }
                }
            }
        }
    }

    // Stages without any items
    for (const stage of deliverablesData.stages) {
        if (!stageGroups[stage.id]) {
            html += `<div class="gantt-stage-label">${stage.id}. ${stage.name}</div>`;
            html += '<div class="gantt-stage-timeline"><span class="gantt-no-dates">Sin fechas definidas</span></div>';
        }
    }

    html += '</div></div>';
    container.innerHTML = html;

    // Legend
    legendContainer.innerHTML = Object.entries(STATUS_CONFIG).map(([key, cfg]) =>
        `<span class="gantt-legend-item"><span class="gantt-legend-color" style="background:${STATUS_COLORS[key]}"></span>${cfg.label}</span>`
    ).join('')
    + '<span class="gantt-legend-item"><span class="gantt-legend-color" style="background:#9ca3af"></span>Proyectado</span>'
    + '<span class="gantt-legend-item"><span class="gantt-legend-diamond"></span>Hito</span>'
    + '<span class="gantt-legend-item"><span class="gantt-legend-color gantt-legend-overdue"></span>Vencido</span>'
    + '<span class="gantt-legend-item"><span class="gantt-legend-critical"></span>Ruta crítica</span>';
}

// ===================================
// Utilidades
// ===================================
function formatDateShort(dateStr) {
    if (!dateStr) return '—';
    const clean = cleanDateStr(dateStr);
    if (!clean) return '—';
    const d = new Date(clean + 'T00:00:00');
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// ===================================
// CPI Accordion toggle
// ===================================
function toggleCpiAccordion() {
    const body = document.getElementById('cpiAccordionBody');
    const arrow = document.getElementById('cpiAccordionArrow');
    if (!body || !arrow) return;
    if (body.style.display === 'none') {
        body.style.display = 'block';
        arrow.innerHTML = '&#9660;';
    } else {
        body.style.display = 'none';
        arrow.innerHTML = '&#9654;';
    }
}

// ===================================
// Informe de Corte (Report)
// ===================================

let _baselines = [];        // All baselines from Sheets
let _selectedBaseline = null; // Currently selected for comparison

function buildBaselineSnapshot() {
    if (!deliverablesData) return null;

    const stages = {};
    for (const stage of deliverablesData.stages) {
        let sumWeighted = 0, sumAct = 0, totalDel = 0, aprobados = 0;
        for (const product of stage.products) {
            for (const del of product.deliverables) {
                ensureCycles(del);
                const act = getActividades(del);
                const p = getDeliverableProgressFromCycles(del);
                sumWeighted += act * p;
                sumAct += act;
                totalDel++;
                if (del.status === 'aprobado') aprobados++;
            }
        }
        const avgProgress = sumAct > 0 ? sumWeighted / sumAct : 0;
        stages[stage.id] = {
            name: stage.name,
            avgProgress: Math.round(avgProgress * 100) / 100,
            weight: STAGE_WEIGHTS[stage.id] || 0,
            totalDel,
            aprobados
        };
    }

    let totalAct = 0, completedAct = 0, overallImpact = 0;
    for (const stage of deliverablesData.stages) {
        let sw = 0, sa = 0;
        for (const product of stage.products) {
            for (const del of product.deliverables) {
                const act = getActividades(del);
                const p = getDeliverableProgressFromCycles(del);
                totalAct += act;
                completedAct += act * (p / 100);
                sw += act * p;
                sa += act;
            }
        }
        const avg = sa > 0 ? sw / sa : 0;
        overallImpact += (avg * (STAGE_WEIGHTS[stage.id] || 0)) / 100;
    }
    const overallPhys = totalAct > 0 ? (completedAct / totalAct) * 100 : 0;

    return {
        overallImpact: Math.round(overallImpact * 100) / 100,
        overallPhys: Math.round(overallPhys * 100) / 100,
        stages
    };
}

async function loadBaselines() {
    try {
        if (window.SheetsAPI && SheetsAPI.isConfigured()) {
            const res = await SheetsAPI.loadBaselines();
            _baselines = (res.baselines || []).map(b => {
                let datos = {};
                try { datos = JSON.parse(b.datos); } catch (e) {}
                return { id: b.id, fecha: b.fecha, nombre: b.nombre, datos };
            });
        }
    } catch (e) {
        console.warn('[Report] Error loading baselines:', e.message);
        _baselines = [];
    }
}

async function saveBaseline() {
    if (!deliverablesData) return;
    const today = new Date().toISOString().slice(0, 10);

    const nombre = prompt('Nombre para esta línea base:', 'Corte ' + formatDateShort(today));
    if (!nombre) return;

    const snapshot = buildBaselineSnapshot();
    const id = 'LB_' + today + '_' + Date.now();

    const row = {
        id,
        fecha: today,
        nombre,
        datos: JSON.stringify(snapshot)
    };

    try {
        if (window.SheetsAPI && SheetsAPI.isConfigured()) {
            await SheetsAPI.saveBaseline(row);
        }
        // Add locally too
        _baselines.push({ id, fecha: today, nombre, datos: snapshot });
        _selectedBaseline = snapshot;
        _selectedBaseline.date = today;
        _selectedBaseline.nombre = nombre;
        renderBaselineSelector();
        populateReport();
        alert('Línea base guardada: ' + nombre);
    } catch (e) {
        alert('Error al guardar línea base: ' + e.message);
    }
}

async function deleteBaseline(blId) {
    if (!confirm('¿Eliminar esta línea base?')) return;

    try {
        if (window.SheetsAPI && SheetsAPI.isConfigured()) {
            await SheetsAPI.deleteBaseline(blId);
        }
        _baselines = _baselines.filter(b => b.id !== blId);
        if (_selectedBaseline && _selectedBaseline._id === blId) {
            _selectedBaseline = null;
        }
        renderBaselineSelector();
        populateReport();
    } catch (e) {
        alert('Error al eliminar: ' + e.message);
    }
}

function selectBaseline(blId) {
    if (!blId) {
        _selectedBaseline = null;
    } else {
        const bl = _baselines.find(b => b.id === blId);
        if (bl) {
            _selectedBaseline = { ...bl.datos, date: bl.fecha, nombre: bl.nombre, _id: bl.id };
        }
    }
    populateReport();
}

function renderBaselineSelector() {
    const container = document.getElementById('baselineSelectorArea');
    if (!container) return;

    if (_baselines.length === 0) {
        container.innerHTML = '<span class="report-info-value" style="color:var(--gray-400)">Sin líneas base</span>';
        return;
    }

    let html = '<select class="baseline-select" onchange="selectBaseline(this.value)">';
    html += '<option value="">— Seleccionar línea base —</option>';
    for (const bl of _baselines) {
        const selected = _selectedBaseline && _selectedBaseline._id === bl.id ? ' selected' : '';
        html += `<option value="${bl.id}"${selected}>${bl.nombre} (${formatDateShort(bl.fecha)})</option>`;
    }
    html += '</select>';

    // Delete button for selected
    if (_selectedBaseline && _selectedBaseline._id) {
        html += `<button class="btn-delete-baseline" onclick="deleteBaseline('${_selectedBaseline._id}')" title="Eliminar línea base seleccionada">&#10005;</button>`;
    }

    container.innerHTML = html;
}

async function openReportModal() {
    document.getElementById('reportModal').classList.add('active');
    await loadBaselines();

    // Auto-select most recent baseline
    if (_baselines.length > 0 && !_selectedBaseline) {
        const latest = _baselines[_baselines.length - 1];
        _selectedBaseline = { ...latest.datos, date: latest.fecha, nombre: latest.nombre, _id: latest.id };
    }

    renderBaselineSelector();
    populateReport();

    // Restore saved observations
    const obs = localStorage.getItem('drj_report_observations');
    if (obs) document.getElementById('reportObservations').value = obs;
}

function closeReportModal() {
    const obs = document.getElementById('reportObservations').value;
    localStorage.setItem('drj_report_observations', obs);
    document.getElementById('reportModal').classList.remove('active');
}

function populateReport() {
    if (!deliverablesData) return;

    const today = new Date().toISOString().slice(0, 10);

    document.getElementById('reportCutDate').textContent = formatDateShort(today);

    // === 1. Avance físico acumulado ===
    let overallImpact = 0;
    let totalAct = 0, completedAct = 0;
    const stageRows = [];

    for (const stage of deliverablesData.stages) {
        let sumWeighted = 0, sumAct = 0, totalDel = 0, aprobados = 0;
        for (const product of stage.products) {
            for (const del of product.deliverables) {
                ensureCycles(del);
                const act = getActividades(del);
                const p = getDeliverableProgressFromCycles(del);
                sumWeighted += act * p;
                sumAct += act;
                totalDel++;
                totalAct += act;
                completedAct += act * (p / 100);
                if (del.status === 'aprobado') aprobados++;
            }
        }
        const avgProgress = sumAct > 0 ? sumWeighted / sumAct : 0;
        const weight = STAGE_WEIGHTS[stage.id] || 0;
        overallImpact += (avgProgress * weight) / 100;
        stageRows.push({ name: stage.name, weight, avgProgress, aprobados, totalDel, stageId: stage.id });
    }

    const overallPhys = totalAct > 0 ? (completedAct / totalAct) * 100 : 0;

    document.getElementById('reportImpactProgress').textContent = overallImpact.toFixed(2) + '%';
    document.getElementById('reportImpactBar').style.width = Math.min(100, overallImpact).toFixed(2) + '%';
    document.getElementById('reportPhysProgress').textContent = overallPhys.toFixed(2) + '%';
    document.getElementById('reportPhysBar').style.width = Math.min(100, overallPhys).toFixed(2) + '%';

    const stageBody = document.getElementById('reportStageBody');
    stageBody.innerHTML = '';
    for (const r of stageRows) {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${r.name}</td><td class="text-center">${r.weight}%</td><td class="text-center"><strong>${r.avgProgress.toFixed(1)}%</strong></td><td class="text-center">${r.aprobados} / ${r.totalDel}</td>`;
        stageBody.appendChild(tr);
    }

    // === 2. Variación del cronograma ===
    const varBody = document.getElementById('reportVarianceBody');
    varBody.innerHTML = '';
    const varBadge = document.getElementById('reportVarianceBadge');

    if (_selectedBaseline) {
        let totalVariance = 0;
        let countStages = 0;
        for (const r of stageRows) {
            const bl = _selectedBaseline.stages ? _selectedBaseline.stages[r.stageId] : null;
            const planned = bl ? bl.avgProgress : 0;
            const variance = r.avgProgress - planned;
            totalVariance += variance;
            countStages++;

            const sign = variance >= 0 ? '+' : '';
            const varClass = variance >= 0 ? 'var-positive' : 'var-negative';
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${r.name}</td><td class="text-center">${planned.toFixed(1)}%</td><td class="text-center">${r.avgProgress.toFixed(1)}%</td><td class="text-center"><span class="${varClass}">${sign}${variance.toFixed(1)}%</span></td>`;
            varBody.appendChild(tr);
        }

        const avgVar = countStages > 0 ? totalVariance / countStages : 0;
        if (avgVar >= 0) {
            varBadge.textContent = `+${avgVar.toFixed(1)}% adelanto vs "${_selectedBaseline.nombre}"`;
            varBadge.className = 'report-variance-badge var-positive';
        } else {
            varBadge.textContent = `${avgVar.toFixed(1)}% retraso vs "${_selectedBaseline.nombre}"`;
            varBadge.className = 'report-variance-badge var-negative';
        }
    } else {
        varBadge.textContent = 'Guarde o seleccione una línea base para comparar';
        varBadge.className = 'report-variance-badge var-neutral';
        varBody.innerHTML = '<tr><td colspan="4" class="text-center" style="color:var(--gray-400);padding:12px">Guarde o seleccione una línea base para habilitar la comparación</td></tr>';
    }

    // === 3. Hitos cumplidos ===
    const milestonesList = document.getElementById('reportMilestonesList');
    const milestones = [];

    for (const stage of deliverablesData.stages) {
        for (const product of stage.products) {
            for (const del of product.deliverables) {
                ensureCycles(del);
                if (!del.cycles) continue;
                for (const cycle of del.cycles) {
                    for (const phase of cycle.phases) {
                        if (!MILESTONE_STATES.includes(phase.status)) continue;
                        const d = cleanDateStr(phase.date);
                        if (!d || d > today) continue;
                        milestones.push({
                            date: d,
                            type: phase.status,
                            label: STATUS_CONFIG[phase.status].label,
                            delId: del.id,
                            delName: del.name,
                            cycleName: cycle.name
                        });
                    }
                }
            }
        }
    }

    milestones.sort((a, b) => b.date.localeCompare(a.date));

    if (milestones.length === 0) {
        milestonesList.innerHTML = '<p class="report-empty">No se han registrado hitos cumplidos a la fecha.</p>';
    } else {
        let html = '';
        for (const m of milestones) {
            const icon = m.type === 'aprobado' ? '&#10003;' : '&#9654;';
            const cls = m.type === 'aprobado' ? 'milestone-approved' : 'milestone-sent';
            html += `<div class="report-milestone-item ${cls}">
                <span class="milestone-icon">${icon}</span>
                <span class="milestone-date">${formatDateShort(m.date)}</span>
                <span class="milestone-del">${m.delId} — ${m.delName}</span>
                <span class="milestone-detail">${m.label} (${m.cycleName})</span>
            </div>`;
        }
        milestonesList.innerHTML = html;
    }

    // === 4. Alertas y riesgos ===
    const alertsList = document.getElementById('reportAlertsList');
    const alerts = [];

    for (const stage of deliverablesData.stages) {
        for (const product of stage.products) {
            for (const del of product.deliverables) {
                ensureCycles(del);
                const sched = getActivePhaseSchedule(del);
                const alertClass = getAlertClass(del, sched.endDate);
                if (alertClass === 'dot-overdue' || alertClass === 'dot-warning') {
                    const displayStatus = getActivePhaseStatus(del);
                    const cfg = STATUS_CONFIG[displayStatus] || {};
                    alerts.push({
                        delId: del.id,
                        delName: del.name,
                        status: cfg.label || displayStatus,
                        endDate: sched.endDate,
                        alertType: alertClass === 'dot-overdue' ? 'Vencido' : 'Por vencer',
                        alertClass
                    });
                }
            }
        }
    }

    if (alerts.length === 0) {
        alertsList.innerHTML = '<p class="report-empty">No hay entregables con alertas activas.</p>';
    } else {
        let html = '<table class="report-table"><thead><tr><th>Entregable</th><th class="text-center">Estado</th><th class="text-center">F. Fase</th><th class="text-center">Alerta</th></tr></thead><tbody>';
        for (const a of alerts) {
            const cls = a.alertClass === 'dot-overdue' ? 'alert-overdue' : 'alert-warning';
            html += `<tr><td>${a.delId} — ${a.delName}</td><td class="text-center">${a.status}</td><td class="text-center">${formatDateShort(a.endDate)}</td><td class="text-center"><span class="report-alert-tag ${cls}">${a.alertType}</span></td></tr>`;
        }
        html += '</tbody></table>';
        alertsList.innerHTML = html;
    }

    // Risks
    const risksList = document.getElementById('reportRisksList');
    const risks = getDefaultRisks();
    let riskHtml = '<h4 style="margin:12px 0 6px;font-size:13px;color:var(--gray-500)">Riesgos bajo monitoreo</h4>';
    for (const r of risks) {
        riskHtml += `<div class="report-risk-item"><span class="risk-id-badge">${r.id}</span> ${r.descripcion} <span style="color:var(--gray-400)">— ${r.estado}</span></div>`;
    }
    risksList.innerHTML = riskHtml;
}

function copyReportToClipboard() {
    if (!deliverablesData) return;

    const today = new Date().toISOString().slice(0, 10);
    const obs = document.getElementById('reportObservations').value;
    let text = '';

    text += '═══════════════════════════════════════\n';
    text += 'INFORME DE CORTE - CSJ Rama Judicial\n';
    text += '═══════════════════════════════════════\n';
    text += 'Fecha de corte: ' + formatDateShort(today) + '\n';
    if (_selectedBaseline) text += 'Línea base: ' + (_selectedBaseline.nombre || formatDateShort(_selectedBaseline.date)) + '\n';
    text += '\n';

    // 1. Avance
    text += '1. AVANCE FÍSICO ACUMULADO\n';
    text += '─────────────────────────\n';
    const impactEl = document.getElementById('reportImpactProgress');
    const physEl = document.getElementById('reportPhysProgress');
    text += 'Avance por Impacto Contractual: ' + (impactEl ? impactEl.textContent : '--') + '\n';
    text += 'Avance Físico (actividades):    ' + (physEl ? physEl.textContent : '--') + '\n\n';

    // Stage breakdown
    const stageBody = document.getElementById('reportStageBody');
    if (stageBody) {
        text += 'Desglose por etapa:\n';
        for (const tr of stageBody.querySelectorAll('tr')) {
            const cells = tr.querySelectorAll('td');
            if (cells.length >= 4) {
                text += '  • ' + cells[0].textContent.padEnd(45) + cells[1].textContent.padStart(5) + '  ' + cells[2].textContent.padStart(7) + '  ' + cells[3].textContent + '\n';
            }
        }
        text += '\n';
    }

    // 2. Variación
    text += '2. VARIACIÓN DEL CRONOGRAMA\n';
    text += '───────────────────────────\n';
    const varBadge = document.getElementById('reportVarianceBadge');
    if (varBadge) text += 'Resumen: ' + varBadge.textContent + '\n';
    if (_selectedBaseline) {
        const varBody = document.getElementById('reportVarianceBody');
        if (varBody) {
            for (const tr of varBody.querySelectorAll('tr')) {
                const cells = tr.querySelectorAll('td');
                if (cells.length >= 4) {
                    text += '  • ' + cells[0].textContent.padEnd(45) + 'Plan: ' + cells[1].textContent.padStart(7) + '  Real: ' + cells[2].textContent.padStart(7) + '  Var: ' + cells[3].textContent + '\n';
                }
            }
        }
    }
    text += '\n';

    // 3. Hitos
    text += '3. PRINCIPALES HITOS CUMPLIDOS\n';
    text += '──────────────────────────────\n';
    const milestoneItems = document.querySelectorAll('#reportMilestonesList .report-milestone-item');
    if (milestoneItems.length === 0) {
        text += '  No se han registrado hitos cumplidos.\n';
    } else {
        for (const item of milestoneItems) {
            const date = item.querySelector('.milestone-date')?.textContent || '';
            const del = item.querySelector('.milestone-del')?.textContent || '';
            const detail = item.querySelector('.milestone-detail')?.textContent || '';
            text += '  • ' + date + '  ' + del + ' — ' + detail + '\n';
        }
    }
    text += '\n';

    // 4. Alertas
    text += '4. ALERTAS Y RIESGOS\n';
    text += '────────────────────\n';
    const alertRows = document.querySelectorAll('#reportAlertsList table tbody tr');
    if (alertRows.length === 0) {
        text += '  No hay entregables con alertas activas.\n';
    } else {
        for (const tr of alertRows) {
            const cells = tr.querySelectorAll('td');
            if (cells.length >= 4) {
                text += '  ⚠ ' + cells[0].textContent + ' | ' + cells[1].textContent + ' | ' + cells[2].textContent + ' | ' + cells[3].textContent + '\n';
            }
        }
    }
    text += '\n';

    // Riesgos
    const riskItems = document.querySelectorAll('#reportRisksList .report-risk-item');
    if (riskItems.length > 0) {
        text += 'Riesgos bajo monitoreo:\n';
        for (const item of riskItems) {
            text += '  • ' + item.textContent.trim() + '\n';
        }
        text += '\n';
    }

    // Observaciones
    if (obs.trim()) {
        text += 'OBSERVACIONES\n';
        text += '─────────────\n';
        text += obs + '\n';
    }

    navigator.clipboard.writeText(text).then(() => {
        const btn = document.querySelector('.btn-report-action');
        const original = btn.innerHTML;
        btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="20 6 9 17 4 12"/></svg> Copiado';
        setTimeout(() => { btn.innerHTML = original; }, 2000);
    });
}

// ===================================
// Inicialización
// ===================================
document.addEventListener('DOMContentLoaded', () => {
    setupDirtyTracking();
    updateEditLockUI();
    loadDeliverables();
    printSignature();
});

// ===================================
// Firma del autor
// ===================================
function printSignature() {
    // Estilos pensados para verse bien en tema claro Y oscuro.
    // Usamos colores saturados con buen contraste sobre cualquier fondo.
    const brand = 'background:linear-gradient(135deg,#1e40af,#3b82f6);color:#fff;padding:14px 22px;font-size:14px;font-weight:700;border-radius:6px;font-family:Inter,sans-serif;text-shadow:0 1px 2px rgba(0,0,0,0.2);';
    const body  = 'color:#60a5fa;font-size:13px;line-height:1.7;font-family:Inter,sans-serif;';
    const hint  = 'color:#fbbf24;font-weight:700;';
    const soft  = 'color:#9ca3af;font-size:13px;line-height:1.7;font-family:Inter,sans-serif;';

    console.log('%c Diseñado y construido por David Yomayusa ', brand);
    console.log(
        '%cFullstack · UX/UI · Data-driven apps\n\n' +
        '%c¿Te gusta lo que ves? Puedo ayudarte a construir algo así — o algo más ambicioso.\n\n' +
        '%c→ david.yomayusa@innovahub.org\n' +
        '→ Escribe %chireMe()%c para más detalles.',
        body, soft, body, hint, body
    );
}

// Easter egg — quien abra la consola y sea curioso, encontrará esto.
window.hireMe = function() {
    const title = 'background:#1e40af;color:#fff;padding:10px 18px;font-size:14px;font-weight:700;border-radius:4px;text-shadow:0 1px 2px rgba(0,0,0,0.2);';
    const line  = 'color:#9ca3af;font-size:13px;line-height:1.8;font-family:Inter,sans-serif;';
    const blue  = 'color:#60a5fa;font-weight:600;font-size:13px;line-height:1.8;';
    const gold  = 'color:#fbbf24;font-weight:700;font-size:13px;';

    console.log('%c Hola 👋 ', title);
    console.log(
        '%cMe llamo %cDavid Yomayusa%c y construyo productos digitales con propósito:\n' +
        '  • Dashboards y herramientas internas que la gente realmente usa\n' +
        '  • Aplicaciones con foco en UX, accesibilidad y datos\n' +
        '  • Integraciones, automatizaciones y backoffice a medida\n\n' +
        'Este dashboard es un ejemplo: vanilla JS, Google Sheets como backend,\n' +
        'deploy automático vía GitHub Pages. Sin frameworks innecesarios, solo\n' +
        'lo que el problema necesita.\n\n' +
        '%cSi tienes un proyecto en mente, escríbeme:\n' +
        '%c  → david.yomayusa@innovahub.org\n\n' +
        '%cGracias por asomarte bajo el capó. Eso ya dice mucho de ti.',
        line, blue, line, gold, blue, line
    );
    return '✨';
};
