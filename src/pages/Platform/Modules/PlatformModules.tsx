import { useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMediaQuery } from '@mui/material';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  PageContainer,
  PageHeader,
  Skeleton,
  Switch,
} from '../../../common/components/ui';
import { errorMessage } from '../../../services/api/errors';
import type { CompanyListItem, CompanyModule } from '../../../services/api/types';
import { usePlatformCompanies } from '../../../services/queries/platformConsole';
import { usePlatformCompaniesModules } from '../../../services/queries/modules';
import { formatDateTime } from '../../../utils/format';
import { ModuleChangeModal, type ModuleChange } from './ModuleChangeModal';
import { moduleSource, moduleUsage } from './moduleRules';

const PAGE_SIZE = 20;

interface ModulesResult {
  data?: CompanyModule[];
  isPending: boolean;
  error: unknown;
  refetch: () => unknown;
}

/** Las columnas: los módulos en el orden en que los da la API (el catálogo del back), sin lista fija en el panel. */
const columnsOf = (results: ModulesResult[]): Pick<CompanyModule, 'key' | 'label'>[] => {
  const seen = new Map<string, string>();
  for (const result of results) for (const m of result.data ?? []) if (!seen.has(m.key)) seen.set(m.key, m.label);
  return [...seen].map(([key, label]) => ({ key: key as CompanyModule['key'], label }));
};

/** Texto del `title` de una celda: de dónde sale el estado y, si hay excepción, su motivo y vencimiento. */
const cellHint = (module: CompanyModule): string => {
  const parts = [moduleSource(module).text, moduleUsage(module).text];
  if (module.override) {
    parts.push(module.override.reason);
    if (module.override.expiresAt) parts.push(`vence el ${formatDateTime(module.override.expiresAt)}`);
  }
  return parts.join(' · ');
};

interface CellProps {
  company: CompanyListItem;
  module: CompanyModule;
  onChange: (change: ModuleChange) => void;
}

const ModuleSwitch = ({ company, module, onChange }: CellProps) => {
  // El origen, el uso y la excepción (motivo y vencimiento) también para teclado y lector de pantalla, no sólo en `title`.
  const hintId = useId();
  const hint = cellHint(module);
  return (
    <>
      <Switch
        checked={module.enabled}
        label={`${module.label} habilitado para ${company.name}`}
        title={hint}
        describedBy={hintId}
        onChange={(wantEnabled) => onChange({ companyId: company.id, companyName: company.name, module, wantEnabled })}
      />
      <span id={hintId} className="sr-only">
        {hint}
      </span>
    </>
  );
};

/** Marca chica debajo del interruptor cuando el estado no es el del plan. */
const OverrideMark = ({ module }: { module: CompanyModule }) =>
  module.override ? (
    <Badge label={{ text: 'Excepción', tone: module.override.enabled ? 'accent' : 'warn' }} className="text-[11px]" />
  ) : null;

const CompanyLink = ({ company }: { company: CompanyListItem }) => (
  <Link
    to={`/distributors/${company.id}?tab=modules`}
    className="font-medium text-ink hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
  >
    {company.name}
  </Link>
);

const RowError = ({ result }: { result: ModulesResult }) => (
  <span className="flex flex-wrap items-center gap-2 text-sm text-danger">
    {errorMessage(result.error)}
    <Button size="sm" variant="secondary" onClick={() => void result.refetch()}>
      Reintentar
    </Button>
  </span>
);

interface ViewProps {
  companies: CompanyListItem[];
  results: ModulesResult[];
  columns: Pick<CompanyModule, 'key' | 'label'>[];
  onChange: (change: ModuleChange) => void;
}

/** Escritorio: una fila por empresa y una columna por módulo; la empresa queda fija al desplazar de costado. */
const MatrixTable = ({ companies, results, columns, onChange }: ViewProps) => (
  <div className="overflow-x-auto">
    <table className="w-full border-collapse text-sm">
      <caption className="sr-only">Módulos habilitados por empresa</caption>
      <thead>
        <tr className="border-b border-outline text-left text-xs font-medium text-muted">
          <th scope="col" className="sticky left-0 z-[1] min-w-[180px] bg-surface px-4 py-3">
            Empresa
          </th>
          {columns.map((column) => (
            <th key={column.key} scope="col" className="min-w-[112px] px-3 py-3 text-center align-bottom">
              {column.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-outline">
        {companies.map((company, index) => {
          const result = results[index];
          return (
            <tr key={company.id} className="hover:bg-surface-hover">
              <th scope="row" className="sticky left-0 z-[1] bg-surface px-4 py-3 text-left font-normal">
                <CompanyLink company={company} />
                <span className="block text-xs text-muted">{company.slug}</span>
              </th>
              {result.error ? (
                <td colSpan={Math.max(columns.length, 1)} className="px-3 py-3">
                  <RowError result={result} />
                </td>
              ) : (
                columns.map((column) => {
                  const module = result.data?.find((m) => m.key === column.key);
                  return (
                    <td key={column.key} className="px-3 py-3 text-center">
                      {result.isPending ? (
                        <Skeleton className="mx-auto h-6 w-11 rounded-full" />
                      ) : module ? (
                        <span className="inline-flex flex-col items-center gap-1">
                          <ModuleSwitch company={company} module={module} onChange={onChange} />
                          <OverrideMark module={module} />
                        </span>
                      ) : (
                        <>
                          <span aria-hidden="true" className="text-muted">
                            —
                          </span>
                          <span className="sr-only">No aplica</span>
                        </>
                      )}
                    </td>
                  );
                })
              )}
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
);

/** Pantallas angostas: una tarjeta por empresa con sus módulos uno debajo del otro. */
const MatrixCards = ({ companies, results, onChange }: ViewProps) => (
  <ul className="divide-y divide-outline">
    {companies.map((company, index) => {
      const result = results[index];
      return (
        <li key={company.id} className="min-w-0 space-y-3 p-4">
          <div className="min-w-0">
            <CompanyLink company={company} />
            <span className="block text-xs text-muted">{company.slug}</span>
          </div>
          {result.error ? (
            <RowError result={result} />
          ) : result.isPending ? (
            <Skeleton className="h-24 w-full" />
          ) : (
            <ul className="space-y-2.5">
              {(result.data ?? []).map((module) => (
                <li key={module.key} className="flex items-start justify-between gap-3">
                  <span className="min-w-0 space-y-1">
                    <span className="block text-sm text-ink">{module.label}</span>
                    <Badge label={moduleSource(module)} />
                  </span>
                  <ModuleSwitch company={company} module={module} onChange={onChange} />
                </li>
              ))}
            </ul>
          )}
        </li>
      );
    })}
  </ul>
);

/**
 * «Módulos» de la plataforma: la matriz empresa × módulo para el administrador general. Cada interruptor es
 * «habilitado» (lo del plan o una excepción); cambiarlo pide confirmación con motivo y muestra lo que queda en curso.
 * Las columnas salen de lo que devuelve la API, así un módulo nuevo del catálogo aparece solo.
 */
export const PlatformModules = () => {
  const narrow = useMediaQuery('(max-width:639px)');
  const [page, setPage] = useState(0);
  const [change, setChange] = useState<ModuleChange | null>(null);
  const companiesQuery = usePlatformCompanies({ limit: PAGE_SIZE, offset: page * PAGE_SIZE });
  const companies = companiesQuery.data?.items ?? [];
  const results = usePlatformCompaniesModules(companies.map((c) => c.id));
  const columns = columnsOf(results);
  const total = companiesQuery.data?.total ?? 0;
  const lastPage = Math.max(0, Math.ceil(total / PAGE_SIZE) - 1);
  const View = narrow ? MatrixCards : MatrixTable;

  return (
    <PageContainer>
      <PageHeader
        title="Módulos"
        description="Qué módulo tiene habilitado cada empresa: lo que trae su plan o una excepción de la plataforma. Cada cambio pide motivo, se le avisa a la empresa y queda en la auditoría."
      />
      <Card>
        {companiesQuery.error ? (
          <ErrorState
            error={companiesQuery.error}
            resource="Las empresas"
            onRetry={() => void companiesQuery.refetch()}
          />
        ) : companiesQuery.isPending ? (
          <div role="status" aria-label="Cargando las empresas" className="space-y-3 p-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : companies.length === 0 ? (
          <EmptyState
            title="No hay empresas"
            description="Cuando se dé de alta una distribuidora, sus módulos se ven acá."
          />
        ) : (
          <>
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-outline px-4 py-2.5 text-xs text-muted">
              <span>Encendido: habilitado para la empresa.</span>
              <span>«Excepción»: distinto de lo que trae su plan.</span>
            </p>
            <View companies={companies} results={results} columns={columns} onChange={setChange} />
            {total > PAGE_SIZE && (
              <div className="flex items-center justify-between gap-2 border-t border-outline p-3 text-sm text-muted">
                <Button size="sm" variant="secondary" disabled={page === 0} onClick={() => setPage(page - 1)}>
                  Anterior
                </Button>
                <span>
                  Página {page + 1} de {lastPage + 1}
                </span>
                <Button size="sm" variant="secondary" disabled={page >= lastPage} onClick={() => setPage(page + 1)}>
                  Siguiente
                </Button>
              </div>
            )}
          </>
        )}
      </Card>
      <ModuleChangeModal change={change} onClose={() => setChange(null)} />
    </PageContainer>
  );
};
