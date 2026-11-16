import { Card, EmptyState, PageHeader, Tabs, tabPanelProps, PageContainer } from '../../common/components/ui';
import { usePermissions, useProfileTab } from '../../hooks';
import { DataAuditTab } from './components/DataAuditTab';
import { OperationsAuditTab } from './components/OperationsAuditTab';

const TABS_ID = 'audit';
const TABS = [
  { id: 'data', label: 'Cambios de datos' },
  { id: 'operations', label: 'Operaciones' },
];

/**
 * Auditoría. «Cambios de datos»: qué campo de qué registro cambió, de qué valor a cuál y quién lo hizo.
 * «Operaciones» (CU-152): cada pedido de escritura a la API, exitoso o rechazado.
 */
export const Audit = () => {
  const { canViewAudit } = usePermissions();
  const [tab, setTab] = useProfileTab(
    TABS.map((t) => t.id),
    'data',
  );

  if (!canViewAudit) {
    return (
      <PageContainer>
        <PageHeader title="Auditoría" />
        <EmptyState title="Sin acceso" description="Sólo un administrador puede ver el registro de auditoría." />
      </PageContainer>
    );
  }

  return (
    <PageContainer stack>
      <PageHeader
        title="Auditoría"
        description="Quién cambió qué, cuándo y desde dónde. Nada se borra: las bajas son lógicas y quedan registradas."
      />
      <Card>
        <Tabs items={TABS} value={tab} onChange={setTab} label="Tipo de auditoría" idPrefix={TABS_ID} />
        <div {...tabPanelProps(TABS_ID, tab)}>{tab === 'data' ? <DataAuditTab /> : <OperationsAuditTab />}</div>
      </Card>
    </PageContainer>
  );
};
