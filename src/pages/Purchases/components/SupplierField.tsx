import { useRef, useState } from 'react';
import { useWatch } from 'react-hook-form';
import { FormSelect, SearchInput } from '../../../common/components/ui';
import { useDebounce } from '../../../hooks';
import { useSupplierOptions } from '../../../services/queries/purchases';
import { withPlaceholder } from '../../Stock/components/useStockOptions';

interface Props {
  /** Campo del formulario (dentro de un `<Form>`) donde queda el proveedor elegido. */
  name: string;
  enabled?: boolean;
}

/**
 * Combo de proveedores conectado al formulario. La API devuelve hasta 100: si hay más, aparece un buscador que
 * consulta al back por razón social o CUIT, así que ninguno queda fuera de alcance. El proveedor elegido se conserva
 * como opción aunque la búsqueda ya no lo devuelva.
 */
export const SupplierField = ({ name, enabled = true }: Props) => {
  const selectedId = (useWatch({ name }) as string | undefined) ?? '';
  const [term, setTerm] = useState('');
  const debounced = useDebounce(term.trim(), 300);
  const suppliers = useSupplierOptions({ enabled, term: debounced || undefined });
  const known = useRef(new Map<string, string>());
  const rows = suppliers.data?.data ?? [];
  rows.forEach((s) => known.current.set(s.supplierId, s.businessName));
  const options = rows.map((s) => ({ value: s.supplierId, label: s.businessName }));
  const selectedName = known.current.get(selectedId);
  if (selectedId && selectedName && !rows.some((s) => s.supplierId === selectedId)) {
    options.unshift({ value: selectedId, label: selectedName });
  }
  const limited = (suppliers.data?.total ?? 0) > rows.length;
  const searchable = limited || term !== '';

  return (
    <div className="space-y-2">
      {searchable && (
        <SearchInput
          label="Buscar proveedor"
          placeholder="Razón social o CUIT"
          className="sm:w-full"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
        />
      )}
      <FormSelect
        name={name}
        label="Proveedor"
        required
        options={withPlaceholder(options)}
        hint={limited ? 'Hay más proveedores que los que se listan: escribí arriba para buscar.' : undefined}
      />
    </div>
  );
};
