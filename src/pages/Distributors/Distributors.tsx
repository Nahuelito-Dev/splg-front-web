import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Distributor,
  createDistributor,
  getAllDistributors,
  updateDistributor,
} from '../../services/api/distributors';

/** Empresa que el super_admin está viendo ahora (slug guardado en localStorage). */
const currentSelected = () => localStorage.getItem('selectedDistributor') || '';

/**
 * Gestión de distribuidoras (empresas) — solo super_admin. Permite crear
 * empresas nuevas y elegir "ver como" una de ellas: al seleccionarla se setea
 * el header X-Distributor (localStorage) y se recargan los datos, así el panel
 * muestra SOLO esa empresa. "Ver todas" vuelve a la vista global.
 */
export const Distributors = () => {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState(currentSelected());
  const [form, setForm] = useState({
    name: '',
    slug: '',
    legal_name: '',
    tax_id: '',
    email: '',
    phone: '',
  });

  const { data: distributors = [], isLoading } = useQuery({
    queryKey: ['distributors'],
    queryFn: getAllDistributors,
  });

  const createMut = useMutation({
    mutationFn: () => createDistributor(form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['distributors'] });
      setForm({ name: '', slug: '', legal_name: '', tax_id: '', email: '', phone: '' });
    },
  });

  const toggleStatusMut = useMutation({
    mutationFn: (d: Distributor) =>
      updateDistributor(d.distributor_id, {
        status: d.status === 'active' ? 'suspended' : 'active',
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['distributors'] }),
  });

  // Al elegir "ver como", seteamos el header y recargamos: todas las queries
  // (pedidos, garrafas, reportes...) se re-piden scopeadas a esa empresa.
  const viewAs = (slug: string) => {
    if (slug) localStorage.setItem('selectedDistributor', slug);
    else localStorage.removeItem('selectedDistributor');
    setSelected(slug);
    window.location.reload();
  };

  const canSubmit = form.name.trim() && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(form.slug);

  return (
    <div className="p-6 text-slate-800">
      <h1 className="text-2xl font-bold mb-1">Distribuidoras (Empresas)</h1>
      <p className="text-slate-500 text-sm mb-6">
        Cada empresa opera aislada: sus choferes, clientes, pedidos y catálogo.
      </p>

      {/* Banner de empresa activa */}
      <div className="mb-6 rounded-xl bg-slate-800 text-slate-100 border border-slate-700 px-5 py-3 flex items-center justify-between">
        <span className="text-sm">
          Viendo:{' '}
          <b className="text-rose-400">
            {selected ? selected : 'TODAS las empresas'}
          </b>
        </span>
        {selected && (
          <button
            onClick={() => viewAs('')}
            className="text-xs px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600"
          >
            Ver todas
          </button>
        )}
      </div>

      {/* Alta de empresa */}
      <div className="mb-8 rounded-xl bg-slate-900 text-slate-100 border border-slate-800 p-5">
        <h2 className="font-semibold mb-3">Nueva empresa</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            className="bg-slate-800 rounded-lg px-3 py-2 text-sm"
            placeholder="Nombre (ej: Wagner Gas)"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <input
            className="bg-slate-800 rounded-lg px-3 py-2 text-sm"
            placeholder="slug (ej: wagner-gas)"
            value={form.slug}
            onChange={(e) => setForm({ ...form, slug: e.target.value })}
          />
          <input
            className="bg-slate-800 rounded-lg px-3 py-2 text-sm"
            placeholder="Razón social"
            value={form.legal_name}
            onChange={(e) => setForm({ ...form, legal_name: e.target.value })}
          />
          <input
            className="bg-slate-800 rounded-lg px-3 py-2 text-sm"
            placeholder="CUIT"
            value={form.tax_id}
            onChange={(e) => setForm({ ...form, tax_id: e.target.value })}
          />
          <input
            className="bg-slate-800 rounded-lg px-3 py-2 text-sm"
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <input
            className="bg-slate-800 rounded-lg px-3 py-2 text-sm"
            placeholder="Teléfono"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
        </div>
        <button
          disabled={!canSubmit || createMut.isLoading}
          onClick={() => createMut.mutate()}
          className="mt-4 px-5 py-2 rounded-lg bg-rose-500 hover:bg-rose-600 disabled:opacity-40 text-sm font-semibold"
        >
          {createMut.isLoading ? 'Creando...' : 'Crear empresa'}
        </button>
        {createMut.isError && (
          <p className="text-rose-400 text-xs mt-2">
            No se pudo crear (¿slug duplicado o inválido?).
          </p>
        )}
      </div>

      {/* Listado */}
      {isLoading ? (
        <p className="text-slate-400">Cargando...</p>
      ) : (
        <div className="rounded-xl overflow-hidden border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-800 text-slate-100">
              <tr>
                <th className="text-left px-4 py-3">Empresa</th>
                <th className="text-left px-4 py-3">slug</th>
                <th className="text-left px-4 py-3">Estado</th>
                <th className="text-right px-4 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {distributors.map((d) => (
                <tr key={d.distributor_id} className="border-t border-slate-200">
                  <td className="px-4 py-3 font-semibold text-slate-800">{d.name}</td>
                  <td className="px-4 py-3 text-slate-500">{d.slug}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs ${
                        d.status === 'active'
                          ? 'bg-emerald-500/15 text-emerald-400'
                          : 'bg-amber-500/15 text-amber-400'
                      }`}
                    >
                      {d.status === 'active' ? 'activa' : 'suspendida'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button
                      onClick={() => viewAs(d.slug)}
                      className="px-3 py-1.5 rounded-lg bg-rose-500/90 hover:bg-rose-600 text-xs"
                    >
                      Ver como
                    </button>
                    <button
                      onClick={() => toggleStatusMut.mutate(d)}
                      className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-xs"
                    >
                      {d.status === 'active' ? 'Suspender' : 'Activar'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
