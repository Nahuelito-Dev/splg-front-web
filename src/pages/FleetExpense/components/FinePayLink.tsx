import { Copy, ExternalLink } from 'lucide-react';
import { Button } from '../../../common/components/ui';
import type { TrafficFineV2 } from '../../../services/api/types';
import { notify } from '../../../utils/notifications';

const linkClass =
  'inline-flex h-8 items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-primary-edge bg-gradient-to-b from-primary-from to-primary-to px-3 text-xs font-semibold text-on-primary shadow-primary transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 [&_svg]:h-4 [&_svg]:w-4';

const copyPaymentCode = (code: string) => {
  navigator.clipboard.writeText(code).then(
    () => notify.success('Código de pago copiado'),
    () => notify.error(new Error('No se pudo copiar el código')),
  );
};

/** «Pagar»: abre el enlace de pago de la multa (portal del municipio o Mercado Pago) en otra pestaña. */
export const FinePayLink = ({ fine }: { fine: Pick<TrafficFineV2, 'paymentUrl'> }) =>
  fine.paymentUrl ? (
    <a
      href={fine.paymentUrl}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Pagar (se abre en otra pestaña)"
      className={linkClass}
    >
      <ExternalLink aria-hidden="true" /> Pagar
    </a>
  ) : (
    <Button
      size="sm"
      icon={<ExternalLink />}
      blockedReason="La multa no tiene enlace de pago cargado: editala para agregarlo"
    >
      Pagar
    </Button>
  );

/** El código de pago de la multa, con botón para copiarlo. */
export const FinePaymentCode = ({ fine }: { fine: Pick<TrafficFineV2, 'paymentCode'> }) =>
  fine.paymentCode ? (
    <span className="flex flex-wrap items-center gap-2 text-sm">
      <span className="text-muted">Código de pago</span>
      <span className="break-all font-mono text-ink">{fine.paymentCode}</span>
      <Button
        size="sm"
        variant="ghost"
        icon={<Copy />}
        aria-label="Copiar el código de pago"
        onClick={() => copyPaymentCode(fine.paymentCode ?? '')}
      >
        Copiar
      </Button>
    </span>
  ) : null;
