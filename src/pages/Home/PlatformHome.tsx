import { Link } from 'react-router-dom';
import { Building2, ServerCog } from 'lucide-react';
import { Card, PageContainer, PageHeader } from '../../common/components/ui';
import { RequestSupportButton } from '../../common/support/RequestSupportButton';
import { useSupportSession } from '../../hooks';
import { usePlatform } from '../../services/queries/supportSessions';

const LINKS = [
  {
    to: '/distributors',
    title: 'Distribuidoras',
    text: 'Altas, suspensiones y fichas de las empresas.',
    icon: Building2,
  },
  { to: '/system', title: 'Sistema', text: 'Salud de la plataforma, correo y push de prueba.', icon: ServerCog },
];

/**
 * El inicio del administrador general fuera del modo soporte: sin datos de ninguna empresa. Los números agregados de
 * la plataforma llegan con E5 (§3 del diseño).
 */
export const PlatformHome = () => {
  const { data: platform } = usePlatform();
  const { pending } = useSupportSession();
  return (
    <PageContainer>
      <PageHeader
        title="Tablero de plataforma"
        eyebrow={platform?.name}
        description="Acá no se ven datos de las empresas. Para mirar una, pedí acceso de soporte: la empresa lo aprueba, es sólo lectura y queda registrado."
        actions={<RequestSupportButton />}
      />
      {pending && (
        <Card className="mb-6 p-4 text-sm text-ink-2">
          Pediste acceso a <span className="font-semibold text-ink">{pending.distributorName}</span>: en cuanto lo
          apruebe, el panel entra solo en modo soporte.
        </Card>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        {LINKS.map(({ to, title, text, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className="flex items-start gap-3 rounded-[14px] border border-outline bg-surface p-5 shadow-control transition-colors hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            <Icon aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-primary" strokeWidth={1.8} />
            <span>
              <span className="block font-semibold text-ink">{title}</span>
              <span className="block text-sm text-muted">{text}</span>
            </span>
          </Link>
        ))}
      </div>
    </PageContainer>
  );
};
