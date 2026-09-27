import { Badge, DetailList, Modal } from '../../../common/components/ui';
import type { Distributor } from '../../../services/api/types';
import { formatDateTime } from '../../../utils/format';
import { DISTRIBUTOR_STATUS, labelOf } from '../../../utils/statusLabels';

interface Props {
  distributor: Distributor | null;
  onClose: () => void;
}

/** Todo lo que la API guarda de una empresa (DistributorResponseDto). */
export const DistributorDetailModal = ({ distributor, onClose }: Props) => (
  <Modal
    open={Boolean(distributor)}
    onClose={onClose}
    size="md"
    title={distributor?.name ?? 'Empresa'}
    description={distributor ? `Identificador: ${distributor.slug}` : undefined}
    footer={distributor && <Badge label={labelOf(DISTRIBUTOR_STATUS, distributor.status)} />}
  >
    {distributor && (
      <DetailList
        items={[
          { label: 'Razón social', value: distributor.legal_name ?? '—' },
          { label: 'CUIT', value: distributor.tax_id ?? '—', mono: true },
          { label: 'Email', value: distributor.email ?? '—' },
          { label: 'Teléfono', value: distributor.phone ?? '—', mono: true },
          { label: 'Plan', value: distributor.plan ?? 'Sin plan asignado' },
          { label: 'Logo', value: distributor.logo_url ? 'Cargado' : 'Sin logo' },
          { label: 'Alta', value: formatDateTime(distributor.createdAt) },
          { label: 'Última modificación', value: formatDateTime(distributor.updatedAt) },
          // Siempre "—" en este modal: una empresa dada de baja ya no aparece en el
          // listado (el back la excluye por defecto), así que nunca se ve con valor acá.
          { label: 'Baja', value: distributor.deletedAt ? formatDateTime(distributor.deletedAt) : '—' },
          { label: 'Id', value: distributor.distributor_id, mono: true, wide: true },
        ]}
      />
    )}
  </Modal>
);
