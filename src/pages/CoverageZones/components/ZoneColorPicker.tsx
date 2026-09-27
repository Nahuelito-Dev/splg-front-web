import { cx, Input } from '../../../common/components/ui';
import { ZONE_COLOR_PRESETS } from '../../../theme/zoneColors';

const PLACEHOLDER_HEX = ZONE_COLOR_PRESETS[0].hex;

interface Props {
  value: string;
  onChange: (hex: string) => void;
  error?: string;
}

/**
 * Paleta de 8 colores accesibles + un campo para cargar cualquier hex. El
 * color es un dato de la zona (como el hex que devuelve la API), no un
 * estilo: por eso los swatches usan `style`, igual que el relleno del mapa.
 */
export const ZoneColorPicker = ({ value, onChange, error }: Props) => (
  <div className="flex flex-col gap-2">
    <span className="text-sm font-medium text-ink">Color</span>
    <div className="flex flex-wrap gap-2" role="group" aria-label="Colores predefinidos">
      {ZONE_COLOR_PRESETS.map((preset) => {
        const selected = value.toLowerCase() === preset.hex.toLowerCase();
        return (
          <button
            key={preset.hex}
            type="button"
            title={preset.label}
            aria-label={preset.label}
            aria-pressed={selected}
            onClick={() => onChange(preset.hex)}
            className={cx(
              'h-7 w-7 rounded-full border-2 transition-transform hover:scale-105',
              selected ? 'border-ink' : 'border-transparent',
            )}
            style={{ backgroundColor: preset.hex }}
          />
        );
      })}
    </div>
    <Input
      label="Color hexadecimal"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={PLACEHOLDER_HEX}
      error={error}
      className="w-32 font-mono"
    />
  </div>
);
