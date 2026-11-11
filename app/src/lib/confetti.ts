/* confeti liviano: papelitos de colores que caen desde arriba y se borran solos (sin librerías) */
const COLS = ["#f43f5e", "#f59e0b", "#22c55e", "#06b6d4", "#8b5cf6", "#ec4899", "#facc15"];
export function confetti(n = 140) {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const box = document.createElement("div");
  box.style.cssText = "position:fixed;inset:0;pointer-events:none;z-index:90;overflow:hidden";
  for (let i = 0; i < n; i++) {
    const p = document.createElement("i"), w = 6 + Math.random() * 6, x = Math.random() * 100, d = 1.8 + Math.random() * 1.6, dx = (Math.random() - 0.5) * 240, r = Math.random() * 900;
    p.style.cssText = `position:absolute;top:-16px;left:${x}vw;width:${w}px;height:${w * 0.45}px;background:${COLS[i % COLS.length]};border-radius:2px;opacity:.95`;
    p.animate([{ transform: "translate(0,0) rotate(0)" }, { transform: `translate(${dx}px,${innerHeight + 40}px) rotate(${r}deg)` }], { duration: d * 1000, delay: Math.random() * 400, easing: "cubic-bezier(.2,.6,.4,1)", fill: "forwards" });
    box.appendChild(p);
  }
  document.body.appendChild(box); setTimeout(() => box.remove(), 4200);
}
