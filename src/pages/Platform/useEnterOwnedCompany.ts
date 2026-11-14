import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '../../hooks/reduxHooks';
import { ownedCompany, type OwnedCompany } from '../../services/api/ownedCompany';
import { notify } from '../../utils/notifications';

/**
 * Entrar a la empresa propia: desde acá el panel manda su `X-Distributor` y se ve como el de su admin (escribe, sin
 * pedir acceso de soporte). Sólo se ofrece para la empresa marcada como propia; la API decide igual.
 */
export const useEnterOwnedCompany = () => {
  const navigate = useNavigate();
  const uid = useAppSelector((state) => state.auth.uid);
  return (company: OwnedCompany) => {
    if (!uid) return;
    // Queda atada a esta cuenta: si entra otra en el mismo navegador, no la hereda.
    ownedCompany.enter(company, uid);
    navigate('/home');
    notify.info(`Entraste a ${company.name}, la empresa de prueba`);
  };
};
