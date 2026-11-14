import { useNavigate } from 'react-router-dom';
import { FlaskConical, LogOut } from 'lucide-react';
import { usePermissions } from '../../hooks';
import { useOwnedCompany } from '../../hooks/useOwnedCompany';
import { ownedCompany } from '../../services/api/ownedCompany';
import { usePlatform } from '../../services/queries/supportSessions';
import { Button } from '../components/ui';

/**
 * Marca fija arriba mientras el administrador general opera la empresa propia de la plataforma: que nunca se confunda
 * con una empresa real. «Salir» vuelve a la plataforma.
 */
export const OwnedCompanyBanner = () => {
  const { mode } = usePermissions();
  const company = useOwnedCompany();
  const { data: platform } = usePlatform();
  const navigate = useNavigate();
  if (mode !== 'owned' || !company) return null;

  const leave = () => {
    navigate('/home');
    ownedCompany.exit();
  };

  return (
    <div
      role="region"
      aria-label="Empresa propia"
      className="border-b border-info/30 bg-info-soft px-3 py-2 text-[13px] text-info sm:px-6 lg:px-7"
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <FlaskConical aria-hidden="true" className="h-4 w-4 shrink-0" />
        <p className="min-w-0 flex-1 leading-snug">
          <span className="font-semibold">
            Estás operando la empresa de prueba{platform ? ` de ${platform.name}` : ''}
          </span>
          <span> · {company.name}</span>
        </p>
        <Button size="sm" variant="secondary" icon={<LogOut />} onClick={leave}>
          Salir
        </Button>
      </div>
    </div>
  );
};
