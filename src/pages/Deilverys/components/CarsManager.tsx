import { useState, useEffect, useCallback } from 'react';
import { Car } from '../../../interfaces';
import {
  createCar,
  deleteCar,
  updateCar,
  getCarsByUserId,
} from '../../../services/api/cars';
import { CarModal } from './CarModal'; // <--- Importamos el nuevo Modal
import Swal from 'sweetalert2';

// Iconos
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import TwoWheelerIcon from '@mui/icons-material/TwoWheeler';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit'; // Icono Editar
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import TimeToLeaveIcon from '@mui/icons-material/TimeToLeave';

interface Props {
  userId: string;
}

const getCarIcon = (type?: string) => {
  const t = type?.toLowerCase() || '';
  if (t.includes('moto')) return <TwoWheelerIcon />;
  if (t.includes('camioneta') || t.includes('camion'))
    return <LocalShippingIcon />;
  return <DirectionsCarIcon />;
};

export const CarsManager = ({ userId }: Props) => {
  const [cars, setCars] = useState<Car[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados para el Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCar, setSelectedCar] = useState<Car | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const fetchCars = useCallback(async () => {
    try {
      const data = await getCarsByUserId(userId);
      setCars(data);
    } catch (error) {
      console.error('Error cargando autos:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) fetchCars();
  }, [userId, fetchCars]);

  // Abrir Modal Crear
  const handleOpenCreate = () => {
    setSelectedCar(null);
    setIsModalOpen(true);
  };

  // Abrir Modal Editar
  const handleOpenEdit = (car: Car) => {
    setSelectedCar(car);
    setIsModalOpen(true);
  };

  // Guardar (Create o Update)
  const handleSaveCar = async (data: any) => {
    setIsSaving(true);
    try {
      if (selectedCar) {
        // UPDATE
        await updateCar(selectedCar.car_id, data);
        Swal.fire({
          icon: 'success',
          title: 'Actualizado',
          timer: 1500,
          showConfirmButton: false,
        });
      } else {
        // CREATE
        await createCar({ ...data, user_id: userId });
        Swal.fire({
          icon: 'success',
          title: 'Vehículo Agregado',
          timer: 1500,
          showConfirmButton: false,
        });
      }

      setIsModalOpen(false);
      fetchCars();
    } catch (e: any) {
      const msg = e.response?.data?.message || 'Error al guardar';
      Swal.fire({
        title: 'Error',
        text: msg,
        icon: 'error',
        confirmButtonText: 'OK',
        customClass: {
          popup: 'rounded-2xl shadow-xl',
          confirmButton: 'bg-indigo-600 text-white px-5 py-2 rounded-lg'
        },
        buttonsStyling: false
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCar = async (carId: string) => {
    const result = await Swal.fire({
      title: '¿Eliminar vehículo?',
      text: 'Esta acción no se puede deshacer.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#f43f5e',
      cancelButtonColor: '#cbd5e1',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      customClass: {
        popup: 'rounded-2xl shadow-xl',
        confirmButton: 'bg-rose-500 text-white px-5 py-2 rounded-lg',
        cancelButton: 'bg-slate-200 text-slate-600 px-5 py-2 rounded-lg'
      },
      buttonsStyling: false
    });

    if (result.isConfirmed) {
      try {
        await deleteCar(carId);
        Swal.fire({
          title: 'Eliminado',
          text: '',
          icon: 'success',
          confirmButtonText: 'OK',
          customClass: {
            popup: 'rounded-2xl shadow-xl',
            confirmButton: 'bg-indigo-600 text-white px-5 py-2 rounded-lg'
          },
          buttonsStyling: false
        });
        fetchCars();
      } catch (e) {
        Swal.fire({
          title: 'Error',
          text: 'No se pudo eliminar',
          icon: 'error',
          confirmButtonText: 'OK',
          customClass: {
            popup: 'rounded-2xl shadow-xl',
            confirmButton: 'bg-indigo-600 text-white px-5 py-2 rounded-lg'
          },
          buttonsStyling: false
        });
      }
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm mt-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="font-bold text-slate-800 flex items-center gap-2 text-lg">
            <TimeToLeaveIcon className="text-indigo-600" /> Vehículos Asignados
          </h3>
          <p className="text-slate-500 text-sm">
            Flota operativa de este repartidor.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg transition-colors flex items-center gap-2 shadow-md"
        >
          <AddCircleOutlineIcon fontSize="small" /> Nuevo Vehículo
        </button>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="text-center py-4 text-slate-400">Cargando flota...</div>
      ) : (
        <div className="space-y-3">
          {cars.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
              <DirectionsCarIcon
                className="text-slate-300 mb-2"
                fontSize="large"
              />
              <p className="text-sm text-slate-500 font-medium">
                Este repartidor no tiene vehículos asignados.
              </p>
              <p className="text-xs text-slate-400">
                Agrega uno para que pueda comenzar a operar.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {cars.map((car) => (
                <div
                  key={car.car_id}
                  className="flex justify-between items-center p-4 border border-slate-200 rounded-xl hover:shadow-md transition-shadow bg-white group"
                >
                  {/* Info del Auto */}
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-slate-100 rounded-full text-slate-500">
                      {getCarIcon(car.type_car)}
                    </div>
                    <div>
                      <p className="font-bold text-slate-700 text-sm">
                        {car.car_brand} {car.car_model}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-100 uppercase tracking-wider">
                          {car.car_patent}
                        </span>
                        <span className="text-xs text-slate-400 border-l pl-2 border-slate-300">
                          {car.type_car} • {car.car_color || 'S/Color'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Botones de Acción */}
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleOpenEdit(car)}
                      className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"
                      title="Editar vehículo"
                    >
                      <EditIcon fontSize="small" />
                    </button>
                    <button
                      onClick={() => handleDeleteCar(car.car_id)}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-full transition-colors"
                      title="Eliminar vehículo"
                    >
                      <DeleteIcon fontSize="small" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal CRUD */}
      <CarModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveCar}
        car={selectedCar}
        isSaving={isSaving}
      />
    </div>
  );
};
