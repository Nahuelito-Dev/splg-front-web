import { Check } from 'lucide-react';
import { Controller, useFormContext } from 'react-hook-form';
import { cx, FormError } from '../../../common/components/ui';
import { LABEL_COLORS } from '../../../features/chat/labels/labelColors';
import type { LabelValues } from '../../../features/chat/labels/labelSchemas';
import { CHAT_LABEL_COLORS } from '../../../services/api/chatLabels';

/** Los diez colores de la paleta como botones de opción (uno elegido, con flechas entre ellos). */
export const LabelColorPicker = () => {
  const { control } = useFormContext<LabelValues>();
  return (
    <Controller
      control={control}
      name="color"
      render={({ field }) => (
        <fieldset className="grid gap-2">
          <legend className="mb-1.5 text-sm font-medium text-ink">Color</legend>
          <div className="flex flex-wrap gap-2">
            {CHAT_LABEL_COLORS.map((color) => {
              const selected = field.value === color;
              return (
                <label
                  key={color}
                  className={cx(
                    'relative grid h-9 w-9 cursor-pointer place-items-center rounded-full border-2 transition-shadow',
                    'has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary/40',
                    selected ? 'border-ink' : 'border-transparent',
                  )}
                  title={LABEL_COLORS[color].name}
                >
                  <input
                    type="radio"
                    name={field.name}
                    value={color}
                    checked={selected}
                    onChange={() => field.onChange(color)}
                    onBlur={field.onBlur}
                    className="sr-only"
                    aria-label={LABEL_COLORS[color].name}
                  />
                  <span
                    aria-hidden="true"
                    className={cx('grid h-7 w-7 place-items-center rounded-full border', LABEL_COLORS[color].classes)}
                  >
                    {selected && <Check className="h-3.5 w-3.5" strokeWidth={2.5} />}
                  </span>
                </label>
              );
            })}
          </div>
          <FormError name="color" />
        </fieldset>
      )}
    />
  );
};
