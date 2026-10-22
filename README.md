# LSPD Terminal

Terminal de Mando del LSPD para Eleven Project RP: contratos de ascenso y descenso, citaciones 10-80, notificaciones PSB, revisión y registro de patrullas, votaciones, planilla y perfiles de agentes.

## Descarga

Bajá [`LSPD-Terminal.exe`](https://github.com/sixxgg/lspd-terminal/raw/main/dist/LSPD-Terminal.exe) y guardalo en una carpeta propia (por ejemplo, Documentos).

- Requiere Windows 10/11 (usa Microsoft Edge WebView2, que ya viene instalado).
- La primera vez Windows puede mostrar "Windows protegió su PC": *Más información* → *Ejecutar de todas formas*.
- Los datos se guardan en `%APPDATA%\LSPD-Terminal\datos.json`.

## Actualizaciones

La terminal revisa este repositorio al abrirse. Cuando hay una versión nueva muestra un aviso con **Actualizar ahora**: descarga, verifica y reemplaza el programa sin tocar los datos.

Cada versión se publica actualizando `dist/LSPD-Terminal.exe` y `latest.json` (versión, número de compilación `build`, sha256 y novedades que se muestran dentro de la terminal). La terminal se actualiza cuando el `build` publicado es mayor que el suyo.

Versión actual: **v0.1** (versión base).
