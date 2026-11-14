import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Ban, Building2, CircleCheck, LogIn, Pencil, Trash2 } from 'lucide-react';
import {
  AuditHistoryLink,
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
  PageContainer,
  PageHeader,
  Tabs,
  tabPanelProps,
  type MenuAction,
} from '../../common/components/ui';
import { useBackToList, usePermissions, useProfileTab, useUrlParams } from '../../hooks';
import { useCrumbLeaf } from '../../common/components';
import { RequestSupportButton } from '../../common/support/RequestSupportButton';
import { errorMessage } from '../../services/api/errors';
import type { CompanyProfile } from '../../services/api/types';
import { usePlatformCompany, useSetCompanyOwnedByPlatform } from '../../services/queries/platformConsole';
import { confirm, notify } from '../../utils/notifications';
import { DISTRIBUTOR_STATUS, labelOf } from '../../utils/statusLabels';
import { OwnedBadge } from '../Platform/components/OwnedBadge';
import { CompanyAdminsTab } from './components/CompanyAdminsTab';
import { CompanyDataTab } from './components/CompanyDataTab';
import { CompanySupportTab } from './components/CompanySupportTab';
import { CompanyUsageTab } from './components/CompanyUsageTab';
import { useDistributorActions } from './useDistributorActions';
import { useEnterOwnedCompany } from '../Platform/useEnterOwnedCompany';

const TABS_ID = 'company';
const TAB_KEYS = ['data', 'usage', 'admins', 'support'];

/** Marcar o desmarcar la empresa propia, con confirmación; el rechazo de la API queda a la vista. */
const useOwnedToggle = () => {
  const setOwned = useSetCompanyOwnedByPlatform();
  const [error, setError] = useState<string | null>(null);
  const toggle = async (company: CompanyProfile) => {
    const marking = !company.ownedByPlatform;
    const ok = await confirm(
      marking
        ? {
            title: `¿Marcar «${company.name}» como empresa propia?`,
            text: 'La plataforma la opera directo, sin pedir acceso de soporte. Sólo se puede con una empresa de prueba creada por la plataforma, sin clientes, admins ni pedidos reales. Se avisa a sus administradores y queda en la auditoría.',
            confirmText: 'Marcar como propia',
          }
        : {
            title: `¿Desmarcar «${company.name}»?`,
            text: 'Deja de ser la empresa propia: ya no se entra directo, y para verla hay que pedir acceso de soporte como a cualquier otra. Se avisa a sus administradores y queda en la auditoría.',
            confirmText: 'Desmarcar',
            danger: true,
          },
    );
    if (!ok) return;
    setError(null);
    setOwned.mutate(
      { id: company.id, ownedByPlatform: marking },
      {
        onSuccess: () => notify.success(marking ? 'Marcada como empresa propia' : 'Ya no es la empresa propia'),
        onError: (err) => setError(errorMessage(err)),
      },
    );
  };
  return { toggle, error, clearError: () => setError(null), busy: setOwned.isPending };
};

/**
 * La ficha de una empresa en la plataforma (`GET /v2/platform/companies/:id`), sólo para el administrador general:
 * Datos, Uso (métricas del período, lector y procesos), Admins y Soporte.
 */
export const DistributorDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const goBack = useBackToList('/distributors');
  const { isSuperAdmin } = usePermissions();
  const [range, setRange] = useUrlParams({ from: '', to: '' });
  const [tab, setTab] = useProfileTab(TAB_KEYS, 'data');
  const { data: detail, isPending, error, refetch } = usePlatformCompany(isSuperAdmin ? id : undefined, range);
  const company = detail?.company;
  useCrumbLeaf(company?.name, goBack);
  const { toggleStatus, remove } = useDistributorActions({ onDeleted: () => navigate('/distributors') });
  const owned = useOwnedToggle();
  const enterOwned = useEnterOwnedCompany();

  if (!isSuperAdmin) {
    return (
      <PageContainer>
        <EmptyState title="Sin acceso" description="Sólo el administrador general ve las distribuidoras." />
      </PageContainer>
    );
  }

  const headerPrimary = company ? (
    <>
      <AuditHistoryLink entity="Distributor" recordId={company.id} />
      {/* A la propia se entra directo; a cualquier otra, con un acceso de soporte que la empresa aprueba. */}
      {company.ownedByPlatform ? (
        <Button size="sm" icon={<LogIn />} onClick={() => enterOwned(company)}>
          Entrar a la empresa
        </Button>
      ) : (
        <RequestSupportButton size="sm" distributorId={company.id} />
      )}
    </>
  ) : undefined;
  const headerSecondary: MenuAction[] = company
    ? [
        { label: 'Editar', icon: <Pencil />, onClick: () => navigate(`/distributors/${company.id}/edit`) },
        {
          label: company.ownedByPlatform ? 'Desmarcar como empresa propia' : 'Marcar como empresa propia',
          icon: <Building2 />,
          disabled: owned.busy,
          onClick: () => void owned.toggle(company),
        },
        company.status === 'active'
          ? { label: 'Suspender', icon: <Ban />, onClick: () => void toggleStatus(company) }
          : { label: 'Activar', icon: <CircleCheck />, onClick: () => void toggleStatus(company) },
        { label: 'Dar de baja', icon: <Trash2 />, tone: 'danger' as const, onClick: () => void remove(company) },
      ]
    : [];

  const tabs = detail
    ? [
        { id: 'data', label: 'Datos' },
        { id: 'usage', label: 'Uso' },
        { id: 'admins', label: 'Admins', count: detail.admins.length },
        { id: 'support', label: 'Soporte', count: detail.supportSessions.length },
      ]
    : [];

  return (
    <PageContainer stack>
      <PageHeader
        title={company?.name ?? 'Ficha de la empresa'}
        eyebrow={company?.slug}
        badges={
          company && (
            <>
              <Badge label={labelOf(DISTRIBUTOR_STATUS, company.status)} variant="critical" />
              {company.ownedByPlatform && <OwnedBadge />}
            </>
          )
        }
        actions={headerPrimary}
        secondaryActions={headerSecondary}
      />

      {owned.error && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-danger-soft px-4 py-2.5 text-sm font-medium text-danger"
        >
          {owned.error}
          <button type="button" onClick={owned.clearError} className="text-xs underline">
            Cerrar
          </button>
        </div>
      )}

      {isPending ? (
        <LoadingState fullPage label="Cargando la empresa…" />
      ) : error || !detail ? (
        <ErrorState error={error} resource="La empresa" onRetry={() => void refetch()} />
      ) : (
        <>
          <Card>
            <Tabs items={tabs} value={tab} onChange={setTab} label="Secciones de la empresa" idPrefix={TABS_ID} />
          </Card>
          <div {...tabPanelProps(TABS_ID, tab)}>
            {tab === 'usage' ? (
              <CompanyUsageTab detail={detail} range={range} onRangeChange={setRange} />
            ) : tab === 'admins' ? (
              <CompanyAdminsTab admins={detail.admins} />
            ) : tab === 'support' ? (
              <CompanySupportTab distributorId={detail.company.id} sessions={detail.supportSessions} />
            ) : (
              <CompanyDataTab detail={detail} />
            )}
          </div>
        </>
      )}
    </PageContainer>
  );
};
