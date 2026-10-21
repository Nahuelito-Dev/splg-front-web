import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Trash2 } from 'lucide-react';
import { useEffect } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button, IconButton, Modal, FormInput, FormTextArea, FormSelect, Form } from '../../../common/components/ui';
import type { DriverSettlementDetail } from '../../../services/api/types';
import { useCashCategories, useSubmitDriverSettlement } from '../../../services/queries/finance';
import { formatCurrency } from '../../../utils/format';
import { notify } from '../../../utils/notifications';
import { nonNegativeMoney, optionalText, parseMoney, positiveMoney } from '../financeSchemas';

const schema = z.object({
  declaredCash: nonNegativeMoney('Ingresá el efectivo que entrega'),
  expenses: z.array(
    z.object({
      categoryId: z.string().min(1, 'Elegí la categoría'),
      amount: positiveMoney(),
      description: optionalText(255),
    }),
  ),
  notes: optionalText(500),
});
type Values = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
  settlement: DriverSettlementDetail;
}

/** Declarar el efectivo rendido y los gastos pagados con la cobranza (CU-232). */
export const SubmitSettlementModal = ({ open, onClose, settlement }: Props) => {
  const submit = useSubmitDriverSettlement();
  const categories = useCashCategories({ page: 0, pageSize: 100 }, { direction: 'expense' }, { enabled: open });
  const methods = useForm<Values>({ resolver: zodResolver(schema) });
  const { control, reset, watch } = methods;
  const { fields, append, remove } = useFieldArray({ control, name: 'expenses' });
  const declared = watch('declaredCash');
  const expenses = watch('expenses');

  useEffect(() => {
    if (open) reset({ declaredCash: '', expenses: [], notes: '' });
  }, [open, reset]);

  const spent = (expenses ?? []).reduce(
    (sum, e) => sum + (e.amount && !Number.isNaN(parseMoney(e.amount)) ? parseMoney(e.amount) : 0),
    0,
  );
  const parsed = declared && !Number.isNaN(parseMoney(declared)) ? parseMoney(declared) : null;
  const difference = parsed === null ? null : Math.round((parsed + spent - settlement.expectedCash) * 100) / 100;

  const onSubmit = (values: Values) =>
    submit.mutate(
      {
        id: settlement.settlementId,
        body: {
          declaredCash: parseMoney(values.declaredCash),
          expenses: values.expenses.map((e) => ({
            categoryId: e.categoryId,
            amount: parseMoney(e.amount),
            description: e.description || undefined,
          })),
          notes: values.notes || undefined,
        },
      },
      {
        onSuccess: () => {
          notify.success('Rendición presentada');
          onClose();
        },
        onError: notify.error,
      },
    );

  return (
    <Modal
      open={open}
      onClose={onClose}
      closeBlocked={submit.isPending}
      size="md"
      title="Declarar el efectivo rendido"
      description={`Se esperan ${formatCurrency(settlement.expectedCash)}. La diferencia es lo declarado más los gastos, menos lo esperado.`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="submit-settlement-form" loading={submit.isPending}>
            Presentar rendición
          </Button>
        </>
      }
    >
      <Form methods={methods} id="submit-settlement-form" onSubmit={onSubmit} className="grid gap-4">
        <FormInput name="declaredCash" label="Efectivo que entrega" required inputMode="decimal" />
        <fieldset className="grid gap-3">
          <legend className="mb-1 text-sm font-medium text-ink">Gastos pagados con la cobranza</legend>
          {fields.map((field, index) => (
            <div
              key={field.id}
              className="grid gap-2 rounded-lg border border-outline p-3 sm:grid-cols-[1.2fr_1fr_auto]"
            >
              <FormSelect
                name={`expenses.${index}.categoryId`}
                label="Categoría"
                options={[
                  { value: '', label: 'Elegí una categoría' },
                  ...(categories.data?.data ?? []).map((c) => ({ value: c.categoryId, label: c.name })),
                ]}
              />
              <FormInput name={`expenses.${index}.amount`} label="Importe" inputMode="decimal" />
              <div className="flex items-end">
                <IconButton label={`Quitar gasto ${index + 1}`} icon={<Trash2 />} onClick={() => remove(index)} />
              </div>
              <div className="sm:col-span-3">
                <FormInput name={`expenses.${index}.description`} label="Detalle (opcional)" maxLength={255} />
              </div>
            </div>
          ))}
          <div>
            <Button
              variant="secondary"
              size="sm"
              icon={<Plus />}
              onClick={() => append({ categoryId: '', amount: '', description: '' })}
            >
              Agregar gasto
            </Button>
          </div>
        </fieldset>
        {difference !== null && (
          <p
            role="status"
            className={`rounded-lg border px-3 py-2 text-sm ${
              difference === 0 ? 'border-success bg-success-soft text-success' : 'border-warn bg-warn-soft text-warn'
            }`}
          >
            {difference === 0
              ? 'Coincide con lo esperado.'
              : difference < 0
                ? `Faltan ${formatCurrency(-difference)}.`
                : `Sobran ${formatCurrency(difference)}.`}
          </p>
        )}
        <FormTextArea name="notes" label="Notas (opcional)" maxLength={500} />
      </Form>
    </Modal>
  );
};
