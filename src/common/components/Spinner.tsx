import { LogoSplg } from '../../common/components/LogoSplg';

export const CheckingAuth = () => {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#0f1014] gap-8">
      {/* Logo con animación de pulso suave */}
      <div className="animate-pulse">
        <LogoSplg textSize="text-6xl" />
      </div>

      {/* Spinner personalizado con los colores de la marca */}
      <div className="relative w-16 h-16">
        {/* Círculo base (fondo grisáceo) */}
        <div className="absolute inset-0 border-4 border-slate-800 rounded-full"></div>

        {/* Círculo giratorio (color principal rosa) */}
        <div className="absolute inset-0 border-4 border-[#f43f5e] rounded-full border-t-transparent animate-spin"></div>
      </div>

      <p className="text-slate-500 text-sm font-medium tracking-widest uppercase animate-pulse">
        Cargando Sistema...
      </p>
    </div>
  );
};
