import { useState, type MouseEvent } from 'react';
import { Menu, MenuItem, ListItemIcon, ListItemText } from '@mui/material';
import { Check, Laptop, Moon, Sun, type LucideIcon } from 'lucide-react';
import { useThemeMode } from '../../../../theme/useThemeMode';
import type { ThemeMode } from '../../../../theme/themeMode';
import { cx } from '../../ui/cx';

const OPTIONS: Array<{ value: ThemeMode; label: string; icon: LucideIcon }> = [
  { value: 'light', label: 'Claro', icon: Sun },
  { value: 'dark', label: 'Oscuro', icon: Moon },
  { value: 'system', label: 'Como el sistema', icon: Laptop },
];

const TRIGGER_ICON: Record<ThemeMode, LucideIcon> = { light: Sun, dark: Moon, system: Laptop };

/** Selector de tema (claro/oscuro/sistema) persistido en localStorage. */
export const ThemeModeToggle = () => {
  const { mode, setMode } = useThemeMode();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const TriggerIcon = TRIGGER_ICON[mode];

  const handleOpen = (event: MouseEvent<HTMLElement>) => setAnchor(event.currentTarget);
  const handleClose = () => setAnchor(null);
  const handleSelect = (value: ThemeMode) => {
    setMode(value);
    handleClose();
  };

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        aria-label={`Tema: ${OPTIONS.find((o) => o.value === mode)?.label}`}
        aria-haspopup="menu"
        aria-expanded={Boolean(anchor)}
        className="grid h-9 w-9 place-items-center rounded-[10px] border border-outline bg-surface text-ink-2 shadow-control transition-colors hover:bg-surface-hover"
      >
        <TriggerIcon aria-hidden="true" className="h-[18px] w-[18px]" strokeWidth={1.8} />
      </button>
      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { className: '!mt-1 !min-w-[190px] !rounded-xl !border !border-outline !shadow-lg' } }}
      >
        {OPTIONS.map(({ value, label, icon: Icon }) => (
          <MenuItem key={value} onClick={() => handleSelect(value)} className="!gap-2.5 !py-2 !text-[13px] !text-ink">
            <ListItemIcon className={cx(mode === value ? 'text-primary' : 'text-ink-2')}>
              <Icon aria-hidden="true" className="h-4 w-4" strokeWidth={1.8} />
            </ListItemIcon>
            <ListItemText>{label}</ListItemText>
            {mode === value && <Check aria-hidden="true" className="h-4 w-4 text-primary" strokeWidth={1.8} />}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
};
