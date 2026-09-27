import { http } from './httpClient';
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
