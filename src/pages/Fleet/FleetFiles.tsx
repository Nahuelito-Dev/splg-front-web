import { useMemo, useState } from 'react';
import { FolderOpen } from 'lucide-react';
import {
  Card,
  EmptyState,
  PageHeader,
  Tabs,
  tabPanelProps,
  type TabItem,
  PageContainer,
} from '../../common/components/ui';
import { useDebounce, usePermissions, useUrlParams } from '../../hooks';
import { useCars } from '../../services/queries/cars';
import { useEmployee, useEmployees } from '../../services/queries/employees';
import { employeeFullName } from '../Employees/employeeLabels';
import { FleetFileOwners, type FileOwner } from './components/FleetFileOwners';
import { FleetOwnerFiles, type FilesSubject } from './components/FleetOwnerFiles';

const TABS_ID = 'fleet-files';
const SUBJECT_TABS: TabItem[] = [
  { id: 'vehicle', label: 'Vehículos' },
  { id: 'employee', label: 'Personal' },
];
const EMPLOYEES_PAGE = { page: 0, pageSize: 50 };

const normalize = (value: string) => value.trim().toLowerCase();

/**
 * Archivos de la documentación: se elige un vehículo o un legajo y se ven sus documentos con su vencimiento, cada uno
 * con sus adjuntos (ver y descargar por URL firmada, subir y dar de baja). Usa las mismas rutas que las fichas.
 */
export const FleetFiles = () => {
  const { needsDistributor, canWrite, writeHint } = usePermissions();
  const [{ subject: subjectParam, owner: ownerParam }, setParams] = useUrlParams({ subject: 'vehicle', owner: '' });
  const subject: FilesSubject = subjectParam === 'employee' ? 'employee' : 'vehicle';
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search.trim());
  // Sólo se piden los datos de la pestaña que se mira y con distribuidora elegida (sin ella la API rechaza con 400).
  const cars = useCars({ enabled: subject === 'vehicle' && !needsDistributor });
  const employees = useEmployees(
    EMPLOYEES_PAGE,
    { q: debouncedSearch || undefined },
    subject === 'employee' && !needsDistributor,
  );

  const carOwners = useMemo<FileOwner[]>(
    () =>
      (cars.data ?? []).map((car) => ({
        id: car.car_id,
        name: [car.car_brand, car.car_model].filter(Boolean).join(' ') || 'Vehículo',
        detail: car.car_patent ?? undefined,
      })),
    [cars.data],
  );
  const employeeOwners = useMemo<FileOwner[]>(
    () =>
      (employees.data?.rows ?? []).map((employee) => ({
        id: employee.employeeId,
        name: employeeFullName(employee),
        detail: `Legajo ${employee.fileNumber}`,
      })),
    [employees.data],
  );
  const term = normalize(search);
  const owners =
    subject === 'employee'
      ? employeeOwners
      : carOwners.filter(
          (owner) => !term || [owner.name, owner.detail].some((text) => text && normalize(text).includes(term)),
        );

  // El dueño elegido no depende de lo que la búsqueda o la página dejen en la lista: los vehículos se buscan en la
  // lista completa y el legajo, si no está en la página, se pide por su id.
  const listedOwner = (subject === 'employee' ? employeeOwners : carOwners).find((owner) => owner.id === ownerParam);
  const pickedEmployee = useEmployee(
    subject === 'employee' && ownerParam && !listedOwner && !needsDistributor ? ownerParam : undefined,
  );
  const selected: FileOwner | undefined =
    listedOwner ??
    (pickedEmployee.data
      ? {
          id: pickedEmployee.data.employeeId,
          name: employeeFullName(pickedEmployee.data),
          detail: `Legajo ${pickedEmployee.data.fileNumber}`,
        }
      : undefined);

  const query = subject === 'employee' ? employees : cars;

  const changeSubject = (id: string) => {
    setSearch('');
    setParams({ subject: id, owner: '' });
  };

  return (
    <PageContainer stack>
      <PageHeader
        title="Archivos de documentación"
        description="Seguro, VTV, licencia, DNI y demás archivos de cada vehículo y legajo, con su vencimiento."
      />
      {needsDistributor ? (
        <Card className="p-6">
          <EmptyState
            title="Elegí una distribuidora"
            description="Como administrador general, elegí una con «Ver como» para ver y cargar sus archivos."
          />
        </Card>
      ) : (
        <Card>
          <Tabs
            items={SUBJECT_TABS}
            value={subject}
            onChange={changeSubject}
            label="De quién ver los archivos"
            idPrefix={TABS_ID}
          />
          <div
            {...tabPanelProps(TABS_ID, subject)}
            className="grid lg:grid-cols-[320px_minmax(0,1fr)] lg:divide-x lg:divide-outline"
          >
            <FleetFileOwners
              subject={subject}
              owners={owners}
              selectedId={ownerParam}
              onSelect={(owner) => setParams({ owner: owner.id })}
              search={search}
              onSearch={setSearch}
              loading={query.isPending}
              error={query.error}
              onRetry={() => void query.refetch()}
            />
            <div className="min-w-0 border-t border-outline p-4 lg:border-t-0">
              {selected ? (
                <FleetOwnerFiles
                  key={`${subject}:${selected.id}`}
                  subject={subject}
                  ownerId={selected.id}
                  ownerName={selected.detail ? `${selected.name} · ${selected.detail}` : selected.name}
                  canWrite={canWrite}
                  blockedReason={writeHint}
                />
              ) : (
                <EmptyState
                  icon={FolderOpen}
                  title={subject === 'vehicle' ? 'Elegí un vehículo' : 'Elegí un legajo'}
                  description="Vas a ver sus documentos con el vencimiento de cada uno y podés abrir, descargar o subir sus archivos."
                />
              )}
            </div>
          </div>
        </Card>
      )}
    </PageContainer>
  );
};
