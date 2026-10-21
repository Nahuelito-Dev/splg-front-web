import { Copy, ExternalLink } from 'lucide-react';
import { Button } from '../../../common/components/ui';
import { notify } from '../../../utils/notifications';

/** Enlace de pago online pendiente: el operador lo copia o lo abre para reenviárselo al cliente. */
export const PaymentLink = ({ url, title = 'Enlace de pago (MercadoPago)' }: { url: string; title?: string }) => {
  const copy = () => {
    navigator.clipboard.writeText(url).then(
      () => notify.success('Enlace de pago copiado'),
      () => notify.error(new Error('No se pudo copiar el enlace')),
    );
  };

  return (
    <div className="mt-3 rounded-lg border border-outline bg-surface-hover p-3">
      <p className="text-xs font-medium text-muted">{title}</p>
      <p className="mt-1 break-all font-mono text-[11px] text-ink-2">{url}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" icon={<Copy />} onClick={copy}>
          Copiar enlace
        </Button>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-8 items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-outline bg-surface px-3 text-xs font-semibold text-ink shadow-control transition hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 [&_svg]:h-4 [&_svg]:w-4"
        >
          <ExternalLink aria-hidden="true" /> Abrir
        </a>
      </div>
    </div>
  );
};
