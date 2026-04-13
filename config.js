// ===================================
// Configuración del Dashboard
// ===================================

const DASHBOARD_CONFIG = {
    // Información del Proyecto
    project: {
        name: 'CSJ Rama Judicial Colombia 2025',
        client: 'Consejería Superior de la Judicatura',
        year: 2026
    },

    // Configuración de Métricas
    metrics: {
        // Umbrales para SPI (Schedule Performance Index)
        spi: {
            excellent: 1.0,      // SPI >= 1.0: Adelantado o a tiempo
            good: 0.9,           // SPI >= 0.9: Leve retraso
            warning: 0.8,        // SPI >= 0.8: Retraso moderado
            critical: 0.8        // SPI < 0.8: Retraso significativo
        },

        // Umbrales para CPI (Cost Performance Index) - Para implementación futura
        cpi: {
            excellent: 1.1,      // CPI >= 1.1: Muy bajo presupuesto
            good: 1.0,           // CPI >= 1.0: Bajo presupuesto
            acceptable: 0.95,    // CPI >= 0.95: Cerca del presupuesto
            warning: 0.85,       // CPI >= 0.85: Sobre presupuesto moderado
            critical: 0.85       // CPI < 0.85: Sobre presupuesto significativo
        },

        // Configuración de alertas
        alerts: {
            upcomingTasksDays: 7,    // Días para alerta de tareas próximas a vencer
            overdueEnabled: true,     // Habilitar alertas de tareas vencidas
            spiEnabled: true,         // Habilitar alertas de SPI
            cpiEnabled: false         // Habilitar alertas de CPI (cuando esté implementado)
        }
    },

    // Configuración de Visualización
    display: {
        // Límites de elementos mostrados
        timelineMaxItems: 50,        // Número máximo de items en timeline
        tableMaxRows: 100,           // Número máximo de filas en tabla inicial

        // Formato de fechas
        dateFormat: {
            locale: 'es-ES',
            options: {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
            }
        },

        // Formato de fecha y hora
        dateTimeFormat: {
            locale: 'es-ES',
            options: {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            }
        },

        // Colores del tema
        colors: {
            primary: '#1e40af',
            success: '#10b981',
            warning: '#f59e0b',
            danger: '#ef4444',
            info: '#06b6d4'
        }
    },

    // Configuración de Gráficos
    charts: {
        // Gráfico de estado
        statusChart: {
            type: 'doughnut',
            animate: true,
            animationDuration: 1000
        },

        // Gráfico de progreso
        progressChart: {
            type: 'line',
            animate: true,
            animationDuration: 1000,
            showGrid: true,
            tension: 0.4  // Curvatura de las líneas (0 = líneas rectas, 1 = muy curvas)
        }
    },

    // Textos y Etiquetas
    labels: {
        status: {
            'CLOSED': 'Completadas',
            'IN PROGRESS': 'En Progreso',
            'TO DO': 'Pendientes'
        },
        compliance: {
            onTime: 'A tiempo',
            delayed: 'Retrasada',
            pending: 'N/A'
        },
        spi: {
            excellent: 'Adelantado o a tiempo',
            good: 'Leve retraso',
            warning: 'Retraso moderado',
            critical: 'Retraso significativo'
        }
    },

    // Configuración de Formato Monetario (para CPI futuro)
    currency: {
        locale: 'es-CO',
        currency: 'COP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    },

    // Configuración de Filtros
    filters: {
        // Estados disponibles para filtrado
        availableStatuses: ['all', 'CLOSED', 'IN PROGRESS', 'TO DO'],

        // Filtro por defecto
        defaultStatus: 'all',

        // Habilitar búsqueda en tiempo real
        enableRealTimeSearch: true,

        // Retraso en milisegundos para búsqueda (evitar búsquedas mientras se escribe)
        searchDebounceMs: 300
    },

    // Configuración de Exportación (para implementación futura)
    export: {
        enabled: false,
        formats: ['pdf', 'excel', 'csv'],
        filename: 'dashboard_csj_rama_judicial'
    },

    // Configuración de Auto-actualización
    autoRefresh: {
        enabled: false,           // Habilitar auto-actualización
        intervalMinutes: 5,       // Intervalo en minutos
        showNotification: true    // Mostrar notificación al actualizar
    },

    // Sincronización con Google Sheets
    googleSheets: {
        // URL del Google Apps Script desplegado como web app
        // Dejar vacío ('') para desactivar la sincronización
        appsScriptUrl: 'https://script.google.com/macros/s/AKfycbwsVPUN9NdKlvmoUmuF4HV8VVnUNsHpXtR1p7Lep_mQeoW6HLsMCQgrPkkaMGYM9foYtg/exec'
    },

    // Modo Debug
    debug: {
        enabled: false,           // Habilitar logs de debug en consola
        showDataStats: true,      // Mostrar estadísticas de datos cargados
        performanceMonitoring: false  // Monitorear performance de renderizado
    }
};

// Hacer disponible globalmente
window.DASHBOARD_CONFIG = DASHBOARD_CONFIG;

// ===================================
// Funciones Auxiliares de Configuración
// ===================================

/**
 * Obtiene el formato de fecha configurado
 * @returns {Intl.DateTimeFormat}
 */
function getDateFormatter() {
    return new Intl.DateTimeFormat(
        DASHBOARD_CONFIG.display.dateFormat.locale,
        DASHBOARD_CONFIG.display.dateFormat.options
    );
}

/**
 * Obtiene el formato de fecha y hora configurado
 * @returns {Intl.DateTimeFormat}
 */
function getDateTimeFormatter() {
    return new Intl.DateTimeFormat(
        DASHBOARD_CONFIG.display.dateTimeFormat.locale,
        DASHBOARD_CONFIG.display.dateTimeFormat.options
    );
}

/**
 * Obtiene el formato de moneda configurado
 * @returns {Intl.NumberFormat}
 */
function getCurrencyFormatter() {
    return new Intl.NumberFormat(
        DASHBOARD_CONFIG.currency.locale,
        {
            style: 'currency',
            currency: DASHBOARD_CONFIG.currency.currency,
            minimumFractionDigits: DASHBOARD_CONFIG.currency.minimumFractionDigits,
            maximumFractionDigits: DASHBOARD_CONFIG.currency.maximumFractionDigits
        }
    );
}

/**
 * Obtiene el label de un estado
 * @param {string} status - Estado de la tarea
 * @returns {string}
 */
function getStatusLabel(status) {
    return DASHBOARD_CONFIG.labels.status[status] || status;
}

/**
 * Obtiene el label de cumplimiento
 * @param {string} compliance - Tipo de cumplimiento
 * @returns {string}
 */
function getComplianceLabel(compliance) {
    return DASHBOARD_CONFIG.labels.compliance[compliance] || compliance;
}

/**
 * Obtiene el color según el tipo
 * @param {string} type - Tipo de color (primary, success, warning, danger, info)
 * @returns {string}
 */
function getColor(type) {
    return DASHBOARD_CONFIG.display.colors[type] || '#000000';
}

/**
 * Obtiene el umbral de SPI según el valor
 * @param {number} spiValue - Valor del SPI
 * @returns {string} - Clasificación (excellent, good, warning, critical)
 */
function getSPIThreshold(spiValue) {
    const thresholds = DASHBOARD_CONFIG.metrics.spi;

    if (spiValue >= thresholds.excellent) return 'excellent';
    if (spiValue >= thresholds.good) return 'good';
    if (spiValue >= thresholds.warning) return 'warning';
    return 'critical';
}

/**
 * Obtiene el umbral de CPI según el valor (para implementación futura)
 * @param {number} cpiValue - Valor del CPI
 * @returns {string} - Clasificación (excellent, good, acceptable, warning, critical)
 */
function getCPIThreshold(cpiValue) {
    const thresholds = DASHBOARD_CONFIG.metrics.cpi;

    if (cpiValue >= thresholds.excellent) return 'excellent';
    if (cpiValue >= thresholds.good) return 'good';
    if (cpiValue >= thresholds.acceptable) return 'acceptable';
    if (cpiValue >= thresholds.warning) return 'warning';
    return 'critical';
}

/**
 * Log de debug (solo si está habilitado)
 * @param {...any} args - Argumentos a loggear
 */
function debugLog(...args) {
    if (DASHBOARD_CONFIG.debug.enabled) {
        console.log('[Dashboard Debug]', ...args);
    }
}

/**
 * Validar configuración
 */
function validateConfig() {
    const errors = [];

    // Validar umbrales de SPI
    const spi = DASHBOARD_CONFIG.metrics.spi;
    if (spi.good >= spi.excellent) {
        errors.push('SPI: threshold "good" debe ser menor que "excellent"');
    }
    if (spi.warning >= spi.good) {
        errors.push('SPI: threshold "warning" debe ser menor que "good"');
    }

    // Validar colores
    const colors = DASHBOARD_CONFIG.display.colors;
    Object.keys(colors).forEach(key => {
        if (!/^#[0-9A-F]{6}$/i.test(colors[key])) {
            errors.push(`Color "${key}" no es un formato hexadecimal válido`);
        }
    });

    // Validar límites de visualización
    if (DASHBOARD_CONFIG.display.timelineMaxItems <= 0) {
        errors.push('timelineMaxItems debe ser mayor a 0');
    }
    if (DASHBOARD_CONFIG.display.tableMaxRows <= 0) {
        errors.push('tableMaxRows debe ser mayor a 0');
    }

    if (errors.length > 0) {
        console.error('Errores en la configuración del dashboard:');
        errors.forEach(err => console.error('- ' + err));
    }

    return errors.length === 0;
}

// Validar configuración al cargar
if (DASHBOARD_CONFIG.debug.enabled) {
    validateConfig();
    console.log('Configuración del dashboard:', DASHBOARD_CONFIG);
}

// Exportar funciones auxiliares
window.dashboardConfigUtils = {
    getDateFormatter,
    getDateTimeFormatter,
    getCurrencyFormatter,
    getStatusLabel,
    getComplianceLabel,
    getColor,
    getSPIThreshold,
    getCPIThreshold,
    debugLog,
    validateConfig
};
