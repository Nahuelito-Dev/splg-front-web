import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2, RotateCcw, TriangleAlert } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import {
  Button,
  Card,
  CardHeader,
  EntityPhoto,
  ErrorState,
  Form,
  FormInput,
  PageContainer,
  PageHeader,
  Skeleton,
  Switch,
} from '../../common/components/ui';
import { useDebounce, usePermiso, usePermissions } from '../../hooks';
import { themeContrastError } from '../../services/api/companyTheme';
import { errorMessage } from '../../services/api/errors';
import type { CompanyTheme, ThemeContrastError } from '../../services/api/types';
import {
  isStaleCompanyContext,
  useCompanyTheme,
  usePreviewCompanyTheme,
  useResetCompanyTheme,
  useSaveCompanyTheme,
} from '../../services/queries/companyTheme';
import { useCurrentDistributor } from '../../services/queries/distributors';
import { ThemePreview } from '../../theme/ThemePreview';
import { confirm, notify } from '../../utils/notifications';
import { formatDateTime } from '../../utils/format';
import { DistributorRequired } from './components/DistributorRequired';
import {
  appearanceSchema,
  contrastOf,
  HEX_COLOR,
  pairLabel,
  ratioLabel,
  toThemeBody,
  valuesOf,
  type AppearanceFormValues,
} from './appearanceRules';

const NO_PERMISSION_HINT = 'Tu rol no tiene permiso para cambiar la configuración';

interface ColorFieldProps {
  name: 'primaryColor' | 'accentColor';
  label: string;
  hint: string;
  value: string;
  fallback: string;
  disabled: boolean;
  onPick: (hex: string) => void;
}

/** Selector nativo + el `#RRGGBB` escrito: los dos editan el mismo campo. */
const ColorField = ({ name, label, hint, value, fallback, disabled, onPick }: ColorFieldProps) => (
  <div className="flex items-end gap-3">
    <input
      type="color"
      aria-label={`${label}: selector`}
      value={(HEX_COLOR.test(value) ? value : fallback).toLowerCase()}
      onChange={(event) => onPick(event.target.value.toUpperCase())}
      disabled={disabled}
      className="h-10 w-12 shrink-0 cursor-pointer rounded-[10px] border border-outline bg-surface p-1 disabled:cursor-not-allowed"
    />
    <div className="min-w-0 flex-1">
      <FormInput name={name} label={label} hint={hint} disabled={disabled} maxLength={7} spellCheck={false} />
    </div>
  </div>
);

const ContrastAlert = ({
  error,
  onUse,
  canWrite,
}: {
  error: ThemeContrastError;
  onUse: () => void;
  canWrite: boolean;
}) => (
  <div
    role="alert"
    className="flex flex-col gap-3 rounded-[10px] border border-danger/30 bg-danger-soft p-4 sm:flex-row sm:items-center"
  >
    <TriangleAlert aria-hidden="true" className="h-5 w-5 shrink-0 text-danger" />
    <p className="flex-1 text-sm text-ink">{error.message}</p>
    <Button variant="secondary" onClick={onUse} disabled={!canWrite}>
      Usar el sugerido ({error.suggestion})
    </Button>
  </div>
);

interface FormProps {
  theme: CompanyTheme;
  canWrite: boolean;
  writeHint?: string;
}

const AppearanceForm = ({ theme, canWrite, writeHint }: FormProps) => {
  const save = useSaveCompanyTheme();
  const reset = useResetCompanyTheme();
  const preview = usePreviewCompanyTheme();
  const { data: distributor } = useCurrentDistributor(true);
  const [contrastIssue, setContrastIssue] = useState<ThemeContrastError | null>(null);
  const [shown, setShown] = useState<CompanyTheme>(theme);
  const [serverError, setServerError] = useState<string | null>(null);

  const methods = useForm<AppearanceFormValues>({
    resolver: zodResolver(appearanceSchema),
    mode: 'onChange',
    defaultValues: valuesOf(theme),
  });
  const {
    control,
    setValue,
    reset: resetForm,
    formState: { isDirty, isValid },
  } = methods;
  const values = useWatch({ control }) as AppearanceFormValues;
  // Por texto: `useWatch` puede devolver otro objeto con los mismos valores.
  const debounced = useDebounce(JSON.stringify(values), 350);
  const previewMutate = preview.mutate;

  useEffect(() => {
    resetForm(valuesOf(theme));
    setShown(theme);
    setContrastIssue(null);
  }, [theme, resetForm]);

  // Vista previa en vivo: el back calcula los tokens y valida el contraste (la misma regla que al guardar).
  useEffect(() => {
    const parsed = appearanceSchema.safeParse(JSON.parse(debounced));
    if (!parsed.success) return;
    previewMutate(toThemeBody(parsed.data), {
      onSuccess: (next) => {
        setShown(next);
        setContrastIssue(null);
      },
      onError: (error) => {
        if (!isStaleCompanyContext(error)) setContrastIssue(themeContrastError(error));
      },
    });
  }, [debounced, previewMutate]);

  const pick = (name: 'primaryColor' | 'accentColor', hex: string) =>
    setValue(name, hex, { shouldDirty: true, shouldValidate: true });

  const submit = (form: AppearanceFormValues) => {
    setServerError(null);
    save.mutate(toThemeBody(form), {
      onSuccess: () => notify.success('Apariencia guardada: el panel ya usa los colores nuevos'),
      onError: (error) => {
        if (isStaleCompanyContext(error)) return;
        const issue = themeContrastError(error);
        setContrastIssue(issue);
        if (!issue) setServerError(errorMessage(error));
      },
    });
  };

  const restore = async () => {
    const ok = await confirm({
      title: '¿Restablecer la apariencia?',
      text: 'El panel vuelve a los colores por omisión y al nombre de la empresa. El logo no se toca.',
      confirmText: 'Restablecer',
    });
    if (!ok) return;
    setServerError(null);
    reset.mutate(undefined, {
      onSuccess: () => notify.success('Apariencia restablecida'),
      onError: (error) => {
        if (!isStaleCompanyContext(error)) setServerError(errorMessage(error));
      },
    });
  };

  const name = values.displayName?.trim() || theme.companyName;
  const disabled = !canWrite;

  return (
    <Form methods={methods} onSubmit={submit} className="space-y-6">
      <Card className="p-6">
        <CardHeader
          title="Marca de la empresa"
          subtitle="Lo que ve tu equipo en el encabezado del panel. La plataforma y el ingreso conservan su marca."
        />
        <div className="grid gap-5 sm:grid-cols-2">
          <FormInput
            name="displayName"
            label="Nombre para mostrar"
            placeholder={theme.companyName}
            hint={`Opcional. Si lo dejás vacío se muestra «${theme.companyName}».`}
            disabled={disabled}
            maxLength={60}
          />
          {distributor && (
            <EntityPhoto
              kind="distributor"
              id={distributor.distributor_id}
              url={distributor.photoUrl ?? distributor.logo_url}
              subject="de la empresa"
              label="Logo"
              fit="contain"
              canEdit
              blockedReason={canWrite ? undefined : writeHint}
            />
          )}
        </div>
      </Card>

      <Card className="p-6">
        <CardHeader
          title="Colores"
          subtitle="Botones, enlaces y resaltados. Los colores de estado (error, éxito, aviso) no cambian."
        />
        <div className="grid gap-5 sm:grid-cols-2">
          <ColorField
            name="primaryColor"
            label="Color principal"
            hint="#RRGGBB. Tiene que leerse bien con el texto de los botones y sobre el blanco."
            value={values.primaryColor ?? ''}
            fallback={theme.primaryColor}
            disabled={disabled}
            onPick={(hex) => pick('primaryColor', hex)}
          />
          <div className="space-y-3">
            <Switch
              checked={Boolean(values.customAccent)}
              onChange={(checked) => setValue('customAccent', checked, { shouldDirty: true, shouldValidate: true })}
              label="Elegir el color de acento"
              disabled={disabled}
              title={writeHint}
            />
            {values.customAccent ? (
              <ColorField
                name="accentColor"
                label="Color de acento"
                hint="#RRGGBB. Se usa poco: marcas y detalles."
                value={values.accentColor ?? ''}
                fallback={theme.tokens.light.accent}
                disabled={disabled}
                onPick={(hex) => pick('accentColor', hex)}
              />
            ) : (
              <p className="text-sm text-muted">El acento se calcula a partir del color principal.</p>
            )}
          </div>
        </div>
        {contrastIssue && (
          <div className="mt-5">
            <ContrastAlert
              error={contrastIssue}
              canWrite={canWrite}
              onUse={() =>
                pick(contrastIssue.field === 'accentColor' ? 'accentColor' : 'primaryColor', contrastIssue.suggestion)
              }
            />
          </div>
        )}
      </Card>

      <Card className="p-6">
        <CardHeader
          title="Vista previa"
          subtitle={contrastIssue ? 'Muestra el último tema válido.' : 'Así se ve en modo claro y oscuro.'}
        />
        <div className="grid gap-4 md:grid-cols-2">
          <ThemePreview tokens={shown.tokens.light} mode="light" name={name} logoUrl={shown.logoUrl} />
          <ThemePreview tokens={shown.tokens.dark} mode="dark" name={name} logoUrl={shown.logoUrl} />
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {(['light', 'dark'] as const).map((mode) => (
            <div key={mode}>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.06em] text-muted">
                Contraste · {mode === 'light' ? 'claro' : 'oscuro'}
              </h3>
              <ul className="space-y-1.5">
                {contrastOf(shown.contrast, mode).map((item) => (
                  <li key={item.pair} className="flex items-start gap-2 text-[13px]">
                    {item.ok ? (
                      <CheckCircle2 aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                    ) : (
                      <TriangleAlert aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
                    )}
                    <span className="min-w-0 flex-1 text-ink-2">{pairLabel(item.pair)}</span>
                    <span className="shrink-0 font-mono text-xs text-muted">
                      {ratioLabel(item.ratio)} / {ratioLabel(item.required)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Card>

      {serverError && (
        <p role="alert" className="text-sm text-danger">
          {serverError}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="submit"
          loading={save.isPending}
          disabled={disabled || !isValid || !isDirty || contrastIssue !== null}
          title={writeHint}
        >
          Guardar cambios
        </Button>
        <Button
          variant="secondary"
          icon={<RotateCcw className="h-4 w-4" aria-hidden="true" />}
          disabled={disabled || theme.isDefault || reset.isPending}
          title={writeHint}
          onClick={() => void restore()}
        >
          Restablecer
        </Button>
        {!theme.isDefault && theme.updatedAt && (
          <span className="text-xs text-muted">Último cambio: {formatDateTime(theme.updatedAt)}</span>
        )}
      </div>
    </Form>
  );
};

export const Appearance = () => {
  const { needsDistributor, canWrite, writeHint } = usePermissions();
  const manage = usePermiso('configuracion.gestionar');
  const { data, isPending, error, refetch } = useCompanyTheme(!needsDistributor);
  const allowed = canWrite && manage.allowed;
  const hint = !canWrite ? writeHint : manage.known && !manage.allowed ? NO_PERMISSION_HINT : undefined;
  return (
    <PageContainer size="md">
      <PageHeader
        title="Apariencia"
        description="Nombre, logo y colores de la empresa en el panel. Cada empresa tiene los suyos."
      />
      {needsDistributor ? (
        <DistributorRequired />
      ) : error ? (
        <ErrorState error={error} resource="La apariencia" onRetry={() => void refetch()} />
      ) : isPending ? (
        <Skeleton className="h-96 w-full" />
      ) : (
        <AppearanceForm theme={data} canWrite={allowed} writeHint={hint} />
      )}
    </PageContainer>
  );
};
