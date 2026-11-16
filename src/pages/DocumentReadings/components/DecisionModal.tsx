import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button, Form, FormInput, FormSelect, FormTextArea, Modal } from '../../../common/components/ui';
import { errorMessage } from '../../../services/api/errors';
import type { DocumentReading } from '../../../services/api/types';
import { useConfirmDocumentReading, useCorrectDocumentReading } from '../../../services/queries/documentReadings';
import { useCashBoxOptions } from '../../../services/queries/finance';
import { useEmployeeDocuments } from '../../../services/queries/personnel';
import { formatDay } from '../../../utils/format';
import { notify } from '../../../utils/notifications';
import { decisionSchema, type DecisionValues } from '../decisionSchema';
import {
  ACTION_TEXT,
  DATE_FIELDS,
  MONEY_FIELDS,
  PAYMENT_ACTIONS,
  correctedFields,
  editableFields,
  fieldLabel,
  initialValue,
  readValues,
  renewableTasks,
  requiredFields,
} from '../documentReadingRules';

export type DecisionMode = 'confirm' | 'correct';

interface Props {
  reading: DocumentReading;
  mode: DecisionMode | null;
  onClose: () => void;
}

const FORM_ID = 'document-reading-decision';

/**
 * Confirmar o corregir una propuesta. Pide lo que el back necesita según la acción: la caja si registra un pago, la
 * tarea del legajo si hay más de una posible y, al corregir, los datos correctos. Un 400 o 409 se muestra con su texto.
 */
export const DecisionModal = ({ reading, mode, onClose }: Props) => {
  const open = mode !== null;
  const proposal = reading.proposal;
  const action = proposal?.action ?? 'review';
  const needsCashBox = PAYMENT_ACTIONS.has(action);
  const isEmployee = action === 'update_employee_document';
  const confirmMutation = useConfirmDocumentReading();
  const correctMutation = useCorrectDocumentReading();
  const pending = confirmMutation.isPending || correctMutation.isPending;
  const cashBoxes = useCashBoxOptions({ enabled: open && needsCashBox });
  const employeeDocs = useEmployeeDocuments(proposal?.ownerId, open && isEmployee);
  const candidates = useMemo(
    () => renewableTasks(reading, employeeDocs.data?.tasks ?? []),
    [reading, employeeDocs.data],
  );
  const chooseTask = isEmployee && candidates.length > 1;
  const editable = useMemo(() => (mode === 'correct' ? editableFields(reading) : []), [mode, reading]);
  const required = useMemo(() => requiredFields(reading), [reading]);
  const schema = useMemo(
    () => decisionSchema({ editable, required, needsCashBox, chooseTask }),
    [editable, required, needsCashBox, chooseTask],
  );
  const methods = useForm<DecisionValues>({ resolver: zodResolver(schema) });
  const { reset } = methods;
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const read = readValues(reading);
    reset({
      fields: Object.fromEntries(editable.map((name) => [name, initialValue(name, read[name])])),
      cashBoxId: '',
      fleetTaskId: '',
      note: '',
    });
    setServerError(null);
  }, [open, reading, editable, reset]);

  const cashBoxOptions = [
    { value: '', label: 'Elegí una caja' },
    ...(cashBoxes.data?.data ?? []).filter((b) => b.isActive).map((b) => ({ value: b.cashBoxId, label: b.name })),
  ];
  const taskOptions = [
    { value: '', label: 'Elegí la tarea' },
    ...candidates.map((t) => ({
      value: t.taskId,
      label: `${t.plan?.name ?? 'Tarea'} · vence ${t.dueAt ? formatDay(t.dueAt.slice(0, 10)) : 'sin fecha'}`,
    })),
  ];

  const done = (text: string) => () => {
    notify.success(text);
    onClose();
  };
  const failed = (error: unknown) => setServerError(errorMessage(error));

  const onSubmit = (values: DecisionValues) => {
    setServerError(null);
    const extras = {
      ...(needsCashBox && values.cashBoxId ? { cashBoxId: values.cashBoxId } : {}),
      ...(chooseTask && values.fleetTaskId ? { fleetTaskId: values.fleetTaskId } : {}),
    };
    if (mode === 'confirm') {
      confirmMutation.mutate(
        { id: reading.readingId, body: extras },
        { onSuccess: done('Propuesta confirmada'), onError: failed },
      );
      return;
    }
    const fields = correctedFields(reading, values.fields);
    if (Object.keys(fields).length === 0) {
      setServerError('No cambiaste ningún dato: usá confirmar.');
      return;
    }
    const note = values.note.trim();
    correctMutation.mutate(
      { id: reading.readingId, body: { fields, ...extras, ...(note ? { note } : {}) } },
      { onSuccess: done('Propuesta corregida y confirmada'), onError: failed },
    );
  };

  const { title, impact } = ACTION_TEXT[action];
  const read = readValues(reading);

  return (
    <Modal
      open={open}
      onClose={onClose}
      closeBlocked={pending}
      size={mode === 'correct' ? 'lg' : 'md'}
      title={mode === 'correct' ? 'Corregir y confirmar' : 'Confirmar la propuesta'}
      description={`${title}. ${impact}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            Cancelar
          </Button>
          <Button type="submit" form={FORM_ID} loading={pending || (isEmployee && employeeDocs.isPending)}>
            {mode === 'correct' ? 'Corregir y confirmar' : 'Confirmar'}
          </Button>
        </>
      }
    >
      <Form methods={methods} id={FORM_ID} onSubmit={onSubmit} className="grid gap-4">
        {serverError && (
          <p role="alert" className="rounded-lg border border-danger bg-danger-soft px-3 py-2 text-sm text-danger">
            {serverError}
          </p>
        )}
        {mode === 'correct' && (
          <>
            <p className="text-sm text-muted">
              Cambiá sólo lo que esté mal. Repetir el valor leído de un importe o una fecha con diferencia es aceptarlo
              (por ejemplo, una cuota pagada con recargo).
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              {editable.map((name) => (
                <FormInput
                  key={name}
                  name={`fields.${name}`}
                  label={fieldLabel(name)}
                  type={DATE_FIELDS.has(name) ? 'date' : 'text'}
                  inputMode={MONEY_FIELDS.has(name) ? 'decimal' : undefined}
                  required={required.includes(name)}
                  hint={read[name] ? `Leído: ${read[name]}` : 'No se leyó'}
                />
              ))}
            </div>
          </>
        )}
        {needsCashBox && (
          <FormSelect
            name="cashBoxId"
            label="Caja del pago"
            required
            options={cashBoxOptions}
            hint="De esta caja sale el egreso del pago."
          />
        )}
        {chooseTask && (
          <FormSelect
            name="fleetTaskId"
            label="Tarea del legajo a renovar"
            required
            options={taskOptions}
            hint="El legajo tiene más de una tarea de este documento abierta."
          />
        )}
        {isEmployee && employeeDocs.isSuccess && candidates.length === 0 && (
          <p className="text-sm text-muted">
            El legajo no tiene una tarea abierta de este documento: si la propuesta trae vencimiento, el sistema no va a
            tener cuál renovar.
          </p>
        )}
        {mode === 'correct' && <FormTextArea name="note" label="Nota (opcional)" rows={2} maxLength={500} />}
      </Form>
    </Modal>
  );
};
