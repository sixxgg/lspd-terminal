// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ApiRes = { __s: number; msg?: string; [k: string]: any };

export async function api(url: string, body?: unknown): Promise<ApiRes> {
  try {
    const r = await fetch(url, body === undefined
      ? { credentials: "same-origin", cache: "no-store" }
      : { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    let j: Record<string, unknown> = {};
    try { j = await r.json(); } catch { /* respuesta vacía */ }
    /* mantenimiento y borrados que piden un código de autodestrucción: los atiende components/owner.tsx */
    if (j.maint && (r.status === 503 || url.startsWith("/api/auth"))) dispatchEvent(new CustomEvent("lspdt:maint", { detail: j.maint }));
    if (r.status === 428 && j.need === "sd") dispatchEvent(new CustomEvent("lspdt:sd", { detail: j.msg }));
    return { ...j, __s: r.status };
  } catch {
    return { __s: 0, msg: "Sin conexión con el servidor" };
  }
}
export const authApi = (b: Record<string, unknown>) => api("/api/auth", b);
