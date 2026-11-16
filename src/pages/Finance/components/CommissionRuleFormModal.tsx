import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button, Modal, FormInput, FormCheckbox, FormSelect, Form } from '../../../common/components/ui';
import type { CommissionRule } from '../../../services/api/types';
import { useCreateCommissionRule, useUpdateCommissionRule } from '../../../services/queries/finance';
import { useEmployees } from '../../../services/queries/employees';
import { useGasCylinders } from '../../../services/queries/gasCylinders';
import { argentinaDay } from '../../../utils/format';
import { notify } from '../../../utils/notifications';
import { day } from '../financeSchemas';

const schema = z
  .object({
    employeeId: z.string(),
    gasCylinderId: z.string(),
    basis: z.enum(['per_unit', 'per_order', 'percent_of_total'], { message: 'Elegí la base' }),
    value: z
      .string()
      .trim()
      .refine((v) => /^\d+(?:[.,]\d{1,4})?$/.test(v), 'Un valor de cero o más, con hasta cuatro decimales'),
    validFrom: day('Elegí desde cuándo rige'),
    validTo: z.string(),
    isActive: z.boolean(),
  })
  .refine((v) => v.basis !== 'percent_of_total' || Number(v.value.replace(',', '.')) <= 100, {
    path: ['value'],
    message: 'El porcentaje no puede superar 100',
  })
  .refine((v) => v.validTo === '' || v.validTo >= v.validFrom, {
    path: ['validTo'],
    message: 'No puede ser anterior al inicio',
  });
type Values = z.infer<typeof schema>;

const BASIS_OPTIONS = [
  { value: 'per_unit', label: 'Pesos por garrafa entregada' },
  { value: 'per_order', label: 'Pesos por pedido entregado' },
  { value: 'percent_of_total', label: 'Porcentaje del subtotal' },
];

interface Props {
  open: boolean;
  onClose: () => void;
  rule: CommissionRule | null;
}

/**
 * Crear o modificar una regla de comisión (CU-240, CU-333). Modificar no recalcula lo ya devengado: para cambiar el
 * valor hacia adelante conviene cerrar la regla vigente y crear otra.
 */
export const CommissionRuleFormModal = ({ open, onClose, rule }: Props) => {
  const create = useCreateCommissionRule();
  const update = useUpdateCommissionRule();
  const employees = useEmployees({ page: 0, pageSize: 100 }, { category: 'driver', status: 'active' }, open);
  const cylinders = useGasCylinders({ page: 0, pageSize: 100 });
  const methods = useForm<Values>({ resolver: zodResolver(schema) });
  const { reset } = methods;

  useEffect(() => {
    if (!open) return;
    reset({
      employeeId: rule?.employeeId ?? '',
      gasCylinderId: rule?.gasCylinderId ?? '',
      basis: rule?.basis ?? 'per_unit',
      value: rule ? String(rule.value) : '',
      validFrom: rule?.validFrom ?? argentinaDay(new Date()),
      validTo: rule?.validTo ?? '',
      isActive: rule?.isActive ?? true,
    });
  }, [open, rule, reset]);

  const onSubmit = (values: Values) => {
    const value = Number(values.value.replace(',', '.'));
    const options = {
      onSuccess: () => {
        notify.success(rule ? 'Regla actualizada' : 'Regla creada');
        onClose();
      },
      onError: notify.error,
    };
    if (rule) {
      update.mutate(
        {
          id: rule.ruleId,
          body: {
            basis: values.basis,
            value,
            validFrom: values.validFrom,
            validTo: values.validTo === '' ? null : values.validTo,
            isActive: values.isActive,
          },
        },
        options,
      );
    } else {
      create.mutate(
        {
          employeeId: values.employeeId || undefined,
          gasCylinderId: values.gasCylinderId || undefined,
          basis: values.basis,
          value,
          validFrom: values.validFrom,
          validTo: values.validTo === '' ? undefined : values.validTo,
        },
        options,
      );
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      closeBlocked={create.isPending || update.isPending}
      size="md"
      title={rule ? 'Modificar la regla' : 'Nueva regla de comisión'}
      description="Gana la más específica: chofer y producto, después chofer, después producto y por último la general."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="commission-rule-form" loading={create.isPending || update.isPending}>
            {rule ? 'Guardar cambios' : 'Crear regla'}
          </Button>
        </>
      }
    >
      <Form methods={methods} id="commission-rule-form" onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
        <FormSelect
          name="employeeId"
          label="Chofer"
          disabled={rule !== null}
          options={[
            { value: '', label: 'Todos los choferes' },
            ...(employees.data?.rows ?? []).map((e) => ({
              value: e.employeeId,
              label: `${e.firstName} ${e.lastName}`,
            })),
          ]}
        />
        <FormSelect
          name="gasCylinderId"
          label="Producto"
          disabled={rule !== null}
          options={[
            { value: '', label: 'Todos los productos' },
            ...(cylinders.data?.rows ?? []).map((c) => ({ value: c.gas_cylinder_id, label: c.type })),
          ]}
        />
        <FormSelect name="basis" label="Base" options={BASIS_OPTIONS} />
        <FormInput name="value" label="Valor" required inputMode="decimal" />
        <FormInput name="validFrom" label="Rige desde" type="date" required />
        <FormInput name="validTo" label="Hasta (opcional)" type="date" hint="Vacío: sin fecha de fin" />
        {rule && (
          <div className="sm:col-span-2">
            <FormCheckbox name="isActive" label="La regla está activa" />
          </div>
        )}
      </Form>
    </Modal>
  );
};
