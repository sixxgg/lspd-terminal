import { forwardRef, useId, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes, type SelectHTMLAttributes, type HTMLAttributes } from "react";
import { Loader2, Search } from "lucide-react";
import { cn } from "@/lib/cn";

const ring = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-950";

/* ---------- Button ---------- */
type BtnVariant = "primary" | "secondary" | "ghost" | "danger" | "outline";
type BtnSize = "sm" | "md" | "lg" | "icon";
export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> { variant?: BtnVariant; size?: BtnSize; loading?: boolean; icon?: ReactNode }
const btnV: Record<BtnVariant, string> = {
  primary: "bg-brand-600 text-white shadow-sm hover:bg-brand-500 active:bg-brand-700 dark:bg-brand-500 dark:hover:bg-brand-400",
  secondary: "bg-slate-900 text-white shadow-sm hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200",
  outline: "border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800",
  ghost: "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/70 dark:hover:text-white",
  danger: "bg-red-600 text-white shadow-sm hover:bg-red-500 dark:bg-red-500/90 dark:hover:bg-red-500",
};
const btnS: Record<BtnSize, string> = { sm: "h-8 gap-1.5 rounded-lg px-3 text-xs", md: "h-10 gap-2 rounded-xl px-4 text-sm", lg: "h-11 gap-2 rounded-xl px-5 text-sm", icon: "h-9 w-9 rounded-xl" };
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({ variant = "primary", size = "md", loading, icon, className, children, disabled, ...p }, ref) => (
  <button ref={ref} disabled={disabled || loading}
    className={cn("inline-flex select-none items-center justify-center font-semibold transition-all duration-150 disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0", ring, btnV[variant], btnS[size], className)} {...p}>
    {loading ? <Loader2 className="animate-spin" /> : icon}{children}
  </button>
));
Button.displayName = "Button";

/* ---------- Campos ---------- */
const field = "w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm transition placeholder:text-slate-400 hover:border-slate-300 focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/15 disabled:opacity-60 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-100 dark:placeholder:text-slate-500 dark:hover:border-slate-700 dark:focus:border-brand-400 dark:focus:ring-brand-400/15";
export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(({ className, ...p }, ref) => (
  <input ref={ref} className={cn(field, "h-10", className)} {...p} />
));
Input.displayName = "Input";
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(({ className, ...p }, ref) => (
  <textarea ref={ref} className={cn(field, "min-h-[88px] resize-y py-2.5 leading-relaxed", className)} {...p} />
));
Textarea.displayName = "Textarea";
export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(({ className, children, ...p }, ref) => (
  <select ref={ref} className={cn(field, "h-10 cursor-pointer pr-8", className)} {...p}>{children}</select>
));
Select.displayName = "Select";

export function Field({ label, hint, error, children, className }: { label?: ReactNode; hint?: ReactNode; error?: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      {label && <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400">{label}{hint && <span className="ml-1 font-normal text-slate-400 dark:text-slate-500">{hint}</span>}</label>}
      {children}
      {error && <p className="text-xs font-medium text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}

/* ---------- Tarjeta ---------- */
export function Card({ className, ...p }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/60 dark:shadow-none", className)} {...p} />;
}
export function CardHeader({ icon, title, desc, action }: { icon?: ReactNode; title: ReactNode; desc?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-start gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800/80">
      {icon && <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-300 [&_svg]:size-[18px]">{icon}</div>}
      <div className="min-w-0 flex-1"><h3 className="text-sm font-semibold text-slate-900 dark:text-white">{title}</h3>{desc && <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{desc}</p>}</div>
      {action}
    </div>
  );
}
export const CardBody = ({ className, ...p }: HTMLAttributes<HTMLDivElement>) => <div className={cn("space-y-4 p-5", className)} {...p} />;

/* ---------- Selector segmentado ---------- */
export function Segmented<T extends string>({ value, onChange, options, size = "md", className }: { value: T; onChange: (v: T) => void; options: { value: T; label: ReactNode; icon?: ReactNode }[]; size?: "sm" | "md"; className?: string }) {
  return (
    <div role="radiogroup" className={cn("inline-flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-slate-100/80 p-1 dark:border-slate-800 dark:bg-slate-900", className)}>
      {options.map(o => {
        const on = o.value === value;
        return (
          <button key={o.value} type="button" role="radio" aria-checked={on} onClick={() => onChange(o.value)}
            className={cn("inline-flex items-center gap-1.5 rounded-lg font-semibold transition-all [&_svg]:size-3.5", ring, size === "sm" ? "px-2.5 py-1 text-xs" : "px-3.5 py-1.5 text-sm",
              on ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white" : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white")}>
            {o.icon}{o.label}
          </button>
        );
      })}
    </div>
  );
}

/* ---------- Chips (selección simple o múltiple) ---------- */
export function Chip({ active, onClick, children, className }: { active?: boolean; onClick?: () => void; children: ReactNode; className?: string }) {
  return (
    <button type="button" aria-pressed={!!active} onClick={onClick}
      className={cn("inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-all [&_svg]:size-3.5", ring,
        active ? "border-brand-500 bg-brand-50 text-brand-700 dark:border-brand-400 dark:bg-brand-500/15 dark:text-brand-200"
          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:border-slate-700 dark:hover:text-white", className)}>
      {children}
    </button>
  );
}

/* ---------- Badge ---------- */
export function Badge({ children, color, className }: { children: ReactNode; color?: string; className?: string }) {
  return (
    <span style={color ? ({ "--c": color } as React.CSSProperties) : undefined}
      className={cn("inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold",
        color ? "badge-c"
          : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300", className)}>
      {children}
    </span>
  );
}

/* ---------- Checkbox ---------- */
export function Checkbox({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: ReactNode }) {
  const id = useId();
  return (
    <label htmlFor={id} className="inline-flex cursor-pointer select-none items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
      <input id={id} type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)}
        className="size-4 cursor-pointer rounded border-slate-300 accent-brand-600 focus-visible:ring-2 focus-visible:ring-brand-500 dark:border-slate-700" />
      {label}
    </label>
  );
}

export function Empty({ icon, title, desc, children }: { icon: ReactNode; title: string; desc?: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <div className="grid size-12 place-items-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500 [&_svg]:size-6">{icon}</div>
      <h4 className="mt-4 text-sm font-semibold text-slate-900 dark:text-white">{title}</h4>
      {desc && <p className="mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">{desc}</p>}
      {children && <div className="mt-5">{children}</div>}
    </div>
  );
}
/* buscador con lupa (el mismo en todas las listas) */
export function SearchInput({ value, onChange, placeholder, className, autoFocus }: { value: string; onChange: (v: string) => void; placeholder?: string; className?: string; autoFocus?: boolean }) {
  return <div className={cn("relative", className)}><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><Input className="pl-9" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} autoFocus={autoFocus} aria-label={placeholder || "Buscar"} /></div>;
}
export { ring as focusRing };
