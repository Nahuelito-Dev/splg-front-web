import { Select } from '../../../common/components/ui';
import { useAllPlatformCompanies } from '../../../services/queries/platformConsole';

interface Props {
  value: string;
  onChange: (id: string) => void;
  label?: string;
  /** Texto de la opción vacía; sin él no hay opción vacía (hay que elegir una). */
  emptyLabel?: string;
  /** Sin opción vacía, el texto mientras no hay una elegida. */
  placeholder?: string;
}

/**
 * Elegir una empresa vigente de la plataforma, la propia primero. Trae todas, de a páginas, hasta el total de la API:
 * mientras faltan páginas lo dice, nunca corta la lista en silencio.
 */
export const CompanySelect = ({ value, onChange, label = 'Empresa', emptyLabel, placeholder = 'Elegí una' }: Props) => {
  const { companies, total, loading, error } = useAllPlatformCompanies();
  const first = emptyLabel ? [{ value: '', label: emptyLabel }] : value ? [] : [{ value: '', label: placeholder }];
  // Una empresa elegida que todavía no llegó (o que ya no está vigente) se muestra igual: no se pierde la elección.
  const missing = value && !companies.some((company) => company.id === value);
  return (
    <Select
      label={label}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      error={error ? 'No se pudieron cargar las empresas' : undefined}
      hint={loading && total !== undefined ? `Cargando empresas… (${companies.length} de ${total})` : undefined}
      options={[
        ...first,
        ...(missing ? [{ value, label: loading ? 'Cargando…' : 'Empresa no vigente' }] : []),
        ...companies.map((company) => ({
          value: company.id,
          label: company.ownedByPlatform ? `${company.name} (propia)` : company.name,
        })),
      ]}
    />
  );
};
