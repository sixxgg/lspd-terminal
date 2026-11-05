import { ExternalLink, Hammer } from "lucide-react";
import { Button, Card, Empty } from "@/components/ui";
import { openClassic, type Area, type Sec } from "@/nav";

/* Sección todavía no migrada: se abre en la versión clásica, en el mismo lugar */
export function Classic({ area, sec }: { area: Area; sec: Sec }) {
  return (
    <Card>
      <Empty icon={<Hammer />} title={`${sec.l} se está migrando`}
        desc="Mientras tanto funciona en la versión clásica, con los mismos datos. Todo lo que hagas ahí se ve acá al instante.">
        <Button onClick={() => openClassic(area.k, sec.k)} icon={<ExternalLink />}>Abrir en la versión clásica</Button>
      </Empty>
    </Card>
  );
}
