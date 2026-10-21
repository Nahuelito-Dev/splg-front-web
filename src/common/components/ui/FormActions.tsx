import { Button } from './Button';

interface Props {
  onCancel: () => void;
  submitLabel: string;
  /** Enviando: el botón muestra el indicador y Cancelar se apaga. */
  saving?: boolean;
  /** Sin cambios no hay nada que guardar. */
  submitDisabled?: boolean;
}

/** Los botones al pie de un formulario de página, abajo a la derecha. Va dentro del `<Form>`. */
export const FormActions = ({ onCancel, submitLabel, saving = false, submitDisabled = false }: Props) => (
  <div className="flex flex-wrap justify-end gap-2">
    <Button variant="secondary" onClick={onCancel} disabled={saving}>
      Cancelar
    </Button>
    <Button type="submit" loading={saving} disabled={submitDisabled}>
      {submitLabel}
    </Button>
  </div>
);
