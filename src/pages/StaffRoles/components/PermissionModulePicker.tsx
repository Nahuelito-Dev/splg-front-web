import { Checkbox } from '../../../common/components/ui';
import type { PermissionModule } from '../../../services/api/types';
import { allGrantableOn, grantableOf, sentenceCase, type PermissionRules } from './permissionSelection';

interface Props {
  module: PermissionModule;
  values: string[];
  rules: PermissionRules;
  /** `single`: se tocó un permiso suelto (no «Todos los permisos del módulo»). */
  onToggle: (keys: string[], checked: boolean, single: boolean) => void;
}

/** Los permisos de un módulo, con «Todos los permisos del módulo» sobre los que la sesión puede dar. */
export const PermissionModulePicker = ({ module, values, rules, onToggle }: Props) => {
  const isOn = (key: string) => values.includes(key) || rules.impliedBy.has(key);
  const grantable = grantableOf(module, rules);
  return (
    <fieldset className="min-w-0 rounded-lg border border-outline p-4">
      <legend className="px-1 text-sm font-semibold text-ink">{module.label}</legend>
      <Checkbox
        label="Todos los permisos del módulo"
        checked={allGrantableOn(module, values, rules)}
        disabled={grantable.length === 0}
        onChange={(event) => onToggle(grantable, event.target.checked, false)}
      />
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {module.permissions.map((permission) => {
          const implied = !values.includes(permission.key) ? rules.impliedBy.get(permission.key) : undefined;
          const notHeld = !rules.held(permission.key) && !values.includes(permission.key);
          return (
            <Checkbox
              key={permission.key}
              label={sentenceCase(permission.label)}
              hint={
                implied ? `Incluido en «${implied}»` : notHeld ? 'No lo tenés: no podés darlo' : permission.description
              }
              checked={isOn(permission.key)}
              disabled={Boolean(implied) || notHeld}
              onChange={(event) => onToggle([permission.key], event.target.checked, true)}
            />
          );
        })}
      </div>
    </fieldset>
  );
};
