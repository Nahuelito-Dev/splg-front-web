import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  Card,
  CardHeader,
  Form,
  FormError,
  FormSelect,
  FormTextArea,
  Modal,
  PageContainer,
  PageHeader,
} from '../../common/components/ui';
import { usePermissions } from '../../hooks';
import type { Customer } from '../../services/api/types';
import { useCustomerAccountOf } from '../../services/queries/finance';
import { useUserAddresses } from '../../services/queries/userAddresses';
import { useCreateOrder, useDeliveryOptions, useOrderQuote } from '../../services/queries/orders';
import { errorMessage } from '../../services/api/errors';
import { notify } from '../../utils/notifications';
import { formatCurrency } from '../../utils/format';
import { PAYMENT_METHOD } from '../../utils/statusLabels';
import { CustomerPicker } from './components/CustomerPicker';
import { NewOrderItems } from './components/NewOrderItems';
import { PaymentLink } from './components/PaymentLink';
import { ReservationFields } from './components/ReservationFields';
import { OrderQuoteCard } from './components/OrderQuoteCard';
import { buildQuoteBody, quoteHint } from './components/orderQuote';
import { newOrderSchema, type NewOrderValues } from './components/newOrderSchema';
import { depositCapError as depositCapOf, reservationBody } from './components/reservationBody';

const PAYMENT_OPTIONS = Object.entries(PAYMENT_METHOD).map(([value, label]) => ({ value, label: label.text }));

/**
 * CU-072: alta telefónica. Cuando el cliente llama en vez de pedir desde la
 * app, el administrador carga el pedido a mano con los mismos datos que
 * exige `POST /orders`, incluida la reserva programada con seña (aparece en
 * `/reservations`).
 */
export const NewOrder = () => {
  const navigate = useNavigate();
  const { canWrite, writeHint } = usePermissions();
  const [customer, setCustomer] = useState<Customer | null>(null);
  // Pedido de MercadoPago recién creado: el enlace de pago se muestra antes de salir de la pantalla.
  const [paid, setPaid] = useState<{ url: string; to: string; label: string } | null>(null);
  const { data: addresses, isPending: loadingAddresses } = useUserAddresses(customer?.user_id);
  const createOrder = useCreateOrder();
  const account = useCustomerAccountOf(customer?.user_id, customer?.user?.full_name ?? undefined);

  const methods = useForm<NewOrderValues>({
    resolver: zodResolver(newOrderSchema),
    defaultValues: {
      customerId: '',
      addressId: '',
      items: [],
      paymentMethod: 'cash',
      deliveryMode: 'standard',
      notes: '',
      isReservation: false,
      scheduledDate: '',
      timeSlotId: '',
      depositAmount: '',
    },
  });
  const { setValue, watch } = methods;

  const addressId = watch('addressId');
  const deliveryMode = watch('deliveryMode');
  const isReservation = watch('isReservation') ?? false;
  const scheduledDate = watch('scheduledDate') ?? '';
  const paymentMethod = watch('paymentMethod');
  const { data: options } = useDeliveryOptions(addressId || undefined, customer?.user_id);
  const express = options?.options.find((option) => option.mode === 'express');
  // Una reserva no se combina con el express ni se paga con cuenta corriente: se vuelve a lo programado y a efectivo.
  useEffect(() => {
    if (!isReservation) return;
    if (deliveryMode === 'express') setValue('deliveryMode', 'standard');
    if (paymentMethod === 'account') setValue('paymentMethod', 'cash');
  }, [isReservation, deliveryMode, paymentMethod, setValue]);
  // Si al cambiar de dirección el express deja de estar disponible, se vuelve a la programada.
  useEffect(() => {
    if (deliveryMode === 'express' && express && !express.available) setValue('deliveryMode', 'standard');
  }, [deliveryMode, express, setValue]);
  const formValues = watch();
  // Sin distribuidora elegida el alta no se puede mandar: tampoco se cotiza (la API contestaría 400).
  const quoteBody = canWrite ? buildQuoteBody(formValues) : null;
  const quoteBlocker = canWrite ? quoteHint(formValues) : writeHint;
  // Misma consulta que pinta la tarjeta de cotización (React Query la comparte): acá sirve para validar el tope de la seña.
  const quoteQuery = useOrderQuote(quoteBody);
  const depositCapError = depositCapOf(
    formValues,
    quoteBody && !quoteQuery.stale ? quoteQuery.data : undefined,
    quoteBody && !quoteQuery.stale && quoteQuery.error ? errorMessage(quoteQuery.error) : null,
  );
  // El total de la cotización que se está viendo (sólo si ya refleja lo cargado): es lo que el alta tiene que cobrar.
  const quotedTotal = quoteBody && !quoteQuery.stale && quoteQuery.data ? quoteQuery.data.total : undefined;
  const onAccount = paymentMethod === 'account';
  const accountHint = !onAccount
    ? undefined
    : !customer
      ? 'Elegí primero un cliente.'
      : account.isPending
        ? 'Consultando su cuenta…'
        : !account.data
          ? 'El cliente no tiene cuenta corriente en esta distribuidora: habilitala desde su ficha.'
          : account.data.status !== 'active'
            ? `La cuenta está ${account.data.status === 'blocked' ? 'bloqueada' : 'cerrada'}.`
            : `Crédito disponible: ${formatCurrency(account.data.availableCredit)}`;

  const handleSelectCustomer = (picked: Customer) => {
    setCustomer(picked);
    setValue('customerId', picked.user_id);
    setValue('addressId', '');
  };

  const addressOptions = [
    { value: '', label: loadingAddresses ? 'Cargando direcciones…' : 'Elegí una dirección' },
    ...(addresses?.map((address) => ({
      value: address.address_id,
      label: `${address.street}, ${address.city}${address.isDefault ? ' (predeterminada)' : ''}`,
    })) ?? []),
  ];

  const onSubmit = (values: NewOrderValues) => {
    // Un botón de envío bloqueado igual dispara el submit del formulario (Enter, click): se corta acá.
    if (!canWrite) return;
    if (depositCapError) return;
    createOrder.mutate(
      {
        customerId: values.customerId,
        addressId: values.addressId,
        items: values.items,
        paymentMethod: values.paymentMethod,
        deliveryMode: values.deliveryMode,
        notes: values.notes,
        ...reservationBody(values),
        // Lo que se cobra es lo que se cotizó: si el total cambió, el back responde 409 y no crea nada.
        expectedTotal: quotedTotal,
      },
      {
        onSuccess: (order) => {
          const to = values.isReservation ? '/reservations' : `/orders/${order.order_id}`;
          notify.success(values.isReservation ? 'Reserva creada' : 'Pedido creado');
          if (order.payment_url) {
            setPaid({
              url: order.payment_url,
              to,
              label: values.isReservation ? 'Enlace de pago de la seña (MercadoPago)' : 'Enlace de pago (MercadoPago)',
            });
            return;
          }
          navigate(to);
        },
        onError: (error) => {
          notify.error(error);
          void quoteQuery.refetch();
        },
      },
    );
  };

  return (
    <PageContainer size="sm">
      <PageHeader
        title="Nuevo pedido telefónico"
        description="Alta manual para cuando el cliente llama en vez de pedir desde la app, con o sin reserva programada con seña (CU-072)."
      />

      <Form methods={methods} onSubmit={onSubmit} id="new-order" className="space-y-5">
        <Card className="space-y-3 p-4">
          <CardHeader title="Cliente" as="h3" className="" />
          <CustomerPicker selected={customer} onSelect={handleSelectCustomer} />
          <FormError name="customerId" />
        </Card>

        <Card className="space-y-3 p-4">
          <CardHeader title="Entrega" as="h3" className="" />
          <FormSelect
            name="addressId"
            label="Dirección"
            options={addressOptions}
            disabled={!customer}
            hint={!customer ? 'Elegí primero un cliente.' : undefined}
          />
          {addressId && options && (
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium text-ink">Modalidad de entrega</legend>
              {options.options.map((option) => (
                <label key={option.mode} className="flex items-start gap-2 text-[13px] text-ink">
                  <input
                    type="radio"
                    value={option.mode}
                    disabled={!option.available || (isReservation && option.mode === 'express')}
                    className="mt-1"
                    {...methods.register('deliveryMode')}
                  />
                  <span>
                    <b>{option.mode === 'express' ? 'Express (moto)' : 'Programada'}</b>
                    {option.available
                      ? ` · ${option.surchargeAmount > 0 ? `+${formatCurrency(option.surchargeAmount)}` : 'sin recargo'} · ~${option.estimatedMinutes} min`
                      : ` · no disponible: ${option.message ?? 'sin motivo'}`}
                  </span>
                </label>
              ))}
            </fieldset>
          )}
        </Card>

        <ReservationFields
          isReservation={isReservation}
          scheduledDate={scheduledDate}
          paymentMethod={paymentMethod}
          depositCapError={depositCapError}
        />

        <Card className="p-4">
          <NewOrderItems />
        </Card>

        <Card className="grid gap-4 p-4 sm:grid-cols-2">
          <FormSelect
            name="paymentMethod"
            label="Método de pago"
            options={isReservation ? PAYMENT_OPTIONS.filter((option) => option.value !== 'account') : PAYMENT_OPTIONS}
            hint={accountHint}
          />
          <div className="sm:col-span-2">
            <FormTextArea name="notes" label="Notas" maxLength={500} />
          </div>
        </Card>

        <OrderQuoteCard body={quoteBody} hint={quoteBlocker ?? ''} />

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => navigate('/orders')}>
            Cancelar
          </Button>
          <Button type="submit" loading={createOrder.isPending} blockedReason={canWrite ? undefined : writeHint}>
            {isReservation ? 'Crear reserva' : 'Crear pedido'}
          </Button>
        </div>
      </Form>

      <Modal
        open={paid !== null}
        onClose={() => paid && navigate(paid.to)}
        title="Falta el pago"
        description="Pasale este enlace al cliente: el pedido avanza cuando MercadoPago avise el pago. Después lo podés volver a ver en la ficha."
        footer={<Button onClick={() => paid && navigate(paid.to)}>Continuar</Button>}
      >
        {paid && <PaymentLink url={paid.url} title={paid.label} />}
      </Modal>
    </PageContainer>
  );
};
