import { keepPreviousData, useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import {
  chargeTrafficFine,
  closeVehicleAccident,
  createFuelLoad,
  createTire,
  createTrafficFine,
  createVehicleAccident,
  getCarCosts,
  getFleetCosts,
  getFuelEfficiency,
  getFuelLoad,
  getTire,
  getTrafficFine,
  getVehicleAccident,
  listCarTires,
  listFuelLoads,
  listTires,
  listTrafficFines,
  listVehicleAccidents,
  payFuelLoad,
  payTire,
  payVehicleAccident,
  receiveAccidentReimbursement,
  payTrafficFine,
  uploadFineReceipt,
  reactivateCar,
  registerTireEvent,
  updateFuelLoad,
  updateTrafficFine,
  updateVehicleAccident,
  voidFuelLoad,
  voidTrafficFine,
  type DayRangeParams,
  type FuelLoadFilters,
  type TireFilters,
  type TrafficFineFilters,
  type VehicleAccidentFilters,
} from '../api/fleetExpense';
import type { PageParams } from '../api/httpClient';
import type {
  ChargeTrafficFineBody,
  CloseVehicleAccidentBody,
  CreateFuelLoadBody,
  CreateTireBody,
  CreateTireEventBody,
  CreateTrafficFineV2Body,
  CreateVehicleAccidentBody,
  PayAccidentBody,
  PayFromCashBoxBody,
  ReceiveReimbursementBody,
  PayTrafficFineV2Body,
  UpdateFuelLoadBody,
  UpdateTrafficFineV2Body,
  UpdateVehicleAccidentBody,
  VoidTrafficFineBody,
} from '../api/types';
import { ACCIDENT_STATUS, TIRE_STATUS, TRAFFIC_FINE_STATUS, statusKeys } from '../../utils/statusLabels';
import { newIdempotencyKey } from '../api/idempotency';
import { refreshFinance, runMoney } from './finance';
import { useStatusCounts } from './statusCounts';
import { queryKeys } from './queryKeys';

interface Options {
  /** Apagada, la consulta no sale: p. ej. el administrador general sin «Ver como» (la API la rechaza con 400). */
  enabled?: boolean;
}

/**
 * Lo que cambia el kilometraje, el estado o el costo de un vehículo: su ficha, las cargas, los costos y el tablero
 * se refrescan juntos. El pago en efectivo de una carga o de una multa (y la anulación de la carga) también mueve una caja.
 */
const refreshCar = (queryClient: QueryClient) =>
  Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.cars.all }),
    queryClient.invalidateQueries({ queryKey: queryKeys.fleetCosts.all }),
    queryClient.invalidateQueries({ queryKey: queryKeys.cashBoxes.all }),
    queryClient.invalidateQueries({ queryKey: queryKeys.cashMovements.all }),
  ]);

export const useFuelLoads = (params: PageParams, filters: FuelLoadFilters, { enabled = true }: Options = {}) =>
  useQuery({
    queryKey: queryKeys.fuelLoads.list({ ...params, ...filters }),
    queryFn: () => listFuelLoads(params, filters),
    placeholderData: keepPreviousData,
    enabled,
  });

export const useFuelLoad = (id: string | undefined) =>
  useQuery({
    queryKey: queryKeys.fuelLoads.detail(id ?? ''),
    queryFn: () => getFuelLoad(id ?? ''),
    enabled: Boolean(id),
  });

/** El consumo de un vehículo entre dos días: los tramos entre cargas de tanque lleno (CU-196). */
export const useFuelEfficiency = (carId: string | undefined, range: DayRangeParams, { enabled = true }: Options = {}) =>
  useQuery({
    queryKey: queryKeys.fuelLoads.detail(`efficiency:${carId}:${range.from}:${range.to}`),
    queryFn: () => getFuelEfficiency(carId ?? '', range),
    enabled: Boolean(carId) && enabled,
  });

export const useCreateFuelLoad = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateFuelLoadBody) => createFuelLoad(body),
    onSuccess: () =>
      Promise.all([queryClient.invalidateQueries({ queryKey: queryKeys.fuelLoads.all }), refreshCar(queryClient)]),
  });
};

export const useUpdateFuelLoad = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateFuelLoadBody }) => updateFuelLoad(id, body),
    onSuccess: () =>
      Promise.all([queryClient.invalidateQueries({ queryKey: queryKeys.fuelLoads.all }), refreshCar(queryClient)]),
  });
};

export const useVoidFuelLoad = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => voidFuelLoad(id),
    onSuccess: () =>
      Promise.all([queryClient.invalidateQueries({ queryKey: queryKeys.fuelLoads.all }), refreshCar(queryClient)]),
  });
};

export const useTrafficFines = (params: PageParams, filters: TrafficFineFilters, { enabled = true }: Options = {}) =>
  useQuery({
    queryKey: queryKeys.trafficFines.list({ ...params, ...filters }),
    queryFn: () => listTrafficFines(params, filters),
    placeholderData: keepPreviousData,
    enabled,
  });

/** Cuántas multas hay en cada estado, con los demás filtros aplicados. */
export const useTrafficFineStatusCounts = (filters: Omit<TrafficFineFilters, 'status'>, enabled = true) =>
  useStatusCounts(
    statusKeys(TRAFFIC_FINE_STATUS),
    (status) => queryKeys.trafficFines.list({ ...filters, counts: status }),
    (status) => listTrafficFines({ page: 0, pageSize: 1 }, { ...filters, status }).then((page) => page.total),
    enabled,
  );

/** Cuántos siniestros hay en cada estado, con los demás filtros aplicados. */
export const useAccidentStatusCounts = (filters: Omit<VehicleAccidentFilters, 'status'>, enabled = true) =>
  useStatusCounts(
    statusKeys(ACCIDENT_STATUS),
    (status) => queryKeys.vehicleAccidents.list({ ...filters, counts: status }),
    (status) => listVehicleAccidents({ page: 0, pageSize: 1 }, { ...filters, status }).then((page) => page.total),
    enabled,
  );

/** Cuántos neumáticos hay en cada estado, con el vehículo aplicado. */
export const useTireStatusCounts = (filters: Omit<TireFilters, 'status'>) =>
  useStatusCounts(
    statusKeys(TIRE_STATUS),
    (status) => queryKeys.tires.list({ ...filters, counts: status }),
    (status) => listTires({ page: 0, pageSize: 1 }, { ...filters, status }).then((page) => page.total),
  );

export const useTrafficFine = (id: string | undefined) =>
  useQuery({
    queryKey: queryKeys.trafficFines.detail(id ?? ''),
    queryFn: () => getTrafficFine(id ?? ''),
    enabled: Boolean(id),
  });

/** Toda transición de una multa refresca la lista, el detalle y el costo (una pagada sin imputar suma). */
const useFineMutation = <V>(fn: (variables: V) => Promise<unknown>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () =>
      Promise.all([queryClient.invalidateQueries({ queryKey: queryKeys.trafficFines.all }), refreshCar(queryClient)]),
  });
};

export const useCreateTrafficFine = () => useFineMutation((body: CreateTrafficFineV2Body) => createTrafficFine(body));

export const useUpdateTrafficFine = () =>
  useFineMutation(({ id, body }: { id: string; body: UpdateTrafficFineV2Body }) => updateTrafficFine(id, body));

/**
 * Sube el comprobante de una multa y devuelve lo que leyó el escaneo. No toca la multa (queda pendiente hasta
 * «Guardar»), por eso no invalida nada.
 */
export const useUploadFineReceipt = () =>
  useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) => uploadFineReceipt(id, file, newIdempotencyKey()),
  });

/** Registrar el pago: la multa queda paga y la caja se mueve, así que se refresca lo de multas, el costo y finanzas. */
export const usePayTrafficFine = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: PayTrafficFineV2Body }) =>
      runMoney(queryClient, `fine-pay:${id}`, body, (key) => payTrafficFine(id, body, key)),
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.trafficFines.all }),
        refreshCar(queryClient),
        refreshFinance(queryClient),
      ]),
  });
};

export const useChargeTrafficFine = () =>
  useFineMutation(({ id, body }: { id: string; body: ChargeTrafficFineBody }) => chargeTrafficFine(id, body));

export const useVoidTrafficFine = () =>
  useFineMutation(({ id, body }: { id: string; body: VoidTrafficFineBody }) => voidTrafficFine(id, body));

export const useVehicleAccidents = (
  params: PageParams,
  filters: VehicleAccidentFilters,
  { enabled = true }: Options = {},
) =>
  useQuery({
    queryKey: queryKeys.vehicleAccidents.list({ ...params, ...filters }),
    queryFn: () => listVehicleAccidents(params, filters),
    placeholderData: keepPreviousData,
    enabled,
  });

export const useVehicleAccident = (id: string | undefined) =>
  useQuery({
    queryKey: queryKeys.vehicleAccidents.detail(id ?? ''),
    queryFn: () => getVehicleAccident(id ?? ''),
    enabled: Boolean(id),
  });

/** Registrar o cerrar un siniestro mueve el estado del vehículo y su costo. */
const useAccidentMutation = <V>(fn: (variables: V) => Promise<unknown>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.vehicleAccidents.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.fleet.all }),
        refreshCar(queryClient),
      ]),
  });
};

export const useCreateVehicleAccident = () =>
  useAccidentMutation((body: CreateVehicleAccidentBody) => createVehicleAccident(body));

export const useUpdateVehicleAccident = () =>
  useAccidentMutation(({ id, body }: { id: string; body: UpdateVehicleAccidentBody }) =>
    updateVehicleAccident(id, body),
  );

export const useCloseVehicleAccident = () =>
  useAccidentMutation(({ id, body }: { id: string; body: CloseVehicleAccidentBody }) => closeVehicleAccident(id, body));

/** CU-247: la documentación y las asignaciones también cambian al volver el vehículo a la flota. */
export const useReactivateCar = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => reactivateCar(id),
    onSuccess: () =>
      Promise.all([refreshCar(queryClient), queryClient.invalidateQueries({ queryKey: queryKeys.fleet.all })]),
  });
};

export const useCarCosts = (carId: string | undefined, range: DayRangeParams, { enabled = true }: Options = {}) =>
  useQuery({
    queryKey: queryKeys.fleetCosts.detail(`car:${carId}:${range.from}:${range.to}`),
    queryFn: () => getCarCosts(carId ?? '', range),
    enabled: Boolean(carId) && enabled,
  });

export const useFleetCosts = (range: DayRangeParams, { enabled = true }: Options = {}) =>
  useQuery({
    queryKey: queryKeys.fleetCosts.list(range),
    queryFn: () => getFleetCosts(range),
    placeholderData: keepPreviousData,
    enabled,
  });

export const useTires = (params: PageParams, filters: TireFilters, { enabled = true }: Options = {}) =>
  useQuery({
    queryKey: queryKeys.tires.list({ ...params, ...filters }),
    queryFn: () => listTires(params, filters),
    placeholderData: keepPreviousData,
    enabled,
  });

export const useCarTires = (carId: string | undefined, params: PageParams, { enabled = true }: Options = {}) =>
  useQuery({
    queryKey: queryKeys.tires.list({ ...params, carTires: carId }),
    queryFn: () => listCarTires(carId ?? '', params),
    placeholderData: keepPreviousData,
    enabled: Boolean(carId) && enabled,
  });

export const useTire = (id: string | undefined) =>
  useQuery({
    queryKey: queryKeys.tires.detail(id ?? ''),
    queryFn: () => getTire(id ?? ''),
    enabled: Boolean(id),
  });

export const useCreateTire = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateTireBody) => createTire(body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.tires.all }),
  });
};

export const useRegisterTireEvent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: CreateTireEventBody }) => registerTireEvent(id, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.tires.all }),
  });
};

/** El pago de un gasto de la flota mueve una caja: se refrescan los gastos, el costo del vehículo y finanzas. */
const refreshAfterExpensePayment = (queryClient: QueryClient) =>
  Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.tires.all }),
    queryClient.invalidateQueries({ queryKey: queryKeys.fuelLoads.all }),
    queryClient.invalidateQueries({ queryKey: queryKeys.vehicleAccidents.all }),
    refreshCar(queryClient),
    refreshFinance(queryClient),
  ]);

/** Pagar la compra de un neumático desde una caja. */
export const usePayTire = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: PayFromCashBoxBody }) =>
      runMoney(queryClient, `tire-pay:${id}`, body, (key) => payTire(id, body, key)),
    onSettled: () => refreshAfterExpensePayment(queryClient),
  });
};

/** Pagar una carga de combustible (tarjeta, cuenta o caja sin asentar) desde una caja. */
export const usePayFuelLoad = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: PayFromCashBoxBody }) =>
      runMoney(queryClient, `fuel-pay:${id}`, body, (key) => payFuelLoad(id, body, key)),
    onSettled: () => refreshAfterExpensePayment(queryClient),
  });
};

/** Registrar lo que pagó la empresa por un siniestro. */
export const usePayVehicleAccident = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: PayAccidentBody }) =>
      runMoney(queryClient, `accident-pay:${id}`, body, (key) => payVehicleAccident(id, body, key)),
    onSettled: () => refreshAfterExpensePayment(queryClient),
  });
};

/** Registrar el reintegro del seguro: entra a la caja elegida. */
export const useReceiveAccidentReimbursement = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: ReceiveReimbursementBody }) =>
      runMoney(queryClient, `accident-reimbursement:${id}`, body, (key) => receiveAccidentReimbursement(id, body, key)),
    onSettled: () => refreshAfterExpensePayment(queryClient),
  });
};
