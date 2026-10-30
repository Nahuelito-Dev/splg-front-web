import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button, Checkbox, Form, FormInput, FormTextArea, Modal } from '../../../common/components/ui';
import { errorMessage } from '../../../services/api/errors';
import type { PlanningCase } from '../../../services/api/types';
import { useConfirmPlanningCase, useForceTaskWindow } from '../../../services/queries/planner';
import { argentinaDay } from '../../../utils/format';
import { notify } from '../../../utils/notifications';
import { formatWindow } from './plannerLabels';
import { buildWindowSchema, toConfirmBody, toForceBody, type WindowFormParsed } from './plannerRules';

const FORM_ID = 'planner-window-form';

const tomorrow = (): string => argentinaDay(new Date(Date.now() + 24 * 3_600_000));

type Props =
  | { mode: 'confirm'; planningCase: PlanningCase; onClose: () => void }
  | { mode: 'force'; taskId: string; taskName: string; patent: string | null; onClose: () => void };

/**
 * El administrador decide el taller (CU-105, paso 11): confirma la ventana que acordó el chofer, elige otra, o fija
 * una ventana para una tarea sin esperar al planificador. Confirmar programa la tarea; el gasto se registra al
 * cerrarla.
 */
export const WindowFormModal = (props: Props) => {
  const { onClose } = props;
  const confirmCase = useConfirmPlanningCase();
  const forceWindow = useForceTaskWindow();
  const agreed = props.mode === 'confirm' && props.planningCase.chosenStart !== null;
  // Un caso sin ventana acordada (escalado) o una tarea sin caso necesitan que se elija una.
  const [chooseOther, setChooseOther] = useState(!agreed);
  const [serverError, setServerError] = useState<string | null>(null);
  // Si la API rechaza la ventana por la cobertura de la zona, el administrador puede decidir igual.
  const coverageBlocked = serverError?.includes('cobertura') ?? false;
  const requireWindow = chooseOther;
  const schema = useMemo(() => buildWindowSchema(requireWindow), [requireWindow]);
  const methods = useForm<WindowFormParsed>({
    resolver: zodResolver(schema),
    defaultValues: { day: tomorrow(), startTime: '08:00', endTime: '13:00', provider: '', notes: '' },
  });
  const { reset } = methods;
  useEffect(() => {
    if (!requireWindow) methods.clearErrors(['day', 'startTime', 'endTime']);
  }, [requireWindow, methods]);
  const pending = confirmCase.isPending || forceWindow.isPending;

  const done = (text: string) => ({
    onSuccess: () => {
      notify.success(text);
      reset();
      onClose();
    },
    onError: (error: unknown) => setServerError(errorMessage(error)),
  });

  const submit = (values: WindowFormParsed) => {
    setServerError(null);
    if (props.mode === 'confirm') {
      confirmCase.mutate(
        { id: props.planningCase.caseId, body: toConfirmBody(values, chooseOther) },
        done('Taller confirmado: la tarea quedó programada'),
      );
      return;
    }
    forceWindow.mutate(
      { taskId: props.taskId, body: toForceBody(values) },
      done('Ventana fijada: la tarea quedó programada'),
    );
  };

  const title = props.mode === 'confirm' ? 'Confirmar el taller' : 'Fijar la ventana de taller';
  const subject =
    props.mode === 'confirm'
      ? `${props.planningCase.taskName} · ${props.planningCase.patent ?? 'sin patente'}`
      : `${props.taskName} · ${props.patent ?? 'sin patente'}`;

  return (
    <Modal
      open
      onClose={onClose}
      closeBlocked={pending}
      size="md"
      title={title}
      description={subject}
      footer={
        <>
          <Button variant="secondary" disabled={pending} onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form={FORM_ID} loading={pending}>
            {props.mode === 'confirm' ? 'Confirmar taller' : 'Fijar ventana'}
          </Button>
        </>
      }
    >
      <Form methods={methods} id={FORM_ID} onSubmit={submit} className="grid gap-4 sm:grid-cols-3">
        {props.mode === 'confirm' && agreed && (
          <div className="space-y-3 sm:col-span-3">
            <p className="rounded-lg border border-outline bg-surface-muted p-3 text-sm text-ink">
              Ventana acordada con el chofer:{' '}
              <strong>{formatWindow(props.planningCase.chosenStart, props.planningCase.chosenEnd)}</strong>
            </p>
            <Checkbox
              label="Elegir otra ventana"
              checked={chooseOther}
              onChange={(e) => setChooseOther(e.target.checked)}
            />
          </div>
        )}
        {props.mode === 'confirm' && !agreed && (
          <p className="text-sm text-muted sm:col-span-3">
            No hay una ventana acordada con el chofer: elegí una para programar el taller.
          </p>
        )}
        {requireWindow && (
          <>
            <FormInput name="day" label="Día" type="date" required />
            <FormInput name="startTime" label="Desde" type="time" required />
            <FormInput name="endTime" label="Hasta" type="time" required />
          </>
        )}
        <div className="sm:col-span-3">
          <FormInput name="provider" label="Taller" placeholder="Nombre del taller" maxLength={120} />
        </div>
        <FormInput
          name="cost"
          label="Gasto previsto"
          type="number"
          min={0}
          step="0.01"
          hint="Queda como costo de la tarea; se paga al cerrarla."
        />
        <div className="sm:col-span-3">
          <FormTextArea name="notes" label="Notas" maxLength={500} />
        </div>
      </Form>
      {serverError && (
        <p role="alert" className="mt-4 text-sm text-danger">
          {serverError}
        </p>
      )}
      {coverageBlocked && (
        <div className="mt-3">
          <Checkbox
            label="Confirmar igual, aunque deje la zona bajo el mínimo de unidades"
            hint="Es una decisión del administrador: esos vehículos de la zona quedan sin cobertura ese día."
            checked={methods.watch('ignoreCoverage') === true}
            onChange={(e) => methods.setValue('ignoreCoverage', e.target.checked)}
          />
        </div>
      )}
    </Modal>
  );
};
