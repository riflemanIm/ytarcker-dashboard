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
  const ytDark = {
    bgDefault: '#1f2028',
    bgPaper: '#2a2b35',
    divider: '#3a3c49',
    textPrimary: '#e3e7f2',
    textSecondary: '#a7afc3',
    textDisabled: '#72798b',
    primaryMain: '#4f86f7',
    primaryLight: '#6ea0ff',
    primaryDark: '#3d73e0',
    hover: 'rgba(110, 160, 255, 0.12)'
  };

  return createTheme({
    palette: {
      mode,
      common: {
        black: '#000',
        white: '#fff'
      },
      ...paletteColor,
      primary: isDarkMode
        ? {
            ...paletteColor.primary,
            main: ytDark.primaryMain,
            light: ytDark.primaryLight,
            dark: ytDark.primaryDark
          }
        : paletteColor.primary,
      error: isDarkMode
        ? {
            ...paletteColor.error,
            main: '#ff8c42'
          }
        : paletteColor.error,
      text: {
        primary: isDarkMode ? ytDark.textPrimary : paletteColor.grey[700],
        secondary: isDarkMode ? ytDark.textSecondary : paletteColor.grey[500],
        disabled: isDarkMode ? ytDark.textDisabled : paletteColor.grey[400]
      },
      action: {
        hover: isDarkMode ? ytDark.hover : 'rgba(0, 0, 0, 0.04)',
        disabled: isDarkMode ? paletteColor.grey[700] : paletteColor.grey[300]
      },
      divider: isDarkMode ? ytDark.divider : paletteColor.grey[200],
      background: {
        paper: isDarkMode ? ytDark.bgPaper : paletteColor.grey[0],
        default: isDarkMode ? ytDark.bgDefault : paletteColor.grey.A50
      }
    }
  });
};

export default Palette;
