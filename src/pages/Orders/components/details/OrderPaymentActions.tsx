import { Ban, CircleDollarSign, Landmark, TriangleAlert } from 'lucide-react';
import { useRef, useState } from 'react';
import { Button, ReasonModal } from '../../../../common/components/ui';
import { usePermissions } from '../../../../hooks';
import { errorMessage } from '../../../../services/api/errors';
import type { Order } from '../../../../services/api/types';
import {
  useConfirmTransfer,
  useRegisterCashPayment,
  useRegisterUnpaidPayment,
} from '../../../../services/queries/orders';
import { notify } from '../../../../utils/notifications';
import { CashBoxField } from '../CashBoxField';
import { useOrderCashBoxes } from '../useOrderCashBoxes';
import {
  canConfirmTransferReceived,
  canMarkTransferNotReceived,
  canRegisterCashOutcome,
  paymentReasonCounter,
  paymentReasonError,
  cashOrTransferRecorded,
  unpaidRecorded,
} from '../orderPayment';

type PaymentModal = 'cash' | 'unpaid' | 'received' | 'not-received';

interface Props {
  order: Order;
}

/**
 * Los cobros manuales del administrador sobre un pedido entregado: efectivo cobrado o impago, y la transferencia
 * recibida o no recibida. Cada uno pide un motivo (10 a 500 caracteres) que queda en el pedido, en el historial y en
 * la auditoría; el efectivo cobrado además entra a la caja que se elige. Lo que el estado del pedido no admite no se ofrece.
 */
export const OrderPaymentActions = ({ order }: Props) => {
  const { canOperate, operateHint } = usePermissions();
  const [modal, setModal] = useState<PaymentModal | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [cashBoxId, setCashBoxId] = useState('');
  // `isPending` llega en el render siguiente: un segundo click inmediato lo pasaría de largo.
  const submitting = useRef(false);
  const registerCash = useRegisterCashPayment();
  const registerUnpaid = useRegisterUnpaidPayment();
  const confirmTransfer = useConfirmTransfer();
  const cashBoxes = useOrderCashBoxes(modal === 'cash');

  const cashOutcome = canRegisterCashOutcome(order);
  const received = canConfirmTransferReceived(order);
  const notReceived = canMarkTransferNotReceived(order);
  // Con el diálogo abierto no se desmonta: si otro admin ya decidió, el pedido se refresca y estas condiciones dan false,
  // pero el error del back (409) tiene que verse en el modal.
  if (!cashOutcome && !received && !notReceived && modal === null) return null;

  const pending = registerCash.isPending || registerUnpaid.isPending || confirmTransfer.isPending;
  const open = (next: PaymentModal) => {
    setServerError(null);
    setCashBoxId('');
    setModal(next);
  };
  const close = () => {
    if (!pending) setModal(null);
  };
  /** El back contesta 200 sin guardar el motivo si el pago ya estaba en ese estado: se avisa en vez de mostrar éxito. */
  const done = <T,>(
    message: string,
    alreadyMessage: string,
    recorded: (result: T, reason: string) => boolean,
    reason: string,
  ) => ({
    onSuccess: (result: T) => {
      if (recorded(result, reason)) notify.success(message);
      else notify.info(alreadyMessage);
      setModal(null);
    },
    onError: (error: Error) => setServerError(errorMessage(error)),
    onSettled: () => {
      submitting.current = false;
    },
  });

  const submit = (reason: string) => {
    if (submitting.current) return;
    if (modal === 'cash') {
      if (cashBoxes.loading) return setServerError('Se están cargando las cajas: probá de nuevo en un momento');
      if (cashBoxes.failed) return setServerError('No se pudieron cargar las cajas: cerrá y volvé a abrir el diálogo');
      if (cashBoxes.required && !cashBoxId) return setServerError('Elegí la caja donde entra el efectivo');
    }
    submitting.current = true;
    const id = order.order_id;
    if (modal === 'cash') {
      registerCash.mutate(
        { id, body: { reason, cashBoxId: cashBoxId || undefined }, scope: `order:${id}:register-cash` },
        done(
          'Cobro en efectivo registrado',
          'El pedido ya estaba cobrado: no se registró tu motivo',
          cashOrTransferRecorded,
          reason,
        ),
      );
    } else if (modal === 'unpaid') {
      registerUnpaid.mutate(
        { id, body: { reason }, scope: `order:${id}:register-unpaid` },
        done(
          'Impago registrado: quedó una incidencia abierta',
          'El pedido ya estaba informado como impago: no se registró tu motivo',
          unpaidRecorded,
          reason,
        ),
      );
    } else if (modal === 'received' || modal === 'not-received') {
      const body = { received: modal === 'received', reason };
      confirmTransfer.mutate(
        { id, body, scope: `order:${id}:confirm-transfer` },
        modal === 'received'
          ? done(
              'Transferencia confirmada',
              'La transferencia ya estaba confirmada: no se registró tu motivo',
              cashOrTransferRecorded,
              reason,
            )
          : done(
              'Transferencia marcada como no recibida',
              'La transferencia ya estaba marcada como no recibida: no se registró tu motivo',
              cashOrTransferRecorded,
              reason,
            ),
      );
    }
  };

  const modalProps = {
    cash: {
      title: 'Registrar cobro en efectivo',
      description:
        'El chofer no confirmó el cobro. El pedido pasa a «Cobrado» y suma a las ventas. El motivo queda registrado.',
      placeholder: 'Ej: El chofer fue dado de baja antes de rendir el efectivo.',
      confirmLabel: 'Registrar cobro',
      danger: false,
    },
    unpaid: {
      title: 'Registrar impago',
      description:
        'Informás que el cliente no pagó el efectivo. El pedido pasa a «Impago» y se abre una incidencia que se cierra con «Resolver impago».',
      placeholder: 'Ej: El cliente no estaba y el chofer ya no trabaja con nosotros.',
      confirmLabel: 'Registrar impago',
      danger: true,
    },
    received: {
      title: 'Confirmar transferencia recibida',
      description:
        'La transferencia llegó. El pago pasa a «Cobrado»; el pedido suma a las ventas cuando esté entregado (o ya, si lo está).',
      placeholder: 'Ej: Figura el crédito en el banco, comprobante 12345.',
      confirmLabel: 'Confirmar transferencia',
      danger: false,
    },
    'not-received': {
      title: 'Marcar transferencia como no recibida',
      description: 'La transferencia no llegó. El pago queda «No recibida» y el pedido no suma a las ventas.',
      placeholder: 'Ej: No figura el crédito después de tres días hábiles.',
      confirmLabel: 'Marcar como no recibida',
      danger: true,
    },
  } as const;
  const active = modal ? modalProps[modal] : modalProps.cash;

  const blocked = { blockedReason: canOperate ? undefined : operateHint };

  return (
    <>
      {cashOutcome && (
        <>
          <Button size="sm" icon={<CircleDollarSign />} {...blocked} onClick={() => open('cash')}>
            Registrar cobro en efectivo
          </Button>
          <Button variant="secondary" size="sm" icon={<TriangleAlert />} {...blocked} onClick={() => open('unpaid')}>
            Registrar impago
          </Button>
        </>
      )}
      {received && (
        <Button size="sm" icon={<Landmark />} {...blocked} onClick={() => open('received')}>
          Confirmar transferencia recibida
        </Button>
      )}
      {notReceived && (
        <Button variant="secondary" size="sm" icon={<Ban />} {...blocked} onClick={() => open('not-received')}>
          Marcar como no recibida
        </Button>
      )}
      <ReasonModal
        open={modal !== null}
        onClose={close}
        title={active.title}
        description={active.description}
        placeholder={active.placeholder}
        confirmLabel={active.confirmLabel}
        danger={active.danger}
        onConfirm={submit}
        loading={pending}
        closeBlocked={pending}
        validateReason={paymentReasonError}
        reasonHint={paymentReasonCounter}
        serverError={serverError}
        onReasonChange={() => setServerError(null)}
      >
        {modal === 'cash' && (
          <CashBoxField
            boxes={cashBoxes.boxes}
            value={cashBoxId}
            onChange={(id) => {
              setCashBoxId(id);
              setServerError(null);
            }}
          />
        )}
      </ReasonModal>
    </>
  );
};
