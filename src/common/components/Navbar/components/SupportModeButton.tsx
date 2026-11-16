import { useState } from 'react';
import { LifeBuoy } from 'lucide-react';
import { useSupportSession } from '../../../../hooks';
import { RequestSupportModal } from '../../../support/RequestSupportModal';

/**
 * «Modo soporte» en la barra del administrador general (en la plataforma): abre el pedido de acceso. Con un pedido
 * pendiente no se muestra: la banda de arriba ya ofrece retirarlo.
 */
export const SupportModeButton = () => {
  const [open, setOpen] = useState(false);
  const { session } = useSupportSession();
  if (session) return null;
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Entrar en modo soporte"
        title="Entrar en modo soporte"
        className="flex h-9 items-center gap-2 rounded-[10px] border border-outline bg-surface px-[9px] text-ink shadow-control transition-colors hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 lg:pl-2 lg:pr-2.5"
      >
        <LifeBuoy aria-hidden="true" className="h-4 w-4 shrink-0 text-ink-2" strokeWidth={1.8} />
        <span className="hidden text-[13px] font-medium lg:block">Modo soporte</span>
      </button>
      <RequestSupportModal open={open} onClose={() => setOpen(false)} />
    </>
  );
};
