// ==============================|| OVERRIDES - ListItemButton ||============================== //

export default function ListItemButton() {
  return {
    MuiListItemButton: {
      styleOverrides: {
        root: {
          color: '#5FBB7D',
          '&.Mui-selected': {
            color: '#5FBB7D',
            backgroundColor: '#F0F3F3'
          }
        }
      }
    }
  };
}
