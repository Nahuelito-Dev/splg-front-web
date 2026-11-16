import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import { Button, Card, PageHeader, TableToolbar, PageContainer } from '../../common/components/ui';
import { useDebounce, usePermissions } from '../../hooks';
import type { Car } from '../../services/api/types';
import { useDeliveryOptions } from '../../services/queries/deliveries';
import { useCarByPatent, useCars, useDeleteCar } from '../../services/queries/cars';
import { confirm, notify } from '../../utils/notifications';
import { normalizePatent } from '../../utils/patent';
import { CarFormModal } from './components/CarFormModal';
import { CarsTable } from './components/CarsTable';

type FormState = { open: false } | { open: true; car: Car | null };

export const Cars = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState<FormState>({ open: false });
  const [patentSearch, setPatentSearch] = useState('');
  const typedPatent = normalizePatent(patentSearch);
  const debouncedPatent = useDebounce(typedPatent);
  const searchingPatent = typedPatent.length > 0;
  // Mientras corre el debounce el resultado que hay es de otra patente: no se muestra.
  const patentSettling = searchingPatent && debouncedPatent !== typedPatent;

  const { data: cars = [], isFetching } = useCars();
  const patentMatch = useCarByPatent(searchingPatent && !patentSettling ? debouncedPatent : undefined);
  const { data: driverPage } = useDeliveryOptions();
  const drivers = driverPage?.rows ?? [];
  const deleteCar = useDeleteCar();
  const { canWrite, writeHint } = usePermissions();

  const patentFound = !patentSettling && !patentMatch.isError && patentMatch.data ? [patentMatch.data] : [];
  const rows = searchingPatent ? patentFound : cars;
  const loading = searchingPatent ? patentSettling || patentMatch.isFetching : isFetching;
  const patentStatus =
    patentSettling || patentMatch.isFetching
      ? 'Buscando…'
      : patentMatch.isError
        ? 'No se pudo buscar la patente. Probá de nuevo.'
        : patentFound.length > 0
          ? 'Vehículo encontrado'
          : 'Sin coincidencias';

  const driverOptions = drivers.map((delivery) => ({
    value: delivery.user_id,
    label: delivery.user?.full_name
      ? `${delivery.user.full_name} (${delivery.user.email ?? 'sin email'})`
      : delivery.user_id,
  }));
  // La API pagina /delivery: si hay más choferes de los que entran acá, el
  // combo no los muestra a todos (no hay buscador en este select).
  const driverOptionsTruncated = (driverPage?.total ?? 0) > drivers.length;

  const handleDelete = async (car: Car) => {
    const confirmed = await confirm({
      title: '¿Dar de baja el vehículo?',
      text: `Baja lógica: ${car.car_brand ?? ''} ${car.car_model ?? ''} (${car.car_patent ?? 'sin patente'}) deja de usarse. No se borra.`,
      confirmText: 'Dar de baja',
      danger: true,
    });
    if (!confirmed) return;
    deleteCar.mutate(car.car_id, {
      onSuccess: () => notify.success('Vehículo dado de baja'),
      onError: notify.error,
    });
  };

  return (
    <PageContainer>
      <PageHeader
        title="Vehículos"
        description="La flota de la distribuidora."
        actions={
          <Button
            icon={<AddCircleOutlineIcon />}
            disabled={!canWrite}
            title={writeHint}
            onClick={() => setForm({ open: true, car: null })}
          >
            Nuevo vehículo
          </Button>
        }
      />

      <Card>
        <TableToolbar
          search={{
            label: 'Buscar por patente',
            placeholder: 'Patente (ej. AB104EJ)',
            value: patentSearch,
            onChange: (value) => setPatentSearch(value),
          }}
          serverExport={{
            resource: 'vehiculos',
            // El exporte trae toda la flota: no conoce la búsqueda por patente.
            blockedReason: searchingPatent ? 'El exporte trae toda la flota: quitá la búsqueda por patente' : undefined,
          }}
          noun={['vehículo', 'vehículos']}
        >
          {searchingPatent && (
            <p
              className={patentMatch.isError && !patentSettling ? 'text-sm text-danger' : 'text-sm text-muted'}
              role={patentMatch.isError && !patentSettling ? 'alert' : undefined}
              aria-live="polite"
            >
              {patentStatus}
              {patentMatch.isError && !patentSettling && (
                <button
                  type="button"
                  className="ml-2 font-semibold underline"
                  onClick={() => void patentMatch.refetch()}
                >
                  Reintentar
                </button>
              )}
            </p>
          )}
        </TableToolbar>
        <CarsTable
          onView={(car) => navigate(`/cars/details/${car.car_id}`)}
          rows={rows}
          loading={loading}
          searching={searchingPatent}
          searchFailed={searchingPatent && patentMatch.isError}
          onEdit={canWrite ? (car) => setForm({ open: true, car }) : undefined}
          onDelete={canWrite ? (car) => void handleDelete(car) : undefined}
        />
      </Card>

      <CarFormModal
        open={form.open}
        onClose={() => setForm({ open: false })}
        car={form.open ? form.car : null}
        driverOptions={driverOptions}
        driverOptionsHint={
          driverOptionsTruncated
            ? `Se muestran ${drivers.length} de ${driverPage?.total ?? 0} choferes. Si no aparece el que buscás, editá el vehículo desde la ficha de ese chofer.`
            : undefined
        }
      />
    </PageContainer>
  );
};
