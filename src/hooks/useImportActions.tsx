import { useState, type ReactElement } from 'react';
import { Upload } from 'lucide-react';
import { ImportWizard } from '../common/components/ImportWizard/ImportWizard';
import type { MenuAction } from '../common/components/ui/MoreActionsMenu';
import type { ImportResource } from '../services/api/imports';
import { usePermissions } from '.';

export interface ImportEntry {
  resource: ImportResource;
  /** Texto del ítem del menú «Más». */
  label: string;
}

/**
 * Las entradas «Importar…» del menú «Más» de un listado y el asistente que abren. Sin distribuidora elegida
 * (administrador general sin «Ver como») quedan apagadas con el motivo.
 */
export const useImportActions = (entries: ImportEntry[]): { actions: MenuAction[]; wizard: ReactElement } => {
  const [resource, setResource] = useState<ImportResource | null>(null);
  const { operateHint } = usePermissions();
  const actions = entries.map((entry): MenuAction => ({
    label: entry.label,
    icon: <Upload />,
    onClick: () => setResource(entry.resource),
    blockedReason: operateHint,
  }));
  return {
    actions,
    wizard: resource ? <ImportWizard open resource={resource} onClose={() => setResource(null)} /> : <></>,
  };
};
