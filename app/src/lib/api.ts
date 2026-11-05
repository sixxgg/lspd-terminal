// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ApiRes = { __s: number; msg?: string; [k: string]: any };

export async function api(url: string, body?: unknown): Promise<ApiRes> {
  try {
    const r = await fetch(url, body === undefined
      ? { credentials: "same-origin", cache: "no-store" }
      : { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    let j: Record<string, unknown> = {};
    try { j = await r.json(); } catch { /* respuesta vacía */ }
    return { ...j, __s: r.status };
  } catch {
    return { __s: 0, msg: "Sin conexión con el servidor" };
  }
}
export const authApi = (b: Record<string, unknown>) => api("/api/auth", b);
