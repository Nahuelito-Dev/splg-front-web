import type { ReactNode } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { PackageX } from 'lucide-react';
import { usePermissions } from '../../hooks';
import type { ModuleKey } from '../../services/api/modules';
import { useCompanyModules, useModuleGate } from '../../services/queries/modules';
import { useCompanyContext } from '../../services/queries/companyContext';
import { Button, EmptyState, LoadingState, PageContainer } from './ui';

interface NotIncludedProps {
  /** Nombre del módulo como lo da la API («Lector de documentos»). */
  label?: string;
}

/**
 * Lo que ve la empresa al entrar (por URL o con un enlace viejo) a la pantalla de un módulo que la plataforma no le
 * habilitó. El admin de la empresa puede consultarlo por Ayuda (el chat con la plataforma); en modo soporte no.
 */
export const ModuleNotIncluded = ({ label }: NotIncludedProps) => {
  const navigate = useNavigate();
  const { mode } = usePermissions();
  const canAsk = mode === 'company';
  return (
    <PageContainer>
      <EmptyState
        icon={PackageX}
        title="No incluido en tu plan"
        description={
          label
            ? `«${label}» no está habilitado para tu empresa. Lo demás del panel sigue funcionando igual.`
            : 'Esta función no está habilitada para tu empresa. Lo demás del panel sigue funcionando igual.'
        }
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <Button variant="secondary" onClick={() => navigate('/home')}>
              Ir al tablero
            </Button>
            {canAsk && <Button onClick={() => navigate('/support')}>Consultar a la plataforma</Button>}
          </div>
        }
      />
    </PageContainer>
  );
};

interface Props {
  module: ModuleKey;
}

/**
 * Pantallas de un módulo (lector, recompra, hojas de ruta…): si la plataforma no se lo habilitó a la empresa que se
 * mira, en vez de la pantalla (que recibiría 403 `MODULE_DISABLED` en cada consulta) se ve «No incluido en tu plan».
 * Mientras no se sabe se espera; si no se pudo leer, se deja pasar: el back igual decide. Lo que no está en el catálogo
 * que devuelve la API es núcleo.
 */
export const RequireModule = ({ module }: Props) => {
  const context = useCompanyContext();
  const { data, isPending } = useCompanyModules();
  if (context === null) return <Outlet />;
  if (!data) return isPending ? <LoadingState fullPage /> : <Outlet />;
  const found = data.find((m) => m.key === module);
  if (found && !found.enabled) return <ModuleNotIncluded label={found.label} />;
  return <Outlet />;
};

interface IfModuleProps {
  module: ModuleKey;
  children: ReactNode;
}

/**
 * Una parte de una pantalla del núcleo que es de un módulo (una tarjeta, un bloque): sólo se monta —y sólo pide sus
 * datos— si la plataforma se lo habilitó a la empresa. Apagado no se muestra nada (no es un error de la pantalla).
 */
export const IfModule = ({ module, children }: IfModuleProps) => {
  const { ready } = useModuleGate(module);
  return ready ? <>{children}</> : null;
};
