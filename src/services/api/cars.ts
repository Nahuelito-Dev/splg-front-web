import { privateAxiosInstance } from './axiosConfig';
import { Car } from '../../interfaces';

// GET ALL (Vista Global de Flota)
export const getAllCars = async () => {
  const { data } = await privateAxiosInstance.get<Car[]>('/car');
  return data;
};

// GET BY USER
export const getCarsByUserId = async (userId: string) => {
  const { data } = await privateAxiosInstance.get<Car[]>(`/car/user/${userId}`);
  return data;
};

// CREATE
export const createCar = async (carData: Partial<Car>) => {
  const { data } = await privateAxiosInstance.post('/car', carData);
  return data;
};

// UPDATE
export const updateCar = async (id: string, carData: Partial<Car>) => {
  const { data } = await privateAxiosInstance.patch(`/car/${id}`, carData);
  return data;
};

// DELETE
export const deleteCar = async (id: string) => {
  const { data } = await privateAxiosInstance.delete(`/car/${id}`);
  return data;
};
