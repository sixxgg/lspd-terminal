# LSPD · Terminal de Mando

Terminal de mando del LSPD (Eleven Project). Desde la **v0.3** es una página web con base de datos compartida, alojada en **Vercel**.

## Cómo está armada

| Carpeta | Qué hay |
|---|---|
| `public/` | La terminal (una sola página) y el ícono para instalarla como app |
| `api/` | Funciones de Vercel: `auth` (cuentas y sesiones), `data` (datos compartidos), `img` (fotos) |
| `lib/` | Conexión a Postgres, fusión de cambios, reglas de permisos y roster por defecto |
| `dist/`, `latest.json` | Programa `.exe` anterior (v0.2) y su actualizador. No se usan en la web |

- Las tablas se crean solas la primera vez que alguien entra.
- Contraseñas cifradas con scrypt; sesión en cookie segura (HttpOnly). Mantener la sesión: 30 días; si no, 1 día.
- Cada cambio se guarda en el momento. Los demás lo ven en unos 5 segundos. Si dos personas editan lo mismo a la vez, se fusionan los cambios de las dos.
- El servidor verifica:
  - El rango mínimo para entrar (Sargento I o superior).
  - Quién puede tocar las excepciones (Teniente o superior).
  - Quién puede editar el catálogo del PSB (Vega Chambers y Madison Wells).
  - Quién administra cuentas y el código de registro (Teniente o superior).
  - Quién cambia logo, favicon, fondos e íconos de secciones: solo administradores (por defecto Ryan Westbrook; se cambia con la variable `ADMINS` en Vercel, nombres separados por coma).

## Puesta en marcha (una sola vez)

1. **Importar el repositorio en Vercel.** En vercel.com: Add New → Project → `sixxgg/lspd-terminal` → Deploy. No hace falta tocar ninguna opción.
2. **Crear la base de datos.** En el proyecto: Storage → Create Database → **Neon** (Postgres, plan gratis) → Connect. Vercel agrega `DATABASE_URL` solo.
   - También sirve Supabase u otro Postgres: alcanza con la variable `DATABASE_URL` o `POSTGRES_URL`.
3. **Volver a desplegar.** Deployments → ⋯ → Redeploy, para que tome la variable nueva.
4. **Primer ingreso.** Entrar a la URL del proyecto y registrarse.
5. **Pasar los datos del programa.** Desde el `.exe`: Ajustes → Exportar respaldo. En la web: Ajustes → Importar respaldo. Sube perfiles, votaciones, registros y fotos. Las cuentas no se pasan: cada uno se registra de nuevo.
6. **Cargar el roster completo.** Ajustes → Roster → Cargar `roster-lspd.csv`. El roster del repositorio no trae Discord ni State ID, porque el repositorio es público.
7. **Cerrar el registro.** Recomendado: Capitanía → Permisos y cuentas → Código de registro.

## Probar en local

```bash
npm install
DATABASE_URL=postgres://usuario@localhost:5432/lspd node dev/server.mjs   # http://localhost:3000
```
