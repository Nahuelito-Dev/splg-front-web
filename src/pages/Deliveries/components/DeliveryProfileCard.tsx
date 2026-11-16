import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle2, PencilLine, PiggyBank, Power, PowerOff, ShieldCheck, ShieldX, Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { usePermissions } from '../../../hooks';
import { Avatar, Badge, Button, PageCover, PhotoThumb, type CoverStat } from '../../../common/components/ui';
import type { Delivery } from '../../../services/api/types';
import {
  useDeleteDelivery,
  useInvalidateDelivery,
  useSetDeliveryEnabled,
  useToggleDeliveryAvailability,
  useValidateDelivery,
} from '../../../services/queries/deliveries';
import { formatCurrency, formatDate } from '../../../utils/format';
import { driverStatus } from '../../../utils/statusLabels';
import { confirm, notify } from '../../../utils/notifications';
import { BalanceAdjustModal } from './BalanceAdjustModal';

interface Props {
  delivery: Delivery;
  onDeleted: () => void;
  /** Las pestañas de la ficha, al pie de la portada. */
  children?: ReactNode;
}

/** La portada de la ficha del chofer: identidad, estado, KPIs y las acciones de CU-032/CU-033. */
export const DeliveryProfileCard = ({ delivery, onDeleted, children }: Props) => {
  const user = delivery.user;
  // Toda escritura sobre un chofer pide la distribuidora (X-Distributor): sin «Ver como» la API contesta 400.
  const { canOperate, operateHint } = usePermissions();
  const blockedReason = canOperate ? undefined : operateHint;
  const setEnabled = useSetDeliveryEnabled();
  const validateDelivery = useValidateDelivery();
  const invalidateDelivery = useInvalidateDelivery();
  const toggleAvailability = useToggleDeliveryAvailability();
  const deleteDelivery = useDeleteDelivery();
  const [adjustingBalance, setAdjustingBalance] = useState(false);
  const navigate = useNavigate();
  const { pathname, search } = useLocation();

  const handleToggleEnabled = async () => {
    const disabling = delivery.isEnabled;
    if (disabling) {
      const confirmed = await confirm({
        title: '¿Deshabilitar al chofer?',
        text: 'Se desconecta, sale del radar de despacho y no puede volver a ponerse en línea hasta que lo habilites.',
        confirmText: 'Deshabilitar',
        danger: true,
      });
      if (!confirmed) return;
    }
    setEnabled.mutate(
      { id: delivery.delivery_id, isEnabled: !disabling },
      {
        onSuccess: () => notify.success(disabling ? 'Chofer deshabilitado' : 'Chofer habilitado'),
        onError: notify.error,
      },
    );
  };

  /** CU-032: operaciones dedicadas, no condicionan lo que el chofer puede hacer. */
  const handleToggleValidated = () => {
    const mutation = delivery.validated ? invalidateDelivery : validateDelivery;
    mutation.mutate(delivery.delivery_id, {
      onSuccess: () => notify.success(delivery.validated ? 'Validación retirada' : 'Chofer validado'),
      onError: notify.error,
    });
  };

  /** Fuerza la disponibilidad: desconectar siempre se permite; conectar exige habilitado y validado. */
  const handleToggleAvailability = async () => {
    const connecting = !delivery.isAvailable;
    if (!connecting) {
      const confirmed = await confirm({
        title: '¿Desconectar al chofer?',
        text: 'Sale del radar de despacho hasta que vuelva a conectarse desde su app o lo reconectes desde acá.',
        confirmText: 'Desconectar',
      });
      if (!confirmed) return;
    }
    toggleAvailability.mutate(
      { userId: delivery.user_id, available: connecting },
      {
        onSuccess: () => notify.success(connecting ? 'Chofer conectado' : 'Chofer desconectado'),
        onError: notify.error,
      },
    );
  };

  const handleDelete = async () => {
    const confirmed = await confirm({
      title: '¿Dar de baja al chofer?',
      text: `${user?.full_name ?? 'El chofer'} no va a poder volver a entrar. Su historial se conserva.`,
      confirmText: 'Dar de baja',
      danger: true,
    });
    if (!confirmed) return;
    deleteDelivery.mutate(delivery.delivery_id, {
      onSuccess: () => {
        notify.success('Chofer dado de baja');
        onDeleted();
      },
      onError: notify.error,
    });
  };

  const stats: CoverStat[] = [
    { label: 'Saldo', value: formatCurrency(delivery.balance) },
    { label: 'Calificación', value: delivery.calification === null ? '—' : `${delivery.calification.toFixed(1)} / 5` },
    { label: 'Chofer desde', value: formatDate(delivery.createdAt) },
  ];

  return (
    <>
      <PageCover
        avatar={
          <PhotoThumb
            kind="user"
            id={delivery.user_id}
            url={user?.photoUrl}
            size="lg"
            fallback={<Avatar name={user?.full_name ?? '?'} size="lg" />}
          />
        }
        title={user?.full_name ?? 'Sin nombre'}
        subtitle={user?.email ?? '—'}
        badges={
          <>
            <Badge label={driverStatus(delivery)} />
            {delivery.validated && <Badge label={{ text: 'Validado', tone: 'success' }} />}
          </>
        }
        actions={
          <>
            <Button
              variant="secondary"
              size="sm"
              icon={<PencilLine />}
              blockedReason={blockedReason}
              onClick={() =>
                navigate(`/deliveries/${delivery.delivery_id}/edit`, { state: { from: `${pathname}${search}` } })
              }
            >
              Editar
            </Button>
            <Button
              variant="secondary"
              size="sm"
              icon={delivery.validated ? <ShieldX /> : <ShieldCheck />}
              loading={validateDelivery.isPending || invalidateDelivery.isPending}
              blockedReason={blockedReason}
              onClick={handleToggleValidated}
            >
              {delivery.validated ? 'Quitar validación' : 'Validar'}
            </Button>
            <Button
              variant={delivery.isEnabled ? 'danger' : 'secondary'}
              size="sm"
              icon={delivery.isEnabled ? undefined : <CheckCircle2 />}
              loading={setEnabled.isPending}
              blockedReason={blockedReason}
              onClick={() => void handleToggleEnabled()}
            >
              {delivery.isEnabled ? 'Deshabilitar' : 'Habilitar'}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              icon={delivery.isAvailable ? <PowerOff /> : <Power />}
              loading={toggleAvailability.isPending}
              blockedReason={blockedReason}
              onClick={() => void handleToggleAvailability()}
            >
              {delivery.isAvailable ? 'Desconectar' : 'Conectar'}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              icon={<PiggyBank />}
              blockedReason={blockedReason}
              onClick={() => setAdjustingBalance(true)}
            >
              Ajustar saldo
            </Button>
            <Button
              variant="danger"
              size="sm"
              icon={<Trash2 />}
              blockedReason={blockedReason}
              onClick={() => void handleDelete()}
            >
              Dar de baja
            </Button>
          </>
        }
        stats={stats}
      >
        {children}
      </PageCover>

      <BalanceAdjustModal open={adjustingBalance} onClose={() => setAdjustingBalance(false)} delivery={delivery} />
    </>
  );
};
