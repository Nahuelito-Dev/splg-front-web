import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Trash2 } from 'lucide-react';
import { useEffect } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import {
  Button,
  IconButton,
  Modal,
  FormTextArea,
  FormSelect,
  FormInput,
  Form,
  FormError,
} from '../../../common/components/ui';
import type { PurchaseOrder, PurchaseReceipt } from '../../../services/api/types';
import {
  useCreatePurchaseReceipt,
  usePurchaseOrderPending,
  useSupplierOptions,
} from '../../../services/queries/purchases';
import { formatCurrency } from '../../../utils/format';
import { notify } from '../../../utils/notifications';
import { useCylinderOptions, useWarehouseOptions, withPlaceholder } from '../../Stock/components/useStockOptions';
import { linesTotal, receiptRowsFromPending } from '../purchaseRules';
import { SupplierField } from './SupplierField';
import { receiptSchema, type ReceiptFormValues } from './receiptSchema';

interface Props {
  open: boolean;
  onClose: () => void;
  /** Con orden se recibe contra ella (parcial o total); sin ella es una compra directa. */
  order: PurchaseOrder | null;
  onSaved?: (receipt: PurchaseReceipt) => void;
}

const DOCUMENT_OPTIONS = [
  { value: 'delivery_note', label: 'Remito' },
  { value: 'invoice', label: 'Factura' },
];
const EMPTY_ITEM = { gasCylinderId: '', type: '', quantityFull: 0, quantityEmptyOut: 0, unitCost: 0 };

/** Recepción de mercadería: las llenas entran al galpón, las vacías se las lleva la planta, y se recalcula el costo promedio. */
export const PurchaseReceiptFormModal = ({ open, onClose, order, onSaved }: Props) => {
  const suppliers = useSupplierOptions({ enabled: !order });
  const warehouses = useWarehouseOptions();
  const cylinders = useCylinderOptions();
  const pending = usePurchaseOrderPending(order?.purchaseOrderId, open && order !== null);
  const create = useCreatePurchaseReceipt();
  const scope = `receipt:${order?.purchaseOrderId ?? 'direct'}`;
  const methods = useForm<ReceiptFormValues>({ resolver: zodResolver(receiptSchema) });
  const { reset, watch, control } = methods;
  const { fields, append, remove } = useFieldArray({ control, name: 'items' });
  const mode = order ? 'order' : 'direct';

  useEffect(() => {
    if (!open || (order && !pending.data)) return;
    reset({
      mode,
      supplierId: order?.supplierId ?? '',
      warehouseId: '',
      supplierDocumentType: 'delivery_note',
      supplierDocumentNumber: '',
      receivedAt: '',
      notes: '',
      items:
        order && pending.data
          ? receiptRowsFromPending(pending.data.items, order.items).map((r) => ({
              gasCylinderId: r.gasCylinderId,
              type: r.type,
              pending: r.pending,
              quantityFull: r.quantityFull,
              quantityEmptyOut: r.quantityEmptyOut,
              unitCost: r.unitCost,
            }))
          : [{ ...EMPTY_ITEM }],
    });
  }, [open, order, pending.data, mode, reset]);

  const items = watch('items') ?? [];
  const total = linesTotal(
    items.map((i) => ({ quantity: Number(i.quantityFull) || 0, unitCost: Number(i.unitCost) || 0 })),
  );

  const onSubmit = (values: ReceiptFormValues) => {
    const rows = values.items.filter((i) => i.quantityFull > 0 || i.quantityEmptyOut > 0);
    create.mutate(
      {
        scope,
        body: {
          purchaseOrderId: order?.purchaseOrderId,
          supplierId: order ? undefined : values.supplierId,
          warehouseId: order ? undefined : values.warehouseId || undefined,
          supplierDocumentType: values.supplierDocumentType,
          supplierDocumentNumber: values.supplierDocumentNumber,
          receivedAt: values.receivedAt ? new Date(values.receivedAt).toISOString() : undefined,
          notes: values.notes || null,
          items: rows.map((i) => ({
            gasCylinderId: i.gasCylinderId,
            quantityFull: i.quantityFull,
            quantityEmptyOut: i.quantityEmptyOut,
            unitCost: i.unitCost,
          })),
        },
      },
      {
        onSuccess: (receipt) => {
          notify.success(`Recepción N° ${receipt.number} registrada`);
          onClose();
          onSaved?.(receipt);
        },
        onError: notify.error,
      },
    );
  };

  const loadFailed = (!order && suppliers.isError) || warehouses.failed || cylinders.failed || pending.isError;

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={order ? `Recibir orden N° ${order.number}` : 'Nueva recepción'}
      description={
        order
          ? `Proveedor ${order.supplierName}. Cargá lo que llegó: puede ser una recepción parcial.`
          : 'Compra directa, sin orden de compra.'
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="receipt-form" loading={create.isPending} disabled={loadFailed}>
            Registrar recepción
          </Button>
        </>
      }
    >
      {loadFailed ? (
        <p role="alert" className="text-sm text-danger">
          No se pudieron cargar los datos para la recepción.{' '}
          <button
            type="button"
            className="font-semibold underline"
            onClick={() => {
              void suppliers.refetch();
              void warehouses.refetch();
              void cylinders.refetch();
              void pending.refetch();
            }}
          >
            Reintentar
          </button>
        </p>
      ) : order && pending.isPending ? (
        <p role="status" className="text-sm text-muted">
          Cargando lo pendiente de la orden…
        </p>
      ) : (
        <Form methods={methods} id="receipt-form" onSubmit={onSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {!order && (
              <>
                <SupplierField name="supplierId" />
                <FormSelect
                  name="warehouseId"
                  label="Se recibe en"
                  options={withPlaceholder(warehouses.options, 'Galpón predeterminado')}
                />
              </>
            )}
            <FormSelect name="supplierDocumentType" label="Documento del proveedor" options={DOCUMENT_OPTIONS} />
            <FormInput
              name="supplierDocumentNumber"
              label="Número del documento"
              required
              maxLength={30}
              hint="Único por proveedor y tipo de documento."
            />
            <FormInput
              name="receivedAt"
              label="Cuándo llegó"
              type="datetime-local"
              hint="Si lo dejás vacío, es ahora. No puede ser futuro."
            />
          </div>
          <div className="space-y-3">
            {fields.map((field, index) => (
              <fieldset key={field.id} className="min-w-0 rounded-lg border border-outline p-3">
                <legend className="px-1 text-xs font-medium text-muted">
                  {order ? `${field.type} · faltan ${field.pending}` : `Garrafa ${index + 1}`}
                </legend>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1.4fr_1fr_1fr_1fr_auto] sm:items-start">
                  {order ? (
                    <input type="hidden" {...methods.register(`items.${index}.gasCylinderId`)} />
                  ) : (
                    <FormSelect
                      name={`items.${index}.gasCylinderId`}
                      label="Tipo"
                      options={withPlaceholder(cylinders.options)}
                      hint={cylinders.limited ? 'Se muestran las primeras 100 garrafas.' : undefined}
                    />
                  )}
                  <FormInput name={`items.${index}.quantityFull`} label="Llenas recibidas" type="number" min={0} />
                  <FormInput
                    name={`items.${index}.quantityEmptyOut`}
                    label="Vacías que se lleva la planta"
                    type="number"
                    min={0}
                  />
                  <FormInput
                    name={`items.${index}.unitCost`}
                    label="Costo unitario"
                    type="number"
                    min={0}
                    step="0.01"
                  />
                  {!order && fields.length > 1 && (
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
            <FormError name="items" />
            <FormError name="items.root" />
            <div className="flex flex-wrap items-center justify-between gap-3">
              {!order ? (
                <Button
                  variant="secondary"
                  size="sm"
                  icon={<Plus />}
                  disabled={fields.length >= 20}
                  onClick={() => append({ ...EMPTY_ITEM })}
                >
                  Agregar otra garrafa
                </Button>
              ) : (
                <span />
              )}
              <p className="text-sm text-muted">
                Total de la recepción: <b className="font-mono text-ink">{formatCurrency(total)}</b>
              </p>
            </div>
          </div>
          <FormTextArea name="notes" label="Notas (opcional)" maxLength={500} />
          <p className="text-xs text-muted">
            Al registrarla se abre su ficha, donde podés adjuntar la foto del remito.
          </p>
        </Form>
      )}
    </Modal>
  );
};
