import { http } from './httpClient';
import { normalizePatent } from '../../utils/patent';
import type { Car, CarBorrado, CreateCarBody, UpdateCarBody } from './types';

/** GET /car: la flota completa de vehículos (sin paginar: la API no la pagina). */
export const listCars = async (): Promise<Car[]> => {
  const { data } = await http.get<Car[]>('/car');
  return data;
};

/** GET /car/user/:userId: los vehículos de un chofer. */
export const listCarsByUser = async (userId: string): Promise<Car[]> => {
  const { data } = await http.get<Car[]>(`/car/user/${userId}`);
  return data;
};

/** GET /car/:id: la ficha de un vehículo puntual. */
export const getCar = async (id: string): Promise<Car> => {
  const { data } = await http.get<Car>(`/car/${id}`);
  return data;
};

/**
 * GET /car/patent/:patent: el vehículo con esa patente, o `null` si no hay ninguno. Sin
 * coincidencia, el back manda 200 con el cuerpo vacío (`Content-Length: 0`, igual que
 * `/delivery/:id/vehicle`): axios lo parsea como `''`, no como `null`.
 */
export const getCarByPatent = async (patent: string): Promise<Car | null> => {
  const { data } = await http.get<Car | ''>(`/car/patent/${encodeURIComponent(normalizePatent(patent))}`);
  return data || null;
};

/** POST /car */
export const createCar = async (body: CreateCarBody): Promise<Car> => {
  const { data } = await http.post<Car>('/car', body);
  return data;
};

/** PATCH /car/:id */
export const updateCar = async (id: string, body: UpdateCarBody): Promise<Car> => {
  const { data } = await http.patch<Car>(`/car/${id}`, body);
  return data;
};

/** DELETE /car/:id */
export const deleteCar = async (id: string): Promise<CarBorrado> => {
  const { data } = await http.delete<CarBorrado>(`/car/${id}`);
  return data;
};
