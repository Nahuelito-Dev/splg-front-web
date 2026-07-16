import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getAllDeliveries } from '../../services/api/deliveries';
import { getAllCustomers } from '../../services/api/customers';
import {
  getRatingSummary,
  getRatingsForUser,
  Rating,
} from '../../services/api/ratings';
import { Delivery, Customer } from '../../interfaces';

// Iconos
import StarIcon from '@mui/icons-material/Star';
import StarRateIcon from '@mui/icons-material/StarRate';
import SearchIcon from '@mui/icons-material/Search';
import TwoWheelerIcon from '@mui/icons-material/TwoWheeler';
import PersonIcon from '@mui/icons-material/Person';
import RateReviewIcon from '@mui/icons-material/RateReview';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';

type ProfileType = 'delivery' | 'customer';

interface SelectedProfile {
  type: ProfileType;
  userId: string;
  name: string;
}

const Stars = ({
  value,
  size = 'medium',
}: {
  value: number;
  size?: 'small' | 'medium' | 'large';
}) => (
  <div className="flex text-amber-400">
    {[1, 2, 3, 4, 5].map((star) => (
      <StarIcon
        key={star}
        fontSize={size}
        className={star <= Math.round(value) ? 'text-amber-400' : 'text-slate-200'}
      />
    ))}
  </div>
);

export const Ratings = () => {
  const [tab, setTab] = useState<ProfileType>('delivery');
  const [term, setTerm] = useState('');
  const [selected, setSelected] = useState<SelectedProfile | null>(null);

  // Listado de choferes / clientes para elegir a quién ver las calificaciones.
  const { data: deliveries, isLoading: loadingDeliveries } = useQuery(
    ['ratings-deliveries', term],
    () => getAllDeliveries(0, 20, term || undefined),
    { enabled: tab === 'delivery' },
  );

  const { data: customers, isLoading: loadingCustomers } = useQuery(
    ['ratings-customers', term],
    () => getAllCustomers(0, 20, term || undefined),
    { enabled: tab === 'customer' },
  );

  const list = tab === 'delivery' ? deliveries?.rows : customers?.rows;
  const loadingList = tab === 'delivery' ? loadingDeliveries : loadingCustomers;

  // Resumen oficial (solo tiene sentido para choferes: el backend promedia
  // sólo las calificaciones emitidas por clientes).
  const { data: summary } = useQuery(
    ['rating-summary', selected?.userId],
    () => getRatingSummary(selected!.userId),
    { enabled: !!selected },
  );

  const { data: history = [], isLoading: loadingHistory } = useQuery<Rating[]>(
    ['rating-history', selected?.userId],
    () => getRatingsForUser(selected!.userId),
    { enabled: !!selected },
  );

  // Para clientes el resumen del backend siempre da 0 (solo cuenta
  // calificaciones "como chofer"), así que calculamos nosotros el promedio
  // real a partir del historial recibido.
  const computedAverage = useMemo(() => {
    if (!history.length) return 0;
    const total = history.reduce((acc, r) => acc + r.stars, 0);
    return Math.round((total / history.length) * 100) / 100;
  }, [history]);

  const displayAverage =
    selected?.type === 'delivery' && summary ? summary.average : computedAverage;
  const displayCount =
    selected?.type === 'delivery' && summary ? summary.count : history.length;

  const handleTabChange = (newTab: ProfileType) => {
    setTab(newTab);
    setTerm('');
    setSelected(null);
  };

  return (
    <div className="p-4 md:p-8 bg-slate-50 min-h-screen">
      <div className="max-w-[1600px] mx-auto space-y-8">
        <header>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            <RateReviewIcon fontSize="large" className="text-slate-400" />{' '}
            Calificaciones
          </h1>
          <p className="text-slate-500 mt-1 ml-11">
            Calificaciones bidireccionales entre clientes y choferes al
            finalizar un pedido.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Selector de perfil */}
          <section className="lg:col-span-1 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
            <div className="flex bg-slate-100 p-1 m-4 rounded-lg">
              <button
                onClick={() => handleTabChange('delivery')}
                className={`flex-1 flex items-center justify-center gap-1 px-3 py-2 text-xs font-bold rounded-lg transition-all ${
                  tab === 'delivery'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100'
                    : 'text-slate-500 hover:text-indigo-500'
                }`}
              >
                <TwoWheelerIcon fontSize="inherit" /> Choferes
              </button>
              <button
                onClick={() => handleTabChange('customer')}
                className={`flex-1 flex items-center justify-center gap-1 px-3 py-2 text-xs font-bold rounded-lg transition-all ${
                  tab === 'customer'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100'
                    : 'text-slate-500 hover:text-indigo-500'
                }`}
              >
                <PersonIcon fontSize="inherit" /> Clientes
              </button>
            </div>

            <div className="px-4 pb-3">
              <div className="relative">
                <SearchIcon
                  fontSize="small"
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  value={term}
                  onChange={(e) => setTerm(e.target.value)}
                  placeholder={
                    tab === 'delivery' ? 'Buscar chofer...' : 'Buscar cliente...'
                  }
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-colors"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto max-h-[520px] border-t border-slate-100">
              {loadingList ? (
                <div className="p-8 text-center text-slate-400 text-sm">
                  Cargando...
                </div>
              ) : !list || list.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-sm">
                  Sin resultados.
                </div>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {list.map((item: Delivery | Customer) => {
                    const userId = item.user_id;
                    const name = item.user?.full_name || 'Sin nombre';
                    const isSelected = selected?.userId === userId;
                    return (
                      <li key={userId}>
                        <button
                          onClick={() =>
                            setSelected({ type: tab, userId, name })
                          }
                          className={`w-full text-left px-4 py-3 transition-colors flex items-center gap-3 ${
                            isSelected
                              ? 'bg-indigo-50 border-l-4 border-indigo-600'
                              : 'hover:bg-slate-50 border-l-4 border-transparent'
                          }`}
                        >
                          <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 flex-shrink-0">
                            {tab === 'delivery' ? (
                              <TwoWheelerIcon fontSize="small" />
                            ) : (
                              <PersonIcon fontSize="small" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-800 text-sm truncate">
                              {name}
                            </p>
                            <p className="text-xs text-slate-400 truncate">
                              {item.user?.email}
                            </p>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </section>

          {/* Detalle de calificaciones */}
          <section className="lg:col-span-2 space-y-6">
            {!selected ? (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-16 text-center">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <StarRateIcon className="text-amber-300" fontSize="large" />
                </div>
                <h3 className="text-lg font-bold text-slate-700">
                  Elegí un {tab === 'delivery' ? 'chofer' : 'cliente'}
                </h3>
                <p className="text-slate-500">
                  Seleccioná un perfil de la lista para ver sus calificaciones.
                </p>
              </div>
            ) : (
              <>
                {/* Resumen */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col sm:flex-row items-center gap-6">
                  <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 flex-shrink-0">
                    {selected.type === 'delivery' ? (
                      <TwoWheelerIcon fontSize="large" />
                    ) : (
                      <PersonIcon fontSize="large" />
                    )}
                  </div>
                  <div className="flex-1 text-center sm:text-left">
                    <p className="text-xs font-bold text-slate-400 uppercase">
                      {selected.type === 'delivery' ? 'Chofer' : 'Cliente'}
                    </p>
                    <h3 className="text-xl font-black text-slate-800">
                      {selected.name}
                    </h3>
                  </div>
                  <div className="flex flex-col items-center sm:items-end gap-1">
                    <div className="flex items-center gap-2">
                      <span className="text-3xl font-black text-slate-800">
                        {displayAverage.toFixed(1)}
                      </span>
                      <Stars value={displayAverage} />
                    </div>
                    <span className="text-xs text-slate-400 font-medium">
                      {displayCount} calificación{displayCount === 1 ? '' : 'es'}
                    </span>
                  </div>
                </div>

                {/* Historial */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-100">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                      <ChatBubbleOutlineIcon fontSize="small" className="text-slate-400" />
                      Reseñas
                    </h3>
                  </div>
                  {loadingHistory ? (
                    <div className="p-10 text-center text-slate-400">
                      Cargando reseñas...
                    </div>
                  ) : history.length === 0 ? (
                    <div className="p-10 text-center text-slate-400">
                      Todavía no recibió calificaciones.
                    </div>
                  ) : (
                    <ul className="divide-y divide-slate-100">
                      {history.map((rating) => (
                        <li key={rating.rating_id} className="px-6 py-4">
                          <div className="flex items-center justify-between gap-4 flex-wrap">
                            <div className="flex items-center gap-2">
                              <Stars value={rating.stars} size="small" />
                              <span className="text-xs font-bold text-slate-500 uppercase bg-slate-100 px-2 py-0.5 rounded">
                                {rating.from_role === 'customer'
                                  ? 'De un cliente'
                                  : 'De un chofer'}
                              </span>
                            </div>
                            <span className="text-xs text-slate-400">
                              {new Date(rating.createdAt).toLocaleDateString()}{' '}
                              {new Date(rating.createdAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                          {rating.comment && (
                            <p className="text-sm text-slate-600 mt-2">
                              “{rating.comment}”
                            </p>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};
