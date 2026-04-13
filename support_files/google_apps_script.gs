// ============================================================
// Google Apps Script — Backend para Dashboard CSJ Rama Judicial
// ============================================================
//
// INSTRUCCIONES DE DESPLIEGUE:
// 1. Abra https://script.google.com
// 2. Cree un nuevo proyecto (o abra el existente del dashboard)
// 3. Reemplace TODO el código de Code.gs con este archivo
// 4. Guarde (Ctrl+S)
// 5. Deploy > New deployment
//    - Type: Web app
//    - Execute as: Me
//    - Who has access: Anyone
// 6. Copie la URL generada y actualice config.js → googleSheets.appsScriptUrl
// 7. Si ya tenía un deployment anterior, use "Manage deployments"
//    y cree una NUEVA versión para que los cambios surtan efecto
//
// IMPORTANTE: Esta versión fuerza formato TEXTO en todas las celdas
// para evitar que Sheets auto-convierta IDs como "1.1.1" a fechas.
// ============================================================

const SHEET_NAMES = {
  ENTREGABLES: 'Entregables',
  HISTORIAL: 'Historial',
  RIESGOS: 'Riesgos',
  CONFIG: 'Config',
  LINEAS_BASE: 'LineasBase'
};

const HEADERS = {
  ENTREGABLES: [
    'etapa_id', 'etapa_nombre', 'producto_id', 'producto_nombre',
    'entregable_id', 'entregable_nombre', 'descripcion', 'estado',
    'responsable', 'fecha_inicio', 'fecha_entrega', 'ultimo_cambio',
    'observaciones', 'url_repositorio', 'actividades', 'cycles'
  ],
  HISTORIAL: ['fecha', 'entregable_id', 'estado', 'usuario'],
  RIESGOS: ['id', 'descripcion', 'categoria', 'disparador', 'estado'],
  CONFIG: ['clave', 'valor'],
  LINEAS_BASE: ['id', 'fecha', 'nombre', 'datos']
};

// ===== GET Handler =====
function doGet(e) {
  try {
    const action = (e && e.parameter && e.parameter.action) || 'all';
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const result = { success: true };

    if (action === 'all' || action === 'deliverables') {
      result.deliverables = readSheet(ss, SHEET_NAMES.ENTREGABLES, HEADERS.ENTREGABLES);
    }
    if (action === 'all' || action === 'history') {
      result.history = readSheet(ss, SHEET_NAMES.HISTORIAL, HEADERS.HISTORIAL);
    }
    if (action === 'all' || action === 'risks') {
      result.risks = readSheet(ss, SHEET_NAMES.RIESGOS, HEADERS.RIESGOS);
    }
    if (action === 'all' || action === 'config') {
      result.config = readSheet(ss, SHEET_NAMES.CONFIG, HEADERS.CONFIG);
    }
    if (action === 'all' || action === 'baselines') {
      result.baselines = readSheet(ss, SHEET_NAMES.LINEAS_BASE, HEADERS.LINEAS_BASE);
    }

    return jsonResponse(result);
  } catch (err) {
    return jsonResponse({ success: false, error: err.message });
  }
}

// ===== POST Handler =====
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    switch (action) {
      case 'sync_deliverables':
        writeSheet(ss, SHEET_NAMES.ENTREGABLES, HEADERS.ENTREGABLES, data.rows);
        break;
      case 'save_deliverable':
        upsertRow(ss, SHEET_NAMES.ENTREGABLES, HEADERS.ENTREGABLES, 'entregable_id', data.row);
        break;
      case 'sync_history':
        writeSheet(ss, SHEET_NAMES.HISTORIAL, HEADERS.HISTORIAL, data.rows);
        break;
      case 'add_history':
        appendRows(ss, SHEET_NAMES.HISTORIAL, HEADERS.HISTORIAL, data.rows);
        break;
      case 'sync_risks':
        writeSheet(ss, SHEET_NAMES.RIESGOS, HEADERS.RIESGOS, data.rows);
        break;
      case 'save_risk':
        upsertRow(ss, SHEET_NAMES.RIESGOS, HEADERS.RIESGOS, 'id', data.row);
        break;
      case 'sync_config':
        writeSheet(ss, SHEET_NAMES.CONFIG, HEADERS.CONFIG, data.rows);
        break;
      case 'save_config':
        upsertRow(ss, SHEET_NAMES.CONFIG, HEADERS.CONFIG, 'clave', data.row);
        break;
      case 'save_baseline':
        appendRows(ss, SHEET_NAMES.LINEAS_BASE, HEADERS.LINEAS_BASE, [data.row]);
        break;
      case 'delete_baseline':
        deleteRow(ss, SHEET_NAMES.LINEAS_BASE, HEADERS.LINEAS_BASE, 'id', data.id);
        break;
      case 'init':
        initAllSheets(ss, data);
        break;
      default:
        return jsonResponse({ success: false, error: 'Acción no reconocida: ' + action });
    }

    return jsonResponse({ success: true, action: action });
  } catch (err) {
    return jsonResponse({ success: false, error: err.message });
  }
}

// ===== Funciones auxiliares =====

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function getOrCreateSheet(ss, name, headers) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    // Formatear TODA la hoja como texto plano
    sheet.getRange(1, 1, sheet.getMaxRows(), headers.length).setNumberFormat('@');
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function readSheet(ss, name, defaultHeaders) {
  const sheet = getOrCreateSheet(ss, name, defaultHeaders);
  const data = sheet.getDataRange().getDisplayValues();
  if (data.length < 2) return [];

  const headers = data[0];
  const rows = [];
  for (var i = 1; i < data.length; i++) {
    var row = {};
    for (var j = 0; j < headers.length; j++) {
      var val = data[i][j];
      row[headers[j]] = (val === null || val === undefined) ? '' : String(val);
    }
    rows.push(row);
  }
  return rows;
}

function writeSheet(ss, name, headers, rows) {
  const sheet = getOrCreateSheet(ss, name, headers);
  // Limpiar datos existentes (preservar header)
  if (sheet.getLastRow() > 1) {
    sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).clear();
  }
  // Escribir nuevos datos
  if (rows && rows.length > 0) {
    var dataArray = rows.map(function(row) {
      return headers.map(function(h) {
        var v = row[h];
        return (v !== undefined && v !== null) ? String(v) : '';
      });
    });
    var range = sheet.getRange(2, 1, dataArray.length, headers.length);
    // Forzar formato texto ANTES de escribir valores
    range.setNumberFormat('@');
    range.setValues(dataArray);
  }
}

function appendRows(ss, name, headers, rows) {
  const sheet = getOrCreateSheet(ss, name, headers);
  if (rows && rows.length > 0) {
    var dataArray = rows.map(function(row) {
      return headers.map(function(h) {
        var v = row[h];
        return (v !== undefined && v !== null) ? String(v) : '';
      });
    });
    var startRow = sheet.getLastRow() + 1;
    var range = sheet.getRange(startRow, 1, dataArray.length, headers.length);
    // Forzar formato texto ANTES de escribir valores
    range.setNumberFormat('@');
    range.setValues(dataArray);
  }
}

function upsertRow(ss, name, headers, keyField, rowData) {
  const sheet = getOrCreateSheet(ss, name, headers);
  const data = sheet.getDataRange().getDisplayValues();
  const keyIndex = headers.indexOf(keyField);

  if (keyIndex === -1) throw new Error('Campo clave no encontrado: ' + keyField);

  var targetRow = -1;
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][keyIndex]).trim() === String(rowData[keyField]).trim()) {
      targetRow = i + 1;
      break;
    }
  }

  var rowArray = headers.map(function(h) {
    var v = rowData[h];
    return (v !== undefined && v !== null) ? String(v) : '';
  });

  if (targetRow > 0) {
    var range = sheet.getRange(targetRow, 1, 1, headers.length);
    range.setNumberFormat('@');
    range.setValues([rowArray]);
  } else {
    var newRow = sheet.getLastRow() + 1;
    var range = sheet.getRange(newRow, 1, 1, headers.length);
    range.setNumberFormat('@');
    range.setValues([rowArray]);
  }
}

function deleteRow(ss, name, headers, keyField, keyValue) {
  const sheet = getOrCreateSheet(ss, name, headers);
  const data = sheet.getDataRange().getDisplayValues();
  const keyIndex = headers.indexOf(keyField);
  if (keyIndex === -1) throw new Error('Campo clave no encontrado: ' + keyField);

  for (var i = data.length - 1; i >= 1; i--) {
    if (String(data[i][keyIndex]).trim() === String(keyValue).trim()) {
      sheet.deleteRow(i + 1);
      return;
    }
  }
}

function initAllSheets(ss, data) {
  if (data.deliverables) writeSheet(ss, SHEET_NAMES.ENTREGABLES, HEADERS.ENTREGABLES, data.deliverables);
  if (data.history) writeSheet(ss, SHEET_NAMES.HISTORIAL, HEADERS.HISTORIAL, data.history);
  if (data.risks) writeSheet(ss, SHEET_NAMES.RIESGOS, HEADERS.RIESGOS, data.risks);
  if (data.config) writeSheet(ss, SHEET_NAMES.CONFIG, HEADERS.CONFIG, data.config);
}
