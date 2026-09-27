import { createTheme } from '@mui/material/styles';
import { esES } from '@mui/material/locale';
import { esES as esESGrid } from '@mui/x-data-grid/locales';
import brand from './brand.json';

const { llama, gas, tinta, status } = brand;
const font = 'Geist, "Helvetica Neue", Arial, sans-serif';

/**
 * Tema de MUI con la misma paleta que Tailwind (brand.json). MUI se usa para
 * la grilla de datos, los íconos y algunos controles; el resto va con Tailwind.
 */
export const muiTheme = createTheme(
  {
    palette: {
      primary: { main: llama['600'], dark: llama['700'], light: llama['400'], contrastText: '#FFFFFF' },
      secondary: { main: gas['400'], dark: gas['500'], light: gas['200'], contrastText: tinta['900'] },
      success: { main: status.success },
      error: { main: status.danger },
      warning: { main: status.warn },
      info: { main: status.info },
      text: { primary: tinta['900'], secondary: tinta['500'] },
      divider: tinta['200'],
      background: { default: brand.canvas, paper: '#FFFFFF' },
    },
    typography: {
      fontFamily: font,
      button: { textTransform: 'none', fontWeight: 600 },
    },
    shape: { borderRadius: 10 },
    components: {
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            backgroundColor: tinta['900'],
            fontSize: 12,
            fontWeight: 500,
            padding: '6px 10px',
            borderRadius: 8,
          },
        },
      },
    },
  },
  esES,
  esESGrid,
);
