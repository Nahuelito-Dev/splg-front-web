import '@mui/x-data-grid/themeAugmentation';
import type { Components, Theme } from '@mui/material/styles';
import type { ResolvedThemeMode } from '../themeMode';
import { surfaceTokens } from './palette';

/** La grilla de datos del panel (antes vivía en el `sx` de `DataTable`). */
export const dataGridComponents = (mode: ResolvedThemeMode): Components<Theme> => {
  const t = surfaceTokens(mode);
  return {
    MuiDataGrid: {
      styleOverrides: {
        root: ({ theme }) => ({
          border: 0,
          fontSize: 13,
          color: theme.palette.text.primary,
          '--DataGrid-rowBorderColor': theme.palette.divider,
          '& .MuiDataGrid-columnHeaders': {
            backgroundColor: mode === 'dark' ? theme.palette.action.hover : theme.palette.grey[50],
            borderBottomColor: theme.palette.divider,
          },
          '& .MuiDataGrid-columnHeaderTitle': { fontWeight: 500, fontSize: 12, color: theme.palette.text.secondary },
          '& .MuiDataGrid-row:hover': { backgroundColor: theme.palette.action.hover },
          '& .MuiDataGrid-columnHeader:first-of-type, & .MuiDataGrid-cell:first-of-type': { paddingLeft: '18px' },
          '& .MuiDataGrid-cell': { borderColor: theme.palette.divider, display: 'flex', alignItems: 'center' },
          // Con la tabla vacía (o cargando sin filas) el DataGrid autoajustado deja una franja mínima: el vacío ilustrado no entra.
          '& .MuiDataGrid-overlayWrapper': { minHeight: 280 },
          '& .MuiDataGrid-footerContainer': { borderTopColor: theme.palette.divider },
          '& .MuiDataGrid-cell:focus, & .MuiDataGrid-columnHeader:focus, & .MuiDataGrid-cell:focus-within': {
            outline: 'none',
          },
        }),
      },
    },
    MuiCheckbox: {
      styleOverrides: {
        root: {
          color: t.muted,
          '&.Mui-checked, &.MuiCheckbox-indeterminate': { color: 'rgb(var(--c-primary))' },
          '&:hover': { backgroundColor: t.surfaceMuted },
        },
      },
    },
  };
};
