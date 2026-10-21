import { useMemo } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useFieldArray, useForm } from 'react-hook-form';
import { CirclePlus, Trash2 } from 'lucide-react';
import { Button, IconButton, Input, Modal, Select, TextArea, CardHeader } from '../../../common/components/ui';
import type { Order } from '../../../services/api/types';
import { useGasCylinders } from '../../../services/queries/gasCylinders';
import { useUpdateOrder } from '../../../services/queries/orders';
import { useTimeSlots } from '../../../services/queries/timeSlots';
import { useUserAddresses } from '../../../services/queries/userAddresses';
import { useResetOnOpen } from '../../../hooks/useResetOnOpen';
import { argentinaDay, formatCurrency } from '../../../utils/format';
import { notify } from '../../../utils/notifications';
import { buildOrderUpdate, orderEditSchema, type OrderEditInitial, type OrderEditValues } from './orderEdit';

const PAYMENT_OPTIONS = [
  { value: '', label: 'Sin cambios' },
  { value: 'cash', label: 'Efectivo' },
  { value: 'transfer', label: 'Transferencia' },
];

const initialOf = (order: Order): OrderEditInitial => ({
  addressId: order.delivery_address?.address_id ?? '',
  scheduledDate: order.scheduledDate ?? '',
  notes: order.customer_notes ?? '',
  items: order.order_items
    .filter((item) => item.gas_cylinder)
    .map((item) => ({ gasCylinderId: item.gas_cylinder?.gas_cylinder_id ?? '', quantity: item.quantity })),
});

const defaultsOf = (order: Order): OrderEditValues => {
  const initial = initialOf(order);
  return { ...initial, timeSlotId: '', paymentMethod: '' };
};

interface Props {
  order: Order | null;
  onClose: () => void;
}

/**
 * Edita un pedido pendiente (sin chofer ni pago online): dirección, franja, fecha, medio de pago, notas y renglones.
 * Sólo viaja lo que cambió; si se tocan los renglones, la API devuelve el stock viejo, reserva el nuevo y recalcula
 * el total con los precios vigentes.
 */
export const EditOrderModal = ({ order, onClose }: Props) => {
  const update = useUpdateOrder();
  const { data: addresses } = useUserAddresses(order?.customer?.user_id);
  const { data: slots } = useTimeSlots();
  const { data: catalog } = useGasCylinders({ page: 0, pageSize: 100 });
  const resolver = useMemo(() => zodResolver(orderEditSchema(order?.scheduledDate ?? '')), [order?.scheduledDate]);
  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<OrderEditValues>({
    resolver,
    defaultValues: order ? defaultsOf(order) : undefined,
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'items' });

  useResetOnOpen(Boolean(order), () => order && reset(defaultsOf(order)));

  const items = watch('items');
  const invalidItems =
    (items ?? []).length === 0 || (items ?? []).some((item) => !item.gasCylinderId || !(Number(item.quantity) >= 1));

  const addressOptions = useMemo(
    () =>
      (addresses ?? []).map((address) => ({
        value: address.address_id,
        label: `${address.street}, ${address.city}`,
      })),
    [addresses],
  );
  const slotOptions = [
    { value: '', label: 'Sin cambios' },
    { value: 'none', label: 'Sin franja' },
    ...(slots ?? []).map((slot) => ({
      value: slot.time_slot_id,
      label: `${slot.name} (${slot.startTime.slice(0, 5)} - ${slot.endTime.slice(0, 5)})`,
    })),
  ];
  // Un producto que el pedido ya tiene va siempre como opción, aunque esté inactivo o fuera de los primeros 100.
  const productOptions = useMemo(() => {
    const options = (catalog?.rows ?? [])
      .filter((c) => c.isActive)
      .map((c) => ({ value: c.gas_cylinder_id, label: `${c.type} — ${formatCurrency(c.price)}` }));
    for (const item of order?.order_items ?? []) {
      const product = item.gas_cylinder;
      if (product && !options.some((o) => o.value === product.gas_cylinder_id)) {
        options.push({ value: product.gas_cylinder_id, label: `${product.type} (no disponible en el catálogo)` });
      }
    }
    return [{ value: '', label: 'Elegí una garrafa' }, ...options];
  }, [catalog, order]);

  const onSubmit = handleSubmit((values) => {
    if (!order) return;
    const body = buildOrderUpdate(initialOf(order), values);
    if (Object.keys(body).length === 0) {
      notify.info('No hay cambios para guardar');
      return;
    }
    update.mutate(
      { id: order.order_id, body },
      {
        onSuccess: () => {
          notify.success('Pedido actualizado');
          onClose();
        },
        onError: notify.error,
      },
    );
  });

  return (
    <Modal
      open={Boolean(order)}
      onClose={onClose}
      size="md"
      title="Editar pedido"
      description="Sólo un pedido pendiente, sin chofer y sin pago de MercadoPago en curso (si no, la API lo rechaza y lo dice). Si cambian los renglones, el stock y el total se recalculan."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="submit"
            form="order-edit"
            loading={update.isPending}
            disabled={invalidItems || !addresses || !catalog}
          >
            Guardar cambios
          </Button>
        </>
      }
    >
      <form id="order-edit" onSubmit={(e) => void onSubmit(e)} className="space-y-4" noValidate>
        {addresses ? (
          <Select label="Dirección de entrega" options={addressOptions} {...register('addressId')} />
        ) : (
          <p className="text-sm text-muted">Cargando direcciones…</p>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <Select label="Franja horaria" options={slotOptions} {...register('timeSlotId')} />
          <Input
            label="Fecha agendada"
            type="date"
            min={argentinaDay(new Date())}
            error={errors.scheduledDate?.message}
            {...register('scheduledDate')}
          />
        </div>
        <Select label="Medio de pago" options={PAYMENT_OPTIONS} {...register('paymentMethod')} />
        <TextArea label="Notas" {...register('notes')} />

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <CardHeader title="Renglones" as="h3" className="" />
            <Button
              type="button"
              size="sm"
              variant="secondary"
              icon={<CirclePlus />}
              onClick={() => append({ gasCylinderId: '', quantity: 1 })}
            >
              Agregar
            </Button>
          </div>
          {fields.map((field, index) => (
            <div key={field.id} className="flex flex-wrap items-end gap-3 rounded-xl border border-outline p-3">
              <div className="min-w-[200px] flex-1">
                {catalog ? (
                  <Select
                    label="Garrafa"
                    options={productOptions}
                    error={errors.items?.[index]?.gasCylinderId?.message}
                    {...register(`items.${index}.gasCylinderId`)}
                  />
                ) : (
                  <p className="text-sm text-muted">Cargando garrafas…</p>
                )}
              </div>
              <div className="w-24">
                <Input
                  label="Cantidad"
                  type="number"
                  min={1}
                  step={1}
                  error={errors.items?.[index]?.quantity?.message}
                  {...register(`items.${index}.quantity`, { valueAsNumber: true })}
                />
              </div>
              <div className="pb-1">
                <IconButton label="Quitar renglón" tone="danger" icon={<Trash2 />} onClick={() => remove(index)} />
              </div>
            </div>
          ))}
          <p className="text-xs text-muted">Los precios son los vigentes del catálogo.</p>
        </div>
      </form>
    </Modal>
  );
};
