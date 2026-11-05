import { LS } from "./store";
import TPL from "./tpl.json";

export type TplKey = keyof typeof TPL;
export const TPL_DEF = TPL as Record<TplKey, { l: string; vars: string[]; t: string }>;
export const DC_DEF = { emoji: "<:LSPD:1316164582732988457>", alertRole: "1322196291509555283", alertRoleName: "Alerta Táctica", desde: "Capitanía", firma: "Atte. Capitanía LSPD" };
export type DcCfg = typeof DC_DEF;
export function dcfg(): DcCfg {
  const c = { ...DC_DEF, ...LS.json<Partial<DcCfg>>("lspdt.dcfg", {}) };
  if (!c.desde || c.desde === "Supervisores") c.desde = DC_DEF.desde;
  if (!c.firma || c.firma === "Atte. Supervisores LSPD") c.firma = DC_DEF.firma;
  return c;
}
export const tplOf = (k: TplKey) => LS.get("lspdt.tpl." + k) || TPL_DEF[k].t;
export const fillTpl = (t: string, v: Record<string, string>) => t.replace(/\{(\w+)\}/g, (m, k) => (v[k] !== undefined ? v[k] : m)).replace(/\n{3,}/g, "\n\n").trim();
export const uiText = (k: "title" | "kicker" | "foot" | "place" | "bot") => {
  const d = { title: "Terminal de Mando", kicker: "Los Santos Police Department", foot: "Mission Row 10 · Uso interno", place: "Los Santos · Mission Row 10", bot: "LSPD Terminal" };
  return (String(LS.json<Record<string, string>>("lspdt.ui", {})[k] || "")).trim() || d[k];
};
