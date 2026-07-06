import { Navbar, SideMenu } from '../components';

interface Props {
  children: React.ReactNode;
}

export const DashboardLayout = ({ children }: Props) => {
  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 selection:bg-indigo-500 selection:text-white">
      {/* Menú Lateral (Fixed) */}
      <SideMenu />

      {/* Contenedor Principal */}
      {/* ml-72: Crea el margen izquierdo exacto del ancho del menú (w-72) */}
      <main className="ml-72 min-h-screen transition-all duration-300">
        {/* Barra superior (campana de notificaciones en tiempo real) */}
        <Navbar />

        {/* Wrapper del contenido con padding interno */}
        <div className="w-full">{children}</div>
      </main>
    </div>
  );
};
