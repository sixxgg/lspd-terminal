import { LS } from "./store";
import { DEPT, type DeptId } from "./dept";
import TPL from "./tpl.json";

export type TplKey = keyof typeof TPL;
export const TPL_DEF = TPL as Record<TplKey, { l: string; vars: string[]; t: string }>;
const DC_DEF = { emoji: "<:LSPD:1316164582732988457>", alertRole: "1322196291509555283", alertRoleName: "Alerta Táctica", desde: "Capitanía", firma: "Atte. Capitanía LSPD" };
type DcCfg = typeof DC_DEF;
export function dcfg(): DcCfg {
  const c = { ...DC_DEF, ...LS.json<Partial<DcCfg>>("lspdt.dcfg", {}) };
  if (!c.desde || c.desde === "Supervisores") c.desde = DC_DEF.desde;
  if (!c.firma || c.firma === "Atte. Supervisores LSPD") c.firma = DC_DEF.firma;
  return c;
}
export const tplOf = (k: TplKey) => LS.get("lspdt.tpl." + k) || TPL_DEF[k].t;
export const fillTpl = (t: string, v: Record<string, string>) => t.replace(/\{(\w+)\}/g, (m, k) => (v[k] !== undefined ? v[k] : m)).replace(/\n{3,}/g, "\n\n").trim();
/* textos de la interfaz por departamento (Administración › Marca): en el LSSD y la SAHP se guardan como «clave.depto» dentro de lspdt.ui */
export type UiKey = "title" | "kicker" | "foot" | "place" | "bot" | "sys";
export const UI_DEF: Record<DeptId, Record<UiKey, string>> = {
  lspd: { title: "Terminal de Mando", kicker: "Los Santos Police Department", foot: "Mission Row 10 · Uso interno", place: "Los Santos · Mission Row 10", bot: "LSPD Terminal", sys: "Terminal LSPD" },
  lssd: { title: "Terminal de Mando", kicker: "Los Santos Sheriff's Department", foot: "Sheriff's Station · Uso interno", place: "Los Santos · Sheriff's Station", bot: "LSSD Terminal", sys: "Terminal LSSD" },
  sahp: { title: "Terminal de Mando", kicker: "San Andreas Highway Patrol", foot: "Highway Patrol · Uso interno", place: "San Andreas · Highway Patrol", bot: "SAHP Terminal", sys: "Terminal SAHP" },
};
export const uiKey = (k: UiKey, d: DeptId = DEPT.id) => (d === "lspd" ? k : `${k}.${d}`);
export const uiText = (k: UiKey, d: DeptId = DEPT.id) => (String(LS.json<Record<string, string>>("lspdt.ui", {})[uiKey(k, d)] || "")).trim() || UI_DEF[d][k];
