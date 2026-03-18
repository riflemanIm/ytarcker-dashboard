import { ReactNode, useEffect, useMemo } from 'react';

// material-ui
import { Components, CssBaseline, PaletteMode, StyledEngineProvider, ThemeOptions, ThemeProvider, createTheme } from '@mui/material';
import { useAppContext } from '@/context/AppContext';

// project import
import componentsOverride from './overrides';
import Palette from './palette';
import CustomShadows from './shadows';
import Typography from './typography';

// ==============================|| DEFAULT THEME - MAIN  ||============================== //

export default function ThemeCustomization(props: { children: ReactNode }) {
  const {
    state: { paletteMode, useSystemTheme },
    dispatch
  } = useAppContext();

  useEffect(() => {
    if (!useSystemTheme || typeof window === 'undefined') return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const resolveMode = (matches: boolean): PaletteMode => (matches ? 'dark' : 'light');
    const syncMode = (matches: boolean) => {
      dispatch({ type: 'setPaletteMode', payload: resolveMode(matches) });
    };

    syncMode(mediaQuery.matches);

    const listener = (event: MediaQueryListEvent) => syncMode(event.matches);
    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
    }

    mediaQuery.addListener(listener);
    return () => mediaQuery.removeListener(listener);
  }, [dispatch, useSystemTheme]);

  const theme = useMemo(() => Palette(paletteMode), [paletteMode]);

  const themeTypography = Typography(`'Public Sans', sans-serif`);
  const themeCustomShadows = useMemo(() => CustomShadows(theme), [theme]);

  const themeOptions = useMemo(
    () => ({
      breakpoints: {
        values: {
          xs: 0,
          sm: 768,
          md: 1024,
          lg: 1266,
          xl: 1440
        }
      },
      direction: 'ltr',
      mixins: {
        toolbar: {
          minHeight: 60,
          paddingTop: 8,
          paddingBottom: 8
        }
      },
      palette: theme.palette,
      customShadows: themeCustomShadows,
      typography: themeTypography
    }),
    [theme, themeTypography, themeCustomShadows]
  );

  const themes = createTheme(themeOptions as unknown as ThemeOptions);
  themes.components = componentsOverride(themes) as Components;

  return (
    <>
      <StyledEngineProvider injectFirst>
        <ThemeProvider theme={themes}>
          <CssBaseline />
          {props.children}
        </ThemeProvider>
      </StyledEngineProvider>
    </>
  );
}
