# Dashboard CSJ Rama Judicial

Dashboard de seguimiento del proyecto de consultoría para el Consejo Superior de la Judicatura — Escuela Judicial "Rodrigo Lara Bonilla".

## Descripción

Aplicación web estática que consume datos desde Google Sheets (vía Google Apps Script) y presenta:

- Indicador global de avance ponderado por impacto contractual
- Indicador CPI (Cost Performance Index)
- Desglose por etapa contractual
- Detalle de entregables con ciclos de producción y fases (elaboración, revisión, ajustes, aprobación)
- Cronograma visual tipo Gantt con ruta crítica
- Gestión de riesgos bajo monitoreo
- Generador de informe de corte con líneas base comparables

## Arquitectura

```
Cliente (navegador)
     ↓
index.html + CSS + JS (frontend estático)
     ↓
Google Sheets (vía Google Apps Script Web App)
```

El frontend es 100% estático. Toda la persistencia dinámica vive en Google Sheets. Los datos del archivo `deliverables_data.json` funcionan como fallback cuando no hay conexión con Sheets.

## Despliegue

El código de este repositorio se sirve vía [jsDelivr CDN](https://www.jsdelivr.com/) directamente desde GitHub. La URL final del dashboard es un recurso de tipo archivo alojado en Moodle que actúa como cáscara (loader) y carga los recursos desde el CDN.

Cualquier cambio en `main` se refleja automáticamente en producción después de purgar el caché de jsDelivr (proceso automatizado vía GitHub Actions).

## Estructura de archivos

| Archivo | Propósito |
|---|---|
| `index.html` | Estructura del dashboard |
| `styles.css` | Estilos |
| `config.js` | Configuración (URL de Apps Script, pesos contractuales, etc.) |
| `app.js` | Inicialización |
| `deliverables.js` | Lógica principal: renderizado, cálculos, modal, Gantt, informe |
| `sheets-api.js` | Cliente para Google Apps Script |
| `deliverables_data.json` | Fallback estático con la estructura de entregables |
| `logo.png` | Logo institucional |
| `support_files/google_apps_script.gs` | Código del backend (Google Apps Script), para referencia |

## Stack técnico

- HTML / CSS / JavaScript vanilla (sin frameworks)
- Google Apps Script como backend (Sheets como base de datos)
- jsDelivr como CDN de distribución
