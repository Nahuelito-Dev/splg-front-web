import { Button, Select } from '../../../common/components/ui';
import type { ChatLabel } from '../../../services/api/types';

interface Props {
  labels: ChatLabel[];
  value: string;
  onChange: (labelId: string) => void;
  /** El catálogo no se pudo leer: el filtro de la URL no se aplica y se ofrece quitarlo. */
  failed: boolean;
  /** Al abrir el desplegable se vuelve a pedir el catálogo (aparece una etiqueta recién creada). */
  onOpen: () => void;
}

/** Filtrar la bandeja por una etiqueta (`labelId`); vacío: todas. Sin etiquetas en la empresa no se muestra. */
export const LabelFilter = ({ labels, value, onChange, failed, onOpen }: Props) => {
  if (failed) {
    return value ? (
      <div role="alert" className="flex flex-wrap items-center gap-2 text-[11px] text-danger">
        <span>No se pudieron leer las etiquetas: el filtro por etiqueta no se aplica.</span>
        <Button size="sm" variant="ghost" onClick={() => onChange('')}>
          Quitar el filtro de etiqueta
        </Button>
      </div>
    ) : null;
  }
  if (labels.length === 0) return null;
  return (
    <Select
      label="Etiqueta"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      onFocus={onOpen}
      onMouseDown={onOpen}
      options={[
        { value: '', label: 'Todas las etiquetas' },
        ...labels.map((label) => ({ value: label.id, label: label.name })),
      ]}
    />
  );
};
