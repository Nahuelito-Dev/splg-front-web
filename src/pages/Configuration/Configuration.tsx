import { TimeSlotsManager } from './components/TimeSlotsManager';
import SettingsSuggestIcon from '@mui/icons-material/SettingsSuggest';

export const Configuration = () => {
  return (
    <div className="p-4 md:p-8 bg-slate-50 min-h-screen">
      <div className="max-w-[1000px] mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            <SettingsSuggestIcon fontSize="large" className="text-slate-400" />{' '}
            Configuración
          </h1>
          <p className="text-slate-500 mt-1 ml-11">
            Gestiona los parámetros operativos del sistema.
          </p>
        </header>

        <div className="space-y-8">
          {/* Gestión de Horarios */}
          <TimeSlotsManager />

          {/* Aquí puedes agregar más tarjetas de configuración en el futuro */}
        </div>
      </div>
    </div>
  );
};
