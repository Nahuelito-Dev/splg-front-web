import { Badge, DetailList, RecordDrawer, UserRefLink } from '../../../common/components/ui';
import type { Cylinder } from '../../../services/api/types';
import { useCylinder } from '../../../services/queries/physicalCylinders';
import { formatArgentinaDay, formatCurrency, formatDateTime, formatShortId } from '../../../utils/format';
import { CYLINDER_STATE, labelOf } from '../../../utils/statusLabels';

interface Props {
  open: boolean;
  onClose: () => void;
  /** El envase tal como lo trae el listado; el panel pide el detalle fresco y lo reemplaza al llegar. */
  cylinder: Cylinder | null;
}

/** Vistazo a un envase sin salir del listado; el historial, la vigencia y las acciones viven en su ficha. */
export const CylinderQuickDrawer = ({ open, onClose, cylinder: listed }: Props) => {
  const { data: fresh, error, refetch } = useCylinder(open ? listed?.cylinder_id : undefined);
  const cylinder = fresh ?? listed;
  if (!cylinder) return null;

  return (
    <RecordDrawer
      open={open}
      onClose={onClose}
      title={cylinder.serial}
      description={
        cylinder.gas_cylinder ? `${cylinder.gas_cylinder.type} · ${cylinder.gas_cylinder.weight} kg` : undefined
      }
      badges={<Badge label={labelOf(CYLINDER_STATE, cylinder.state)} />}
      fullPageTo={`/physical-cylinders/${cylinder.cylinder_id}`}
      error={fresh ? undefined : error}
      onRetry={() => void refetch()}
      resource="El envase"
    >
      <DetailList
        items={[
          {
            label: 'En poder de',
            value: cylinder.current_customer ? (
              <UserRefLink userId={cylinder.current_customer.user_id} name={cylinder.current_customer.full_name} />
            ) : (
              'La distribuidora'
            ),
          },
          {
            label: 'Pedido actual',
            value: cylinder.current_order_id ? formatShortId(cylinder.current_order_id) : '—',
            mono: true,
          },
          { label: 'Garantía', value: cylinder.deposit > 0 ? formatCurrency(cylinder.deposit) : '—', mono: true },
          {
            label: 'Último movimiento',
            value: cylinder.lastMovementAt ? formatDateTime(cylinder.lastMovementAt) : '—',
          },
          {
            label: 'Fabricación',
            value: cylinder.manufactured_at ? formatArgentinaDay(cylinder.manufactured_at) : '—',
          },
          {
            label: 'Última revisión',
            value: cylinder.last_inspection_at ? formatArgentinaDay(cylinder.last_inspection_at) : '—',
          },
          {
            label: 'Vence la revisión',
            value: cylinder.expires_at ? formatArgentinaDay(cylinder.expires_at) : 'Sin revisión registrada',
            wide: true,
          },
        ]}
      />
    </RecordDrawer>
  );
};
