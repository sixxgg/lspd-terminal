/* Categoría → marca → modelo, con autocompletado: cada campo filtra al siguiente y elegir un modelo completa los otros dos */
import { useId, useMemo } from "react";
import { Input, Select } from "@/components/ui";
import { VEH_CATS, brandsOf, findModel, modelsOf } from "@/lib/vehicles";
import { cn } from "@/lib/cn";

type VehVal = { cat?: string; mk?: string; md?: string; mo?: string };

export function VehPick({ v, onChange, police, className }: { v: VehVal; onChange: (p: Required<Pick<VehVal, "cat" | "mk" | "md" | "mo">>) => void; police?: boolean; className?: string }) {
  const id = useId(), cat = v.cat || "", mk = v.mk || "", md = v.md ?? v.mo ?? "";
  const brands = useMemo(() => brandsOf(cat), [cat]), models = useMemo(() => modelsOf(cat, mk), [cat, mk]);
  const emit = (c: string, b: string, m: string) => onChange({ cat: c, mk: b, md: m, mo: /^LSPD/.test(b) ? m : [b, m].filter(Boolean).join(" ") });
  const pickModel = (m: string) => { const hit = findModel(m, mk); if (hit) emit(hit.c, hit.b, hit.m); else emit(cat, mk, m); };
  return (
    <div className={cn("grid gap-2 sm:grid-cols-[9.5rem_10rem_1fr]", className)}>
      <Select value={cat} onChange={e => emit(e.target.value, mk && brandsOf(e.target.value).includes(mk) ? mk : "", md)} className="text-sm" aria-label="Categoría">
        <option value="">{police ? "Categoría…" : "Categoría (todas)"}</option>{VEH_CATS.map(c => <option key={c}>{c}</option>)}</Select>
      <Input list={id + "b"} value={mk} onChange={e => emit(cat, e.target.value, md)} placeholder="Marca" aria-label="Marca" />
      <Input list={id + "m"} value={md} onChange={e => pickModel(e.target.value)} placeholder={police ? "Modelo (ej: Police Buffalo)" : "Modelo (ej: Buffalo STX)"} aria-label="Modelo" />
      <datalist id={id + "b"}>{brands.map(b => <option key={b} value={b} />)}</datalist>
      <datalist id={id + "m"}>{models.slice(0, 400).map(x => <option key={x.s + x.n} value={x.m}>{(mk ? "" : x.b + " · ") + x.c + " · " + x.s}</option>)}</datalist>
    </div>
  );
}
