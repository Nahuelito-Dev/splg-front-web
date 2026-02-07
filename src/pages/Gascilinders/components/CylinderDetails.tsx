import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { privateAxiosInstance } from '../../../services/api/axiosConfig'; // Usaremos axios directo si no tienes la fn exportada
import { GasCylinder } from '../../../interfaces';
import { CylinderModal } from './CylinderModal';
import { updateCylinder } from '../../../services/api/cylinders';
import Swal from 'sweetalert2';

// Iconos
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PropaneIcon from '@mui/icons-material/Propane';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import ShoppingCartCheckoutIcon from '@mui/icons-material/ShoppingCartCheckout';
import EditIcon from '@mui/icons-material/Edit';

export const CylinderDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [cylinder, setCylinder] = useState<GasCylinder | null>(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Función para cargar datos frescos
  const fetchCylinder = async () => {
    if (!id) return;
    try {
      // Llamada directa al endpoint que ya tienes: GET /gascylinder/:id
      const { data } = await privateAxiosInstance.get<GasCylinder>(
        `/gascylinder/${id}`,
      );
      setCylinder(data);
    } catch (error) {
      console.error(error);
      Swal.fire('Error', 'No se pudo cargar el producto', 'error');
      navigate('/cylinders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCylinder();
  }, [id]);

  const handleEditSave = async (data: any) => {
    try {
      await updateCylinder(id!, data);
      await fetchCylinder(); // Recargar datos en tiempo real
      setIsModalOpen(false);
      Swal.fire(
        'Actualizado',
        'La información se actualizó correctamente',
        'success',
      );
    } catch (error) {
      Swal.fire('Error', 'No se pudo actualizar', 'error');
    }
  };

  if (loading)
    return <div className="p-8 text-center">Cargando detalles...</div>;
  if (!cylinder)
    return (
      <div className="p-8 text-center text-red-500">Producto no encontrado</div>
    );

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
      {/* --- HEADER --- */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-slate-500 hover:text-pink-600 transition-colors font-bold"
        >
          <ArrowBackIcon fontSize="small" /> Volver al inventario
        </button>

        <div className="flex gap-2">
          <span
            className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider border ${
              cylinder.isActive
                ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                : 'bg-rose-100 text-rose-700 border-rose-200'
            }`}
          >
            {cylinder.isActive ? 'Producto Activo' : 'Desactivado'}
          </span>
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-slate-800 text-white px-4 py-2 rounded-lg font-bold hover:bg-slate-700 transition-colors flex items-center gap-2"
          >
            <EditIcon fontSize="small" /> Editar
          </button>
        </div>
      </div>

      {/* --- TARJETA PRINCIPAL --- */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Banner */}
        <div className="h-32 bg-gradient-to-r from-pink-500 to-rose-600 relative">
          <div className="absolute -bottom-10 left-8 p-4 bg-white rounded-2xl shadow-lg border border-slate-100">
            <PropaneIcon sx={{ fontSize: 60 }} className="text-pink-500" />
          </div>
        </div>

        <div className="pt-14 px-8 pb-8">
          <h1 className="text-3xl font-extrabold text-slate-800">
            Garrafa {cylinder.type}
          </h1>
          <p className="text-slate-500 mt-1 max-w-2xl">
            {cylinder.description || 'Sin descripción disponible.'}
          </p>

          {/* --- GRID DE MÉTRICAS --- */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
            {/* 1. PRECIO */}
            <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 flex items-center gap-4">
              <div className="p-3 bg-white rounded-lg text-emerald-600 shadow-sm">
                <AttachMoneyIcon fontSize="large" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase">
                  Precio Unitario
                </p>
                <p className="text-2xl font-black text-slate-800">
                  $ {Number(cylinder.price).toLocaleString('es-AR')}
                </p>
              </div>
            </div>

            {/* 2. STOCK */}
            <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 flex items-center gap-4">
              <div className="p-3 bg-white rounded-lg text-blue-600 shadow-sm">
                <Inventory2Icon fontSize="large" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase">
                  Stock Disponible
                </p>
                <div className="flex items-center gap-2">
                  <p
                    className={`text-2xl font-black ${cylinder.stock < 20 ? 'text-rose-600' : 'text-slate-800'}`}
                  >
                    {cylinder.stock} u.
                  </p>
                  {cylinder.stock < 20 && (
                    <span className="text-[10px] font-bold text-rose-500 bg-rose-100 px-2 py-0.5 rounded-full">
                      BAJO
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* 3. PEDIDOS (Placeholder para futura métrica) */}
            <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 flex items-center gap-4">
              <div className="p-3 bg-white rounded-lg text-amber-500 shadow-sm">
                <ShoppingCartCheckoutIcon fontSize="large" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase">
                  Peso Neto
                </p>
                <p className="text-2xl font-black text-slate-800">
                  {cylinder.weight} kg
                </p>
              </div>
            </div>
          </div>

          <hr className="my-8 border-slate-100" />

          {/* --- SECCIÓN DE PROMOCIONES --- */}
          <div>
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
              <LocalOfferIcon className="text-pink-500" />
              Promociones Activas
            </h3>

            {!cylinder.promotions || cylinder.promotions.length === 0 ? (
              <div className="p-6 bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl text-center">
                <p className="text-slate-400 text-sm">
                  No hay promociones configuradas para este producto.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {cylinder.promotions.map((promo, idx) => (
                  <div
                    key={idx}
                    className="relative overflow-hidden bg-white border border-pink-100 rounded-xl shadow-sm hover:shadow-md transition-shadow p-4 group"
                  >
                    <div className="absolute top-0 right-0 bg-pink-500 text-white text-[10px] font-bold px-2 py-1 rounded-bl-lg">
                      {promo.discountPercentage}% OFF
                    </div>
                    <div className="text-center mt-2">
                      <p className="text-slate-500 text-xs uppercase font-bold">
                        Llevando
                      </p>
                      <p className="text-3xl font-black text-slate-800">
                        {promo.quantity}
                      </p>
                      <p className="text-slate-500 text-xs uppercase font-bold">
                        Unidades
                      </p>
                    </div>
                    <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center">
                      <span className="text-xs text-slate-400 line-through">
                        ${Number(cylinder.price).toLocaleString()}
                      </span>
                      <span className="text-sm font-bold text-emerald-600">
                        $
                        {(
                          Number(cylinder.price) *
                          (1 - Number(promo.discountPercentage) / 100)
                        ).toLocaleString('es-AR')}{' '}
                        c/u
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODAL PARA EDITAR DESDE EL DETALLE */}
      <CylinderModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        cylinder={cylinder}
        onSave={handleEditSave}
        isSaving={false} // Puedes agregar estado de saving si quieres
      />
    </div>
  );
};
