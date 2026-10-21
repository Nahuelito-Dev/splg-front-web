import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { Button, Modal, FormInput, Form } from '../../../common/components/ui';
import { useResetOnOpen } from '../../../hooks/useResetOnOpen';
import { errorMessage } from '../../../services/api/errors';
import type { TruckLoad } from '../../../services/api/types';
import { useReturnTruckLoad } from '../../../services/queries/truckLoads';
import { notify } from '../../../utils/notifications';
import { declarationRows } from '../truckLoadRules';
import { returnSchema, type ReturnFormValues } from './truckLoadSchema';

interface Props {
  open: boolean;
  onClose: () => void;
  load: TruckLoad;
}

/**
 * Declarar la vuelta: lo que el camión trae de vuelta, por tipo. Con pedidos en curso la API responde 409 y se muestra
 * entero. Se puede volver a declarar hasta rendir.
 */
export const ReturnModal = ({ open, onClose, load }: Props) => {
  const declare = useReturnTruckLoad();
  const [serverError, setServerError] = useState<string | null>(null);
  const methods = useForm<ReturnFormValues>({ resolver: zodResolver(returnSchema) });
  const { reset, control } = methods;
  const { fields } = useFieldArray({ control, name: 'items' });

  useResetOnOpen(open, () => {
    setServerError(null);
    reset({ items: declarationRows(load.items) });
  });

  const onSubmit = (values: ReturnFormValues) => {
    setServerError(null);
    declare.mutate(
      {
        id: load.loadId,
        body: {
          items: values.items.map(({ gasCylinderId, declaredFull, declaredEmpty }) => ({
            gasCylinderId,
            declaredFull: Number(declaredFull),
            declaredEmpty: Number(declaredEmpty),
          })),
        },
      },
      {
        onSuccess: () => {
          notify.success('Vuelta declarada');
          onClose();
        },
        onError: (error) => setServerError(errorMessage(error)),
      },
    );
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title={`Declarar la vuelta · carga N° ${load.number}`}
      description="Contá lo que el camión trae y cargalo: no se da por bueno lo esperado, que va al lado como referencia."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="return-form" loading={declare.isPending}>
            Declarar vuelta
          </Button>
        </>
      }
    >
      <Form methods={methods} id="return-form" onSubmit={onSubmit} className="space-y-3">
        {serverError && (
          <p role="alert" className="rounded-lg border border-danger bg-danger-soft px-3 py-2 text-sm text-danger">
            {serverError}
          </p>
        )}
        {fields.map((field, index) => {
          const item = load.items[index];
          return (
            <fieldset key={field.id} className="min-w-0 rounded-lg border border-outline p-3">
              <legend className="px-1 text-sm font-semibold text-ink">{field.type}</legend>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <FormInput
                  name={`items.${index}.declaredFull`}
                  label="Llenas que vuelven"
                  type="number"
                  min={0}
                  hint={item ? `Esperadas: ${item.expectedFull}` : undefined}
                />
                <FormInput
                  name={`items.${index}.declaredEmpty`}
                  label="Vacías que vuelven"
                  type="number"
                  min={0}
                  hint={item ? `Esperadas: ${item.expectedEmpty}` : undefined}
                />
              </div>
            </fieldset>
          );
        })}
      </Form>
    </Modal>
  );
};
