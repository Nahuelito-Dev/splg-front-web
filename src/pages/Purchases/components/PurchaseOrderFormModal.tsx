import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Trash2 } from 'lucide-react';
import { useEffect } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { Button, IconButton, Input, Modal, Select, TextArea } from '../../../common/components/ui';
import type { PurchaseOrder } from '../../../services/api/types';
import {
  useCreatePurchaseOrder,
  useSupplierOptions,
  useUpdatePurchaseOrder,
} from '../../../services/queries/purchases';
import { formatCurrency } from '../../../utils/format';
import { notify } from '../../../utils/notifications';
import { useCylinderOptions, useWarehouseOptions, withPlaceholder } from '../../Stock/components/useStockOptions';
import { linesTotal } from '../purchaseRules';
import { orderCreateBody, orderSchema, orderUpdateBody, type OrderFormValues } from './orderSchema';

interface Props {
  open: boolean;
  onClose: () => void;
  /** Con orden (en borrador) es edición; sin ella, alta. */
  order: PurchaseOrder | null;
  onSaved?: (order: PurchaseOrder) => void;
}

const EMPTY_ITEM = { gasCylinderId: '', quantity: 1, unitCost: 0, emptiesToExchange: 0 };

/** Alta o edición (en borrador) de una orden de compra. */
export const PurchaseOrderFormModal = ({ open, onClose, order, onSaved }: Props) => {
  const suppliers = useSupplierOptions();
  const warehouses = useWarehouseOptions();
  const cylinders = useCylinderOptions();
  const create = useCreatePurchaseOrder();
  const update = useUpdatePurchaseOrder();
  const scope = 'order:new';
  const {
    register,
    handleSubmit,
    reset,
    watch,
    control,
    formState: { errors },
  } = useForm<OrderFormValues>({ resolver: zodResolver(orderSchema) });
  const { fields, append, remove } = useFieldArray({ control, name: 'items' });

  useEffect(() => {
    if (!open) return;
    reset({
      supplierId: order?.supplierId ?? '',
      destinationWarehouseId: order?.destinationWarehouseId ?? '',
      expectedDate: order?.expectedDate?.slice(0, 10) ?? '',
      notes: order?.notes ?? '',
      items: order?.items.map((i) => ({
        gasCylinderId: i.gasCylinderId,
        quantity: i.quantity,
        unitCost: i.unitCost,
        emptiesToExchange: i.emptiesToExchange,
      })) ?? [{ ...EMPTY_ITEM }],
    });
  }, [open, order, reset]);

  const items = watch('items') ?? [];
  const total = linesTotal(
    items.map((i) => ({ quantity: Number(i.quantity) || 0, unitCost: Number(i.unitCost) || 0 })),
  );

  const onSubmit = handleSubmit((values) => {
    const options = {
      onSuccess: (saved: PurchaseOrder) => {
        notify.success(order ? 'Orden actualizada' : `Orden N° ${saved.number} creada en borrador`);
        onClose();
        onSaved?.(saved);
      },
      onError: notify.error,
    };
    if (order) update.mutate({ id: order.purchaseOrderId, body: orderUpdateBody(values, order) }, options);
    else create.mutate({ body: orderCreateBody(values), scope }, options);
  });

  const loadFailed = suppliers.isError || warehouses.failed || cylinders.failed;

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={order ? `Editar orden N° ${order.number}` : 'Nueva orden de compra'}
      description="Se crea en borrador: hasta que la envíes se puede editar."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="order-form" loading={create.isPending || update.isPending} disabled={loadFailed}>
            {order ? 'Guardar cambios' : 'Crear orden'}
          </Button>
        </>
      }
    >
      {loadFailed ? (
        <p role="alert" className="text-sm text-danger">
          No se pudieron cargar los proveedores, galpones o garrafas.{' '}
          <button
            type="button"
            className="font-semibold underline"
            onClick={() => {
              void suppliers.refetch();
              void warehouses.refetch();
              void cylinders.refetch();
            }}
          >
            Reintentar
          </button>
        </p>
      ) : (
        <form id="order-form" onSubmit={(e) => void onSubmit(e)} className="space-y-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-3">
            <Select
              label="Proveedor"
              required
              options={withPlaceholder(
                (suppliers.data?.data ?? []).map((s) => ({ value: s.supplierId, label: s.businessName })),
              )}
              error={errors.supplierId?.message}
              {...register('supplierId')}
            />
            <Select
              label="Se recibe en"
              options={withPlaceholder(warehouses.options, 'Galpón predeterminado')}
              {...register('destinationWarehouseId')}
            />
            <Input label="Fecha esperada" type="date" {...register('expectedDate')} />
          </div>
          <div className="space-y-3">
            {fields.map((field, index) => (
              <fieldset key={field.id} className="min-w-0 rounded-lg border border-outline p-3">
                <legend className="px-1 text-xs font-medium text-muted">Garrafa {index + 1}</legend>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1.4fr_0.8fr_1fr_1fr_auto] sm:items-start">
                  <Select
                    label="Tipo"
                    options={withPlaceholder(cylinders.options)}
                    error={errors.items?.[index]?.gasCylinderId?.message}
                    {...register(`items.${index}.gasCylinderId`)}
                  />
                  <Input
                    label="Cantidad"
                    type="number"
                    min={1}
                    error={errors.items?.[index]?.quantity?.message}
                    {...register(`items.${index}.quantity`)}
                  />
                  <Input
                    label="Costo unitario"
                    type="number"
                    min={0}
                    step="0.01"
                    error={errors.items?.[index]?.unitCost?.message}
                    {...register(`items.${index}.unitCost`)}
                  />
                  <Input
                    label="Vacías a canjear"
                    type="number"
                    min={0}
                    error={errors.items?.[index]?.emptiesToExchange?.message}
                    {...register(`items.${index}.emptiesToExchange`)}
                  />
                  {fields.length > 1 && (
                    <IconButton
                      label={`Quitar garrafa ${index + 1}`}
                      icon={<Trash2 />}
                      className="sm:mt-7"
                      onClick={() => remove(index)}
                    />
                  )}
                </div>
              </fieldset>
            ))}
            {errors.items?.message && (
              <p role="alert" className="text-xs text-danger">
                {errors.items.message}
              </p>
            )}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Button
                variant="secondary"
                size="sm"
                icon={<Plus />}
                disabled={fields.length >= 20}
                onClick={() => append({ ...EMPTY_ITEM })}
              >
                Agregar otra garrafa
              </Button>
              <p className="text-sm text-muted">
                Total: <b className="font-mono text-ink">{formatCurrency(total)}</b>
              </p>
            </div>
          </div>
          <TextArea label="Notas (opcional)" maxLength={500} error={errors.notes?.message} {...register('notes')} />
        </form>
      )}
    </Modal>
  );
};
