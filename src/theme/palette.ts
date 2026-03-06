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
  const ytLight = {
    bgDefault: '#f3f4f6',
    bgPaper: '#ffffff',
    divider: '#e2e5ea',
    textPrimary: '#252a34',
    textSecondary: '#5d6678',
    textDisabled: '#98a1b2',
    primaryMain: '#3f7ae0',
    primaryLight: '#5d93ef',
    primaryDark: '#2f65c2',
    hover: 'rgba(63, 122, 224, 0.08)'
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
        : {
            ...paletteColor.primary,
            main: ytLight.primaryMain,
            light: ytLight.primaryLight,
            dark: ytLight.primaryDark
          },
      error: isDarkMode
        ? {
            ...paletteColor.error,
            main: '#ff8c42'
          }
        : paletteColor.error,
      text: {
        primary: isDarkMode ? ytDark.textPrimary : ytLight.textPrimary,
        secondary: isDarkMode ? ytDark.textSecondary : ytLight.textSecondary,
        disabled: isDarkMode ? ytDark.textDisabled : ytLight.textDisabled
      },
      action: {
        hover: isDarkMode ? ytDark.hover : ytLight.hover,
        disabled: isDarkMode ? paletteColor.grey[700] : paletteColor.grey[300]
      },
      divider: isDarkMode ? ytDark.divider : ytLight.divider,
      background: {
        paper: isDarkMode ? ytDark.bgPaper : ytLight.bgPaper,
        default: isDarkMode ? ytDark.bgDefault : ytLight.bgDefault
      }
    }
  });
};

export default Palette;
