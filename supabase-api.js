// ===================================
// Supabase API Client (REST/PostgREST)
// Misma firma que SheetsAPI para minimizar cambios en deliverables.js
// ===================================

const SupabaseAPI = (() => {
    function getCfg() {
        return (window.DASHBOARD_CONFIG && window.DASHBOARD_CONFIG.supabase) || null;
    }

    function getEditToken() {
        const cfg = getCfg();
        if (cfg && cfg.editToken) return cfg.editToken;
        try { return localStorage.getItem('drj_edit_token') || ''; } catch (e) { return ''; }
    }

    function baseHeaders(write) {
        const cfg = getCfg();
        const h = {
            'apikey': cfg.publishableKey,
            'Authorization': 'Bearer ' + cfg.publishableKey,
            'Content-Type': 'application/json'
        };
        if (write) {
            const token = getEditToken();
            if (token) h['x-edit-token'] = token;
            h['Prefer'] = 'return=representation';
        }
        return h;
    }

    async function rest(method, path, body, extraHeaders) {
        const cfg = getCfg();
        if (!cfg || !cfg.url) throw new Error('Supabase no configurado');
        const isWrite = method !== 'GET';
        const url = cfg.url.replace(/\/$/, '') + '/rest/v1' + path;
        const headers = Object.assign(baseHeaders(isWrite), extraHeaders || {});
        const opts = { method, headers, redirect: 'follow' };
        if (body !== undefined) opts.body = typeof body === 'string' ? body : JSON.stringify(body);
        const res = await fetch(url, opts);
        if (!res.ok) {
            let detail = '';
            try { detail = await res.text(); } catch (_) {}
            throw new Error('Supabase ' + method + ' ' + path + ' → ' + res.status + ' ' + (detail || res.statusText));
        }
        if (res.status === 204) return null;
        const text = await res.text();
        if (!text) return null;
        try { return JSON.parse(text); } catch (_) { return text; }
    }

    // ---------- Normalización (flatten Sheets → row Supabase) ----------
    function normalizeDeliverableRow(row) {
        const out = {};
        // Copia campos planos, convirtiendo '' → null para tipos no-string
        const passThrough = ['etapa_id','etapa_nombre','producto_id','producto_nombre',
            'entregable_id','entregable_nombre','descripcion','estado','responsable',
            'observaciones','url_repositorio'];
        passThrough.forEach(k => {
            if (row[k] !== undefined) out[k] = row[k] === '' ? null : row[k];
        });
        // Fechas: '' → null
        ['fecha_inicio','fecha_entrega','ultimo_cambio'].forEach(k => {
            if (row[k] !== undefined) out[k] = (row[k] === '' || row[k] == null) ? null : String(row[k]).slice(0, 10);
        });
        // Numéricos
        if (row.actividades !== undefined) {
            out.actividades = parseInt(row.actividades, 10) || 0;
        }
        // cycles: string JSON → objeto JSON. Si viene '' → null.
        if (row.cycles !== undefined) {
            if (row.cycles === '' || row.cycles == null) out.cycles = null;
            else if (typeof row.cycles === 'string') {
                try { out.cycles = JSON.parse(row.cycles); }
                catch (_) { out.cycles = null; }
            } else {
                out.cycles = row.cycles;
            }
        }
        return out;
    }

    function normalizeHistoryRow(row) {
        return {
            fecha: row.fecha ? String(row.fecha).slice(0, 10) : null,
            entregable_id: String(row.entregable_id || ''),
            estado: row.estado || null,
            usuario: row.usuario || null
        };
    }

    // ---------- Carga inicial ----------
    async function loadAll() {
        // 5 selects en paralelo
        const [deliverables, history, risks, config, baselines] = await Promise.all([
            rest('GET', '/deliverables?select=*&order=entregable_id'),
            rest('GET', '/history?select=*&order=fecha.asc,id.asc'),
            rest('GET', '/risks?select=*&order=id'),
            rest('GET', '/config?select=*'),
            rest('GET', '/baselines?select=*&order=fecha.desc')
        ]);

        // Map a la forma que esperaba reconstructFromSheets:
        // deliverables → tienen los mismos nombres de columna que en Sheets
        // pero cycles ahora es objeto (no string). Serializo para compatibilidad.
        const dels = (deliverables || []).map(d => Object.assign({}, d, {
            cycles: d.cycles == null ? '' : (typeof d.cycles === 'string' ? d.cycles : JSON.stringify(d.cycles)),
            actividades: d.actividades == null ? 0 : d.actividades
        }));

        return {
            success: true,
            deliverables: dels,
            history: history || [],
            risks: risks || [],
            config: config || [],
            baselines: baselines || []
        };
    }

    // Deep equality ignorando orden de claves — Postgres jsonb reordena las
    // claves al persistir, lo que rompe la comparación con JSON.stringify directo
    function jsonEqual(a, b) {
        if (a === b) return true;
        if (a == null || b == null) return a == b;
        if (typeof a !== typeof b) return false;
        if (Array.isArray(a) !== Array.isArray(b)) return false;
        if (Array.isArray(a)) {
            if (a.length !== b.length) return false;
            for (let i = 0; i < a.length; i++) if (!jsonEqual(a[i], b[i])) return false;
            return true;
        }
        if (typeof a === 'object') {
            const ka = Object.keys(a), kb = Object.keys(b);
            if (ka.length !== kb.length) return false;
            for (const k of ka) {
                if (!Object.prototype.hasOwnProperty.call(b, k)) return false;
                if (!jsonEqual(a[k], b[k])) return false;
            }
            return true;
        }
        return false;
    }

    // ---------- Deliverables ----------
    async function saveDeliverable(flatRow) {
        const body = normalizeDeliverableRow(flatRow);
        const headers = { 'Prefer': 'return=representation,resolution=merge-duplicates' };
        const result = await rest('POST', '/deliverables?on_conflict=entregable_id', [body], headers);
        // Verificar que el upsert realmente devolvió la fila — si está vacío,
        // RLS probablemente bloqueó silenciosamente la escritura
        if (!Array.isArray(result) || result.length === 0) {
            throw new Error('Supabase no confirmó la escritura del entregable. Verifique el token de edición.');
        }
        // Verificar semánticamente que los cycles persistidos coinciden con lo enviado
        if (!jsonEqual(body.cycles, result[0].cycles)) {
            console.warn('[SupabaseAPI] Cycles persistidos ≠ enviados:', {
                enviados: body.cycles, persistidos: result[0].cycles
            });
        }
        return { success: true, row: result[0] };
    }

    async function syncAllDeliverables(flatRows) {
        const body = (flatRows || []).map(normalizeDeliverableRow);
        const headers = { 'Prefer': 'return=minimal,resolution=merge-duplicates' };
        await rest('POST', '/deliverables?on_conflict=entregable_id', body, headers);
        return { success: true };
    }

    // ---------- History ----------
    async function addHistory(entries) {
        const rows = (Array.isArray(entries) ? entries : [entries]).map(normalizeHistoryRow);
        if (rows.length === 0) return { success: true };
        const result = await rest('POST', '/history', rows, { 'Prefer': 'return=representation' });
        if (!Array.isArray(result) || result.length !== rows.length) {
            throw new Error('Supabase no confirmó la escritura de history. Verifique el token de edición.');
        }
        return { success: true, rows: result };
    }

    async function syncHistory(flatRows) {
        // Para "sync completo": borramos todo y reinsertamos. La FK con cascade
        // protege integridad.
        await rest('DELETE', '/history?id=gte.0');
        const rows = (flatRows || []).map(normalizeHistoryRow);
        if (rows.length) await rest('POST', '/history', rows);
        return { success: true };
    }

    // ---------- Risks ----------
    async function syncRisks(flatRows) {
        await rest('DELETE', '/risks?id=neq.__none__');
        if (flatRows && flatRows.length) {
            await rest('POST', '/risks', flatRows);
        }
        return { success: true };
    }

    async function saveRisk(row) {
        const headers = { 'Prefer': 'return=representation,resolution=merge-duplicates' };
        await rest('POST', '/risks?on_conflict=id', [row], headers);
        return { success: true };
    }

    // ---------- Config ----------
    async function syncConfig(flatRows) {
        const headers = { 'Prefer': 'return=minimal,resolution=merge-duplicates' };
        await rest('POST', '/config?on_conflict=clave', flatRows || [], headers);
        return { success: true };
    }

    async function saveConfig(key, value) {
        const headers = { 'Prefer': 'return=representation,resolution=merge-duplicates' };
        const result = await rest('POST', '/config?on_conflict=clave', [{ clave: key, valor: String(value) }], headers);
        if (!Array.isArray(result) || result.length === 0) {
            throw new Error('Supabase no confirmó la escritura de config. Verifique el token de edición.');
        }
        return { success: true };
    }

    // ---------- Baselines ----------
    async function loadBaselines() {
        const rows = await rest('GET', '/baselines?select=*&order=fecha.desc');
        return { success: true, baselines: rows || [] };
    }

    async function saveBaseline(row) {
        const headers = { 'Prefer': 'return=representation,resolution=merge-duplicates' };
        const body = Object.assign({}, row);
        // datos: si viene string, dejar que Postgres lo parseé como jsonb
        if (typeof body.datos === 'string') {
            try { body.datos = JSON.parse(body.datos); } catch (_) {}
        }
        await rest('POST', '/baselines?on_conflict=id', [body], headers);
        return { success: true };
    }

    async function deleteBaseline(id) {
        await rest('DELETE', '/baselines?id=eq.' + encodeURIComponent(id));
        return { success: true };
    }

    // ---------- Init (migración inicial — ya no se usa, queda como no-op) ----------
    async function init(data) {
        // Migración inicial ya hecha vía script Python. No-op para evitar
        // sobrescritura accidental desde el browser.
        console.warn('[SupabaseAPI] init() no-op — usar script de migración');
        return { success: true, skipped: true };
    }

    // API pública (misma firma que SheetsAPI)
    return {
        isConfigured() {
            const cfg = getCfg();
            return !!(cfg && cfg.url && cfg.publishableKey);
        },
        hasEditToken() { return !!getEditToken(); },
        getEditToken,
        loadAll,
        saveDeliverable,
        syncAllDeliverables,
        addHistory,
        syncHistory,
        syncRisks,
        saveRisk,
        syncConfig,
        saveConfig,
        loadBaselines,
        saveBaseline,
        deleteBaseline,
        init
    };
})();

window.SupabaseAPI = SupabaseAPI;

// Activar Supabase como backend transparente.
// IMPORTANTE: sheets-api.js declara `const SheetsAPI = (...)()`, lo cual crea un
// binding léxico inmutable. Si solo reasignamos `window.SheetsAPI`, las
// referencias bare `SheetsAPI.xxx` en deliverables.js siguen resolviendo al
// const legacy. Para evitar esto, sobrescribimos las propiedades del objeto
// in-place (el const protege el binding, no las propiedades del objeto).
if (SupabaseAPI.isConfigured()) {
    if (window.SheetsAPI && window.SheetsAPI !== SupabaseAPI) {
        // Respaldo de los métodos legacy
        window._LegacySheetsAPI = Object.assign({}, window.SheetsAPI);
        // Eliminar métodos del legacy que SupabaseAPI no implementa
        Object.keys(window.SheetsAPI).forEach(k => {
            if (!(k in SupabaseAPI)) {
                try { delete window.SheetsAPI[k]; } catch (e) { /* ignore */ }
            }
        });
        // Copiar métodos de SupabaseAPI sobre el objeto SheetsAPI existente
        Object.assign(window.SheetsAPI, SupabaseAPI);
    } else {
        window.SheetsAPI = SupabaseAPI;
    }
    console.log('[Dashboard] Backend: Supabase');
}
