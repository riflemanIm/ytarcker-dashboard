// material-ui
import { presetPalettes } from '@ant-design/colors';
import { PaletteMode, createTheme } from '@mui/material';
import Theme from './theme';

// third-party

// project import

// ==============================|| DEFAULT THEME - PALETTE  ||============================== //

const Palette = (mode: PaletteMode) => {
  const colors = presetPalettes;
  const greyPrimary = [
    '#ffffff',
    '#fafafa',
    '#f5f5f5',
    '#f0f0f0',
    '#d9d9d9',
    '#bfbfbf',
    '#8c8c8c',
    '#595959',
    '#262626',
    '#141414',
    '#000000'
  ];
  const greyAscent = ['#fafafa', '#bfbfbf', '#434343', '#1f1f1f'];
  const greyConstant = ['#fafafb', '#e6ebf1'];

  colors.grey = [...greyPrimary, ...greyAscent, ...greyConstant];

  const paletteColor = Theme(colors);
  const isDarkMode = mode === 'dark';

  return createTheme({
    palette: {
      mode,
      common: {
        black: '#000',
        white: '#fff'
      },
      ...paletteColor,
      error: isDarkMode
        ? {
            ...paletteColor.error,
            main: '#ff8c42'
          }
        : paletteColor.error,
      text: {
        primary: isDarkMode ? paletteColor.grey[50] : paletteColor.grey[700],
        secondary: isDarkMode ? paletteColor.grey[300] : paletteColor.grey[500],
        disabled: isDarkMode ? paletteColor.grey[600] : paletteColor.grey[400]
      },
      action: {
        disabled: isDarkMode ? paletteColor.grey[700] : paletteColor.grey[300]
      },
      divider: isDarkMode ? paletteColor.grey[800] : paletteColor.grey[200],
      background: {
        paper: isDarkMode ? '#1e1e1e' : paletteColor.grey[0],
        default: isDarkMode ? '#121212' : paletteColor.grey.A50
      }
    }
  });
};

export default Palette;
