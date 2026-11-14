import { Card, DetailList } from '../../../common/components/ui';
import type { CompanyDetail } from '../../../services/api/types';
import { formatDateTime } from '../../../utils/format';
import { DISTRIBUTOR_STATUS, labelOf } from '../../../utils/statusLabels';

const yesNo = (value: boolean) => (value ? 'Sí' : 'No');

/**
 * Datos de la empresa como cliente de la plataforma: sólo lo que trae su ficha (sin teléfono, banco ni credenciales).
 * El logo vuelve con la pestaña Tema.
 */
export const CompanyDataTab = ({ detail }: { detail: CompanyDetail }) => {
  const { company } = detail;
  return (
    <Card className="min-w-0 p-6">
      <DetailList
        items={[
          { label: 'Nombre', value: company.name, wide: true },
          { label: 'Identificador', value: company.slug, mono: true },
          { label: 'Estado', value: labelOf(DISTRIBUTOR_STATUS, company.status).text },
          { label: 'Razón social', value: company.legalName ?? '—', wide: true },
          { label: 'CUIT', value: company.taxId ?? '—', mono: true },
          { label: 'Correo de contacto', value: company.contactEmail ?? '—', wide: true },
          { label: 'Plan', value: company.plan ?? 'Sin plan asignado' },
          { label: 'Empresa propia', value: yesNo(company.ownedByPlatform) },
          { label: 'Permite soporte de emergencia', value: yesNo(company.supportEmergencyAllowed) },
          { label: 'Aprueba sola los pedidos de soporte', value: yesNo(company.supportAutoApprove) },
          { label: 'Alta', value: formatDateTime(company.createdAt) },
          {
            label: 'Última actividad',
            value: detail.lastActivityAt ? formatDateTime(detail.lastActivityAt) : 'Sin actividad',
          },
          { label: 'Id', value: company.id, mono: true, wide: true },
        ]}
      />
    </Card>
  );
};
