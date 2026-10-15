import { Button } from '../../../common/components/ui';

interface Props {
  onAccept: () => void;
}

/** Otra persona guardó mientras había cambios sin guardar: se avisa y se recarga sólo si lo aceptan. */
export const StaleConfigNotice = ({ onAccept }: Props) => (
  <div
    role="status"
    className="flex flex-wrap items-center justify-between gap-3 rounded-[10px] border border-warn/40 bg-warn/10 px-4 py-3 text-sm text-ink"
  >
    <p>Otro administrador cambió la configuración. Tus cambios sin guardar siguen acá.</p>
    <Button variant="secondary" size="sm" onClick={onAccept}>
      Ver los cambios
    </Button>
  </div>
);
