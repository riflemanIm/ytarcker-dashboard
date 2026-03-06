import { alpha } from '@mui/material/styles';

// ==============================|| OVERRIDES - AUTOCOMPLETE ||============================== //

export default function Autocomplete(theme) {
  if (theme.palette.mode !== 'dark') {
    return {
      MuiAutocomplete: {
        styleOverrides: {}
      }
    };
  }

  const thumb = alpha(theme.palette.grey[500], 0.45);
  const thumbHover = alpha(theme.palette.grey[400], 0.6);
  const track = alpha(theme.palette.common.white, 0.06);

  return {
    MuiAutocomplete: {
      styleOverrides: {
        listbox: {
          scrollbarWidth: 'thin',
          scrollbarColor: `${thumb} ${track}`,
          '&::-webkit-scrollbar': {
            width: 8,
            height: 8
          },
          '&::-webkit-scrollbar-track': {
            backgroundColor: track,
            borderRadius: 8
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: thumb,
            borderRadius: 8,
            border: `2px solid ${track}`
          },
          '&::-webkit-scrollbar-thumb:hover': {
            backgroundColor: thumbHover
          }
        }
      }
    }
  };
}
