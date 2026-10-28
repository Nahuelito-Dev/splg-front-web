import { http, toQuery, type PageParams } from './httpClient';
import type {
  Car,
  CarCostDetail,
  ChargeTrafficFineBody,
  CloseVehicleAccidentBody,
  CreateFuelLoadBody,
  CreateTireBody,
  CreateTireEventBody,
  CreateTrafficFineBody,
  CreateVehicleAccidentBody,
  FleetCostSummary,
  FuelEfficiency,
  FuelLoad,
  FuelLoadPage,
  Message,
  PayFuelLoadFromCashBoxBody,
  PayTrafficFineBody,
  Tire,
  TireMovement,
  TirePage,
  TrafficFine,
  TrafficFinePage,
  UpdateFuelLoadBody,
  UpdateTrafficFineBody,
  UpdateVehicleAccidentBody,
  VehicleAccident,
  VehicleAccidentPage,
  VoidTrafficFineBody,
} from './types';

/** Un rango de días (`YYYY-MM-DD`, ambos inclusivos) tal como lo piden los costos y el consumo. */
export interface DayRangeParams {
  from: string;
  to: string;
}

export interface FuelLoadFilters {
  carId?: string;
  employeeId?: string;
  from?: string;
  to?: string;
  anomaly?: boolean;
}

/** Los parámetros de GET /fleet/fuel-loads sin paginar: los mismos que usa el exporte completo. */
export const fuelLoadQuery = (filters: FuelLoadFilters) => ({ ...filters });

/** GET /fleet/fuel-loads: las cargas vigentes con el total de litros e importe de lo filtrado. */
export const listFuelLoads = async (params: PageParams, filters: FuelLoadFilters = {}): Promise<FuelLoadPage> => {
  const { data } = await http.get<FuelLoadPage>('/fleet/fuel-loads', {
    params: { ...fuelLoadQuery(filters), ...toQuery(params) },
  });
  return data;
};

/** GET /fleet/fuel-loads/:id: también la anulada (`voidedAt`). */
export const getFuelLoad = async (id: string): Promise<FuelLoad> => {
  const { data } = await http.get<FuelLoad>(`/fleet/fuel-loads/${id}`);
  return data;
};

/** POST /fleet/fuel-loads (CU-195) */
export const createFuelLoad = async (body: CreateFuelLoadBody): Promise<FuelLoad> => {
  const { data } = await http.post<FuelLoad>('/fleet/fuel-loads', body);
  return data;
};

/** PATCH /fleet/fuel-loads/:id (CU-320) */
export const updateFuelLoad = async (id: string, body: UpdateFuelLoadBody): Promise<FuelLoad> => {
  const { data } = await http.patch<FuelLoad>(`/fleet/fuel-loads/${id}`, body);
  return data;
};

/** DELETE /fleet/fuel-loads/:id: anula (baja lógica, CU-321). */
export const voidFuelLoad = async (id: string): Promise<Message> => {
  const { data } = await http.delete<Message>(`/fleet/fuel-loads/${id}`);
  return data;
};

/** GET /cars/:carId/fuel-efficiency (CU-196) */
/** PATCH /fleet/fuel-loads/:id/cash-payment: la carga del chofer pagada de la caja sale de la caja indicada. */
export const payFuelLoadFromCashBox = async (id: string, body: PayFuelLoadFromCashBoxBody): Promise<FuelLoad> => {
  const { data } = await http.patch<FuelLoad>(`/fleet/fuel-loads/${id}/cash-payment`, body);
  return data;
};

export const getFuelEfficiency = async (carId: string, range: DayRangeParams): Promise<FuelEfficiency> => {
  const { data } = await http.get<FuelEfficiency>(`/cars/${carId}/fuel-efficiency`, { params: range });
  return data;
};

export interface TrafficFineFilters {
  carId?: string;
  employeeId?: string;
  status?: TrafficFine['status'];
  from?: string;
  to?: string;
}

/** Los parámetros de GET /fleet/fines sin paginar: los mismos que usa el exporte completo. */
export const trafficFineQuery = (filters: TrafficFineFilters) => ({ ...filters });

/** GET /fleet/fines (CU-325) */
export const listTrafficFines = async (
  params: PageParams,
  filters: TrafficFineFilters = {},
): Promise<TrafficFinePage> => {
  const { data } = await http.get<TrafficFinePage>('/fleet/fines', {
    params: { ...trafficFineQuery(filters), ...toQuery(params) },
  });
  return data;
};

/** GET /fleet/fines/:id */
export const getTrafficFine = async (id: string): Promise<TrafficFine> => {
  const { data } = await http.get<TrafficFine>(`/fleet/fines/${id}`);
  return data;
};

/** POST /fleet/fines (CU-198) */
export const createTrafficFine = async (body: CreateTrafficFineBody): Promise<TrafficFine> => {
  const { data } = await http.post<TrafficFine>('/fleet/fines', body);
  return data;
};

/** PATCH /fleet/fines/:id (CU-323): corregir los datos o apelar (`appeal: true`). */
export const updateTrafficFine = async (id: string, body: UpdateTrafficFineBody): Promise<TrafficFine> => {
  const { data } = await http.patch<TrafficFine>(`/fleet/fines/${id}`, body);
  return data;
};

/** PATCH /fleet/fines/:id/pay (CU-199) */
export const payTrafficFine = async (id: string, body: PayTrafficFineBody): Promise<TrafficFine> => {
  const { data } = await http.patch<TrafficFine>(`/fleet/fines/${id}/pay`, body);
  return data;
};

/** PATCH /fleet/fines/:id/charge-to-employee (CU-200) */
export const chargeTrafficFine = async (id: string, body: ChargeTrafficFineBody): Promise<TrafficFine> => {
  const { data } = await http.patch<TrafficFine>(`/fleet/fines/${id}/charge-to-employee`, body);
  return data;
};

/** PATCH /fleet/fines/:id/void (CU-324) */
export const voidTrafficFine = async (id: string, body: VoidTrafficFineBody): Promise<TrafficFine> => {
  const { data } = await http.patch<TrafficFine>(`/fleet/fines/${id}/void`, body);
  return data;
};

export interface VehicleAccidentFilters {
  carId?: string;
  status?: VehicleAccident['status'];
  from?: string;
  to?: string;
}

/** Los parámetros de GET /fleet/accidents sin paginar: los mismos que usa el exporte completo. */
export const vehicleAccidentQuery = (filters: VehicleAccidentFilters) => ({ ...filters });

/** GET /fleet/accidents (CU-328) */
export const listVehicleAccidents = async (
  params: PageParams,
  filters: VehicleAccidentFilters = {},
): Promise<VehicleAccidentPage> => {
  const { data } = await http.get<VehicleAccidentPage>('/fleet/accidents', {
    params: { ...vehicleAccidentQuery(filters), ...toQuery(params) },
  });
  return data;
};

/** GET /fleet/accidents/:id */
export const getVehicleAccident = async (id: string): Promise<VehicleAccident> => {
  const { data } = await http.get<VehicleAccident>(`/fleet/accidents/${id}`);
  return data;
};

/** POST /fleet/accidents (CU-201) */
export const createVehicleAccident = async (body: CreateVehicleAccidentBody): Promise<VehicleAccident> => {
  const { data } = await http.post<VehicleAccident>('/fleet/accidents', body);
  return data;
};

/** PATCH /fleet/accidents/:id (CU-327): corregir los datos y avanzar el ciclo. */
export const updateVehicleAccident = async (id: string, body: UpdateVehicleAccidentBody): Promise<VehicleAccident> => {
  const { data } = await http.patch<VehicleAccident>(`/fleet/accidents/${id}`, body);
  return data;
};

/** PATCH /fleet/accidents/:id/close (CU-202) */
export const closeVehicleAccident = async (id: string, body: CloseVehicleAccidentBody): Promise<VehicleAccident> => {
  const { data } = await http.patch<VehicleAccident>(`/fleet/accidents/${id}/close`, body);
  return data;
};

/** POST /car/:id/reactivate (CU-247): de fuera de servicio a activo. */
export const reactivateCar = async (id: string): Promise<Car> => {
  const { data } = await http.post<Car>(`/car/${id}/reactivate`);
  return data;
};

/** GET /cars/:carId/costs (CU-203) */
export const getCarCosts = async (carId: string, range: DayRangeParams): Promise<CarCostDetail> => {
  const { data } = await http.get<CarCostDetail>(`/cars/${carId}/costs`, { params: range });
  return data;
};

/** Los parámetros de GET /fleet/costs: los mismos que usa el exporte completo. */
export const fleetCostQuery = (range: DayRangeParams) => ({ from: range.from, to: range.to });

/** GET /fleet/costs (CU-204): un renglón por vehículo, de mayor a menor costo por km. */
export const getFleetCosts = async (range: DayRangeParams): Promise<FleetCostSummary[]> => {
  const { data } = await http.get<FleetCostSummary[]>('/fleet/costs', { params: fleetCostQuery(range) });
  return data;
};

export interface TireFilters {
  status?: Tire['status'];
  carId?: string;
}

/** Los parámetros de GET /fleet/tires sin paginar: los mismos que usa el exporte completo. */
export const tireQuery = (filters: TireFilters) => ({ ...filters });

/** GET /fleet/tires */
export const listTires = async (params: PageParams, filters: TireFilters = {}): Promise<TirePage> => {
  const { data } = await http.get<TirePage>('/fleet/tires', {
    params: { ...tireQuery(filters), ...toQuery(params) },
  });
  return data;
};

/** GET /cars/:carId/tires */
export const listCarTires = async (carId: string, params: PageParams): Promise<TirePage> => {
  const { data } = await http.get<TirePage>(`/cars/${carId}/tires`, { params: toQuery(params) });
  return data;
};

/** GET /fleet/tires/:id: con su historial de movimientos (`events`). */
export const getTire = async (id: string): Promise<Tire> => {
  const { data } = await http.get<Tire>(`/fleet/tires/${id}`);
  return data;
};

/** POST /fleet/tires (CU-205) */
export const createTire = async (body: CreateTireBody): Promise<Tire> => {
  const { data } = await http.post<Tire>('/fleet/tires', body);
  return data;
};

/** POST /fleet/tires/:id/events (CU-206) */
export const registerTireEvent = async (id: string, body: CreateTireEventBody): Promise<TireMovement> => {
  const { data } = await http.post<TireMovement>(`/fleet/tires/${id}/events`, body);
  return data;
};
