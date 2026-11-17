import '@mui/x-data-grid/themeAugmentation';
import type { Components, Theme } from '@mui/material/styles';
import type { ResolvedThemeMode } from '../themeMode';
import type { ThemeModeTokens } from '../../services/api/types';
import { surfaceTokens } from './palette';

/** La grilla de datos del panel (antes vivía en el `sx` de `DataTable`). */
export const dataGridComponents = (mode: ResolvedThemeMode, company?: ThemeModeTokens): Components<Theme> => {
  const t = surfaceTokens(mode, company);
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
          // Las columnas de cifras son angostas (96–120 px): un encabezado largo pasa a dos renglones en vez de cortarse.
          '& .MuiDataGrid-columnHeaderTitle': {
            fontWeight: 500,
            fontSize: 12,
            color: theme.palette.text.secondary,
            whiteSpace: 'normal',
            lineHeight: 1.25,
          },
          '& .MuiDataGrid-row:hover': { backgroundColor: theme.palette.action.hover },
          '& .MuiDataGrid-columnHeader:first-of-type, & .MuiDataGrid-cell:first-of-type': { paddingLeft: '18px' },
          '& .MuiDataGrid-cell': { borderColor: theme.palette.divider, display: 'flex', alignItems: 'center' },
          // Cargando sin filas el DataGrid autoajustado deja una franja mínima: el esqueleto ocupa lo mismo que el vacío.
          '& .MuiDataGrid-overlayWrapper': { minHeight: 240 },
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
