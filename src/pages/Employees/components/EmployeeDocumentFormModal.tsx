import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { Button, Input, Modal, TextArea } from '../../../common/components/ui';
import type { FleetPlan, FleetTask } from '../../../services/api/types';
import { useCloseFleetTask, useCreateFleetTask } from '../../../services/queries/fleet';
import { notify } from '../../../utils/notifications';
import { detailFieldsOf, documentFormDefaults, documentFormSchema, type DocumentFormValues } from '../documentDetails';

interface Props {
  open: boolean;
  onClose: () => void;
  employeeId: string;
  plan: FleetPlan;
  /** El documento que se renueva: se cierra al cargar el nuevo. Sin él, es el alta. */
  previous: FleetTask | null;
}

/**
 * Carga de un documento del personal (curso de mercancías peligrosas, psicofísico, ART: CU-183 a CU-185) o su
 * renovación. El detalle que se pide sale del tipo del plan. Al renovar se carga primero el nuevo y recién después se
 * cierra el anterior: si algo falla a la mitad, el empleado no queda sin documento.
 */
export const EmployeeDocumentFormModal = ({ open, onClose, employeeId, plan, previous }: Props) => {
  const createTask = useCreateFleetTask();
  const closeTask = useCloseFleetTask();
  const saving = createTask.isPending || closeTask.isPending;
  const fields = detailFieldsOf(plan.documentKind);
  const schema = useMemo(() => documentFormSchema(plan.documentKind), [plan.documentKind]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<DocumentFormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (open) reset(documentFormDefaults(plan.documentKind, previous));
  }, [open, plan.documentKind, previous, reset]);

  const onSubmit = handleSubmit((values) => {
    if (saving) return;
    createTask.mutate(
      {
        planId: plan.planId,
        employeeId,
        dueAt: values.dueAt,
        details: fields.length > 0 ? values.details : undefined,
        notes: values.notes || undefined,
      },
      {
        onSuccess: () => {
          if (!previous) {
            notify.success('Documento registrado');
            onClose();
            return;
          }
          closeTask.mutate(
            { id: previous.taskId, body: { performedAt: new Date().toISOString() } },
            {
              onSuccess: () => {
                notify.success('Documento renovado');
                onClose();
              },
              onError: (error) => {
                notify.error(error);
                onClose();
              },
            },
          );
        },
        onError: notify.error,
      },
    );
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      closeBlocked={saving}
      title={previous ? `Renovar: ${plan.name}` : `Cargar: ${plan.name}`}
      description={
        plan.criticality === 'blocking'
          ? 'Vencido, este documento inhabilita al chofer para el despacho.'
          : 'Vencido, no inhabilita al empleado, pero queda como pendiente en los vencimientos.'
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" form="employee-document-form" loading={saving}>
            {previous ? 'Renovar documento' : 'Registrar documento'}
          </Button>
        </>
      }
    >
      <form
        id="employee-document-form"
        onSubmit={(e) => void onSubmit(e)}
        className="grid gap-4 sm:grid-cols-2"
        noValidate
      >
        {fields.map((field) => (
          <Input
            key={field.key}
            label={field.label}
            required
            type={field.type === 'date' ? 'date' : 'text'}
            maxLength={field.type === 'date' ? undefined : field.max}
            placeholder={field.placeholder}
            error={errors.details?.[field.key]?.message}
            {...register(`details.${field.key}`)}
          />
        ))}
        <Input
          label="Vence el"
          required
          type="date"
          error={errors.dueAt?.message}
          hint={previous ? 'La fecha de vencimiento del documento nuevo.' : undefined}
          {...register('dueAt')}
        />
        <div className="sm:col-span-2">
          <TextArea label="Notas" maxLength={2000} error={errors.notes?.message} {...register('notes')} />
        </div>
      </form>
    </Modal>
  );
};
