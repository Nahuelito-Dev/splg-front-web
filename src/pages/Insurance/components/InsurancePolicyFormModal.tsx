import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Plus } from 'lucide-react';
import { Button, Form, FormInput, FormSelect, FormTextArea, Modal } from '../../../common/components/ui';
import type { InsurancePolicy } from '../../../services/api/types';
import {
  useCreateInsurancePolicy,
  useInsurerOptions,
  useUpdateInsurancePolicy,
} from '../../../services/queries/insurance';
import { argentinaDay, formatCurrency, formatDay } from '../../../utils/format';
import { notify } from '../../../utils/notifications';
import { policyEditSchema, policySchema, type PolicyEditValues, type PolicyFormValues } from '../insuranceSchemas';
import { planOutOfRange, previewInstallments } from '../insuranceState';
import { InsurerFormModal } from './InsurerFormModal';

interface Props {
  open: boolean;
  onClose: () => void;
  carId: string;
  /** Con póliza es edición (aseguradora, número, cobertura y código de pago); sin ella, alta con su plan de cuotas. */
  policy: InsurancePolicy | null;
}

const emptyValues = (): PolicyFormValues => {
  const today = argentinaDay(new Date());
  return {
    insurerId: '',
    policyNumber: '',
    coverage: '',
    validFrom: today,
    validTo: '',
    paymentCode: '',
    count: 6,
    amount: '',
    firstDueDate: today,
    graceDays: 5,
  };
};

/** Alta (con el plan de cuotas y su vista previa) o edición de una póliza. */
export const InsurancePolicyFormModal = ({ open, onClose, carId, policy }: Props) => {
  const create = useCreateInsurancePolicy();
  const update = useUpdateInsurancePolicy();
  const insurers = useInsurerOptions({ enabled: open });
  const [creatingInsurer, setCreatingInsurer] = useState(false);
  const isEditing = policy !== null;
  const createMethods = useForm<PolicyFormValues>({
    resolver: zodResolver(policySchema),
    defaultValues: emptyValues(),
  });
  const editMethods = useForm<PolicyEditValues>({ resolver: zodResolver(policyEditSchema) });

  useEffect(() => {
    if (!open) return;
    if (policy) {
      editMethods.reset({
        insurerId: policy.insurer.insurerId,
        policyNumber: policy.policyNumber,
        coverage: policy.coverage,
        paymentCode: policy.paymentCode ?? '',
      });
    } else {
      createMethods.reset(emptyValues());
    }
  }, [open, policy, createMethods, editMethods]);

  const watched = createMethods.watch(['count', 'amount', 'firstDueDate', 'graceDays']);
  const [validFrom, validTo] = createMethods.watch(['validFrom', 'validTo']);
  const preview = useMemo(() => {
    const [count, amount, firstDueDate, graceDays] = watched;
    const n = Number(count);
    const a = Number(amount);
    const g = Number(graceDays);
    if (!Number.isInteger(n) || n < 1 || n > 60 || !(a > 0) || !/^\d{4}-\d{2}-\d{2}$/.test(String(firstDueDate))) {
      return [];
    }
    return previewInstallments({
      count: n,
      amount: a,
      firstDueDate: String(firstDueDate),
      graceDays: Number.isInteger(g) && g >= 0 ? g : 0,
    });
  }, [watched]);

  const rangeError = planOutOfRange(preview, String(validFrom ?? ''), String(validTo ?? ''));
  const insurerOptions = [
    { value: '', label: 'Elegí una aseguradora' },
    ...(insurers.data?.data ?? []).map((i) => ({ value: i.insurerId, label: i.name })),
  ];
  const saving = create.isPending || update.isPending;

  const onSubmitCreate = (values: PolicyFormValues) => {
    if (rangeError) return;
    const parsed = policySchema.parse(values);
    const body = {
      carId,
      insurerId: parsed.insurerId,
      policyNumber: parsed.policyNumber,
      coverage: parsed.coverage,
      validFrom: parsed.validFrom,
      validTo: parsed.validTo,
      paymentCode: parsed.paymentCode || null,
      installments: {
        count: parsed.count,
        amount: parsed.amount,
        firstDueDate: parsed.firstDueDate,
        graceDays: parsed.graceDays,
      },
    };
    create.mutate(
      { body, scope: `insurance-policy:${carId}` },
      {
        onSuccess: (created) => {
          notify.success('Póliza cargada');
          if (created.fleet.pending) {
            notify.info('El vencimiento pasa a Flota cuando empiece la póliza');
          } else if (!created.fleet.synced) {
            notify.warn(
              created.fleet.reason ?? 'El vencimiento del seguro no se pudo pasar a Flota: cargalo en Documentación.',
            );
          }
          onClose();
        },
        onError: notify.error,
      },
    );
  };

  const onSubmitEdit = (values: PolicyEditValues) => {
    if (!policy) return;
    update.mutate(
      {
        id: policy.policyId,
        body: {
          insurerId: values.insurerId,
          policyNumber: values.policyNumber,
          coverage: values.coverage,
          paymentCode: values.paymentCode || null,
        },
      },
      {
        onSuccess: () => {
          notify.success('Póliza actualizada');
          onClose();
        },
        onError: notify.error,
      },
    );
  };

  const insurerField = (
    <div className="flex items-end gap-2 sm:col-span-2">
      <div className="flex-1">
        <FormSelect name="insurerId" label="Aseguradora" required options={insurerOptions} />
      </div>
      <Button variant="secondary" size="sm" icon={<Plus />} onClick={() => setCreatingInsurer(true)}>
        Nueva aseguradora
      </Button>
    </div>
  );

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        closeBlocked={saving}
        size="lg"
        title={isEditing ? 'Editar póliza' : 'Cargar póliza'}
        description={
          isEditing
            ? `Póliza ${policy.policyNumber}. La vigencia y las cuotas no se cambian acá.`
            : 'Se generan las cuotas mensuales del plan. El vencimiento pasa a la documentación del vehículo.'
        }
        footer={
          <>
            <Button variant="secondary" onClick={onClose} disabled={saving}>
              Cancelar
            </Button>
            <Button
              type="submit"
              form="insurance-policy-form"
              loading={saving}
              disabled={!isEditing && rangeError !== null}
              title={!isEditing ? (rangeError ?? undefined) : undefined}
            >
              {isEditing ? 'Guardar cambios' : 'Guardar'}
            </Button>
          </>
        }
      >
        {isEditing ? (
          <Form
            methods={editMethods}
            id="insurance-policy-form"
            onSubmit={onSubmitEdit}
            className="grid gap-4 sm:grid-cols-2"
          >
            {insurerField}
            <FormInput name="policyNumber" label="Número de póliza" required maxLength={40} />
            <FormInput name="paymentCode" label="Código de pago electrónico" maxLength={60} />
            <div className="sm:col-span-2">
              <FormTextArea name="coverage" label="Cobertura" required maxLength={1000} rows={2} />
            </div>
          </Form>
        ) : (
          <Form
            methods={createMethods}
            id="insurance-policy-form"
            onSubmit={onSubmitCreate}
            className="grid gap-4 sm:grid-cols-2"
          >
            {insurerField}
            <FormInput name="policyNumber" label="Número de póliza" required maxLength={40} />
            <FormInput name="paymentCode" label="Código de pago electrónico" maxLength={60} />
            <div className="sm:col-span-2">
              <FormTextArea name="coverage" label="Cobertura" required maxLength={1000} rows={2} />
            </div>
            <FormInput name="validFrom" label="Vigente desde" type="date" required />
            <FormInput name="validTo" label="Vigente hasta" type="date" required />
            <fieldset className="grid gap-4 rounded-xl border border-outline p-4 sm:col-span-2 sm:grid-cols-2">
              <legend className="px-1 text-sm font-semibold text-ink">Plan de cuotas</legend>
              <FormInput name="count" label="Cantidad de cuotas" type="number" min={1} max={60} required />
              <FormInput name="amount" label="Importe de cada cuota" type="number" step="0.01" min={0} required />
              <FormInput name="firstDueDate" label="Primer vencimiento" type="date" required />
              <FormInput
                name="graceDays"
                label="Días de gracia"
                type="number"
                min={0}
                max={31}
                required
                hint="Pasada la gracia, la cuota figura vencida."
              />
              {preview.length > 0 && (
                <div className="sm:col-span-2" aria-label="Vista previa de las cuotas">
                  <p className="mb-1 text-xs font-medium text-muted">Así quedan las cuotas</p>
                  <ul className="max-h-44 divide-y divide-outline overflow-y-auto rounded-lg border border-outline text-sm">
                    {preview.map((item) => (
                      <li
                        key={item.label}
                        className={`flex flex-wrap justify-between gap-x-3 px-3 py-1.5 ${
                          item.dueDate < String(validFrom ?? '') || item.dueDate > String(validTo || '9999-12-31')
                            ? 'bg-danger-soft text-danger'
                            : ''
                        }`}
                      >
                        <span className="font-medium text-ink">Cuota {item.label}</span>
                        <span className="text-ink-2">
                          vence {formatDay(item.dueDate)} · gracia hasta {formatDay(item.graceUntil)}
                        </span>
                        <span className="font-mono text-ink-2">{formatCurrency(item.amount)}</span>
                      </li>
                    ))}
                  </ul>
                  {rangeError && (
                    <p role="alert" className="mt-1 text-xs font-medium text-danger">
                      {rangeError}: corregí la vigencia o el plan.
                    </p>
                  )}
                </div>
              )}
            </fieldset>
          </Form>
        )}
      </Modal>
      <InsurerFormModal
        open={creatingInsurer}
        onClose={() => setCreatingInsurer(false)}
        insurer={null}
        onSaved={(saved) => {
          if (isEditing) editMethods.setValue('insurerId', saved.insurerId, { shouldValidate: true });
          else createMethods.setValue('insurerId', saved.insurerId, { shouldValidate: true });
        }}
      />
    </>
  );
};
