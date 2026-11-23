import { CircleDollarSign, TriangleAlert } from 'lucide-react';
import { useRef, useState } from 'react';
import { Button, ReasonModal } from '../../../../common/components/ui';
import { usePermissions } from '../../../../hooks';
import { errorMessage } from '../../../../services/api/errors';
import type { Order } from '../../../../services/api/types';
import { useRegisterCashPayment, useRegisterUnpaidPayment } from '../../../../services/queries/orders';
import { notify } from '../../../../utils/notifications';
import { CashBoxField } from '../CashBoxField';
import { useOrderCashBoxes } from '../useOrderCashBoxes';
import {
  canRegisterCashOutcome,
  paymentReasonCounter,
  paymentReasonError,
  isLegacyTransfer,
  cashRecorded,
  unpaidRecorded,
} from '../orderPayment';

type PaymentModal = 'cash' | 'unpaid';

interface Props {
  order: Order;
}

/**
 * Los cobros manuales del administrador sobre un pedido entregado: efectivo cobrado o impago. Cada uno pide un motivo (10 a 500 caracteres) que queda en el pedido, en el historial y en
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
  // Una transferencia anterior entró al banco: no se elige caja de efectivo.
  const legacy = isLegacyTransfer(order);
  const cashBoxes = useOrderCashBoxes(modal === 'cash' && !legacy);

  const cashOutcome = canRegisterCashOutcome(order);
  // Con el diálogo abierto no se desmonta: si otro admin ya decidió, el pedido se refresca y estas condiciones dan false,
  // pero el error del back (409) tiene que verse en el modal.
  if (!cashOutcome && modal === null) return null;

  const pending = registerCash.isPending || registerUnpaid.isPending;
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
    if (modal === 'cash' && !legacy) {
      if (cashBoxes.loading) return setServerError('Se están cargando las cajas: probá de nuevo en un momento');
      if (cashBoxes.failed) return setServerError('No se pudieron cargar las cajas: cerrá y volvé a abrir el diálogo');
      if (cashBoxes.required && !cashBoxId) return setServerError('Elegí la caja donde entra el efectivo');
    }
    submitting.current = true;
    const id = order.order_id;
    if (modal === 'cash') {
      registerCash.mutate(
        {
          id,
          body: { reason, cashBoxId: legacy ? undefined : cashBoxId || undefined },
          scope: `order:${id}:register-cash`,
        },
        done(
          legacy ? 'Cobro de la transferencia anterior registrado' : 'Cobro en efectivo registrado',
          'El pedido ya estaba cobrado: no se registró tu motivo',
          cashRecorded,
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
    }
  };

  const modalProps = legacy
    ? ({
        cash: {
          title: 'Registrar cobro de transferencia anterior',
          description:
            'Este pedido se pagó por transferencia, una forma de pago que ya no existe. Confirmás que el dinero se acreditó: el pedido pasa a «Cobrado». No entra a ninguna caja de efectivo. El motivo queda registrado.',
          placeholder: 'Ej: La transferencia figura acreditada en el banco el día de la entrega.',
          confirmLabel: 'Registrar cobro',
          danger: false,
        },
        unpaid: {
          title: 'Registrar impago de transferencia anterior',
          description:
            'Informás que la transferencia no se acreditó. El pedido pasa a «Impago» y se abre una incidencia que se cierra con «Resolver impago».',
          placeholder: 'Ej: La transferencia nunca llegó y el cliente no responde.',
          confirmLabel: 'Registrar impago',
          danger: true,
        },
      } as const)
    : ({
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
      } as const);
  const active = modal ? modalProps[modal] : modalProps.cash;

  const blocked = { blockedReason: canOperate ? undefined : operateHint };

  return (
    <>
      {cashOutcome && (
        <>
          <Button size="sm" icon={<CircleDollarSign />} {...blocked} onClick={() => open('cash')}>
            {legacy ? 'Registrar cobro de transferencia anterior' : 'Registrar cobro en efectivo'}
          </Button>
          <Button variant="secondary" size="sm" icon={<TriangleAlert />} {...blocked} onClick={() => open('unpaid')}>
            {legacy ? 'Registrar impago de transferencia anterior' : 'Registrar impago'}
          </Button>
        </>
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
        {modal === 'cash' && !legacy && (
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
