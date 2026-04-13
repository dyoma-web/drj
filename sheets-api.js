// ===================================
// Google Sheets API Client
// ===================================

const SheetsAPI = (() => {
    function getUrl() {
        const cfg = window.DASHBOARD_CONFIG && DASHBOARD_CONFIG.googleSheets;
        return cfg && cfg.appsScriptUrl;
    }

    async function apiGet(action) {
        const url = getUrl();
        if (!url) throw new Error('URL de Google Sheets no configurada');

        const response = await fetch(url + '?action=' + encodeURIComponent(action), {
            redirect: 'follow'
        });
        if (!response.ok) throw new Error('HTTP ' + response.status);
        return await response.json();
    }

    async function apiPost(data) {
        const url = getUrl();
        if (!url) throw new Error('URL de Google Sheets no configurada');

        try {
            // Intentar fetch normal (CORS habilitado en Apps Script "Anyone")
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain' },
                body: JSON.stringify(data),
                redirect: 'follow'
            });
            return await response.json();
        } catch (err) {
            // Fallback: fire-and-forget con no-cors
            console.warn('[SheetsAPI] Fallback no-cors:', err.message);
            await fetch(url, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'text/plain' },
                body: JSON.stringify(data)
            });
            return { success: true, fallback: true };
        }
    }

    // API pública
    return {
        isConfigured() {
            return !!getUrl();
        },

        async loadAll() {
            return await apiGet('all');
        },

        async saveDeliverable(flatRow) {
            return await apiPost({ action: 'save_deliverable', row: flatRow });
        },

        async syncAllDeliverables(flatRows) {
            return await apiPost({ action: 'sync_deliverables', rows: flatRows });
        },

        async addHistory(entries) {
            return await apiPost({
                action: 'add_history',
                rows: Array.isArray(entries) ? entries : [entries]
            });
        },

        async syncHistory(flatRows) {
            return await apiPost({ action: 'sync_history', rows: flatRows });
        },

        async syncRisks(flatRows) {
            return await apiPost({ action: 'sync_risks', rows: flatRows });
        },

        async syncConfig(flatRows) {
            return await apiPost({ action: 'sync_config', rows: flatRows });
        },

        async saveConfig(key, value) {
            return await apiPost({ action: 'save_config', row: { clave: key, valor: value } });
        },

        async loadBaselines() {
            return await apiGet('baselines');
        },

        async saveBaseline(row) {
            return await apiPost({ action: 'save_baseline', row });
        },

        async deleteBaseline(id) {
            return await apiPost({ action: 'delete_baseline', id });
        },

        async init(data) {
            return await apiPost({ action: 'init', ...data });
        }
    };
})();

window.SheetsAPI = SheetsAPI;
