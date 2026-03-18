import { useAppContext } from "@/context/AppContext";
import { ViewMode } from "@/types/global";
import RefreshIcon from "@mui/icons-material/Refresh";
import {
  Box,
  IconButton,
  PaletteMode,
  Paper,
  Stack,
  useTheme,
} from "@mui/material";
import { FC } from "react";
import AutocompleteGroupPatientsList from "./AutocompleteGroupPatientsList";
import FetchModeSwitch from "./FetchModeSwitch";
import HeaderFilters, {
  ReportRangeProps,
  WeekNavigationProps,
} from "./HeaderFilters";
import LogInOut, { handleLogout } from "./LogInOut";
import SyncChecklistDataPlanDialog from "./SyncChecklistDataPlanDialog";
import ToggleViewButton from "./ToggleViewButton";

interface AppHeaderProps {
  weekNavigation: WeekNavigationProps;
  reportRange: ReportRangeProps;
  onRefresh: () => void;
}

const AppHeader: FC<AppHeaderProps> = ({
  weekNavigation,
  reportRange,
  onRefresh,
}) => {
  const { state: appState, dispatch } = useAppContext();
  const { auth, state, viewMode, paletteMode, useSystemTheme } = appState;
  const { token, login } = auth;
  const { isAdmin, showAdminControls, dataTimeSpendLoading, planEditMode } =
    state;
  const showRange = !!token && !dataTimeSpendLoading && viewMode !== "search";
  const showRefresh = viewMode !== "search";
  const theme = useTheme();
  const isLoading = dataTimeSpendLoading;

  const handleViewModeChange = (mode: ViewMode) => {
    dispatch({ type: "setViewMode", payload: mode });
  };
  const handlePaletteModeChange = (mode: PaletteMode) => {
    dispatch({ type: "setPaletteMode", payload: mode });
  };
  const handleSystemThemeChange = (enabled: boolean) => {
    dispatch({ type: "setUseSystemTheme", payload: enabled });
    if (!enabled || typeof window === "undefined") return;
    const systemMode: PaletteMode = window.matchMedia(
      "(prefers-color-scheme: dark)",
    ).matches
      ? "dark"
      : "light";
    dispatch({ type: "setPaletteMode", payload: systemMode });
  };

  const handleToggleShowAdminControls = () => {
    dispatch({
      type: "setState",
      payload: (prev) => ({
        ...prev,
        showAdminControls: !prev.showAdminControls,
        dataTimeSpend: [],
      }),
    });
  };

  return (
    <Paper
      elevation={2}
      sx={{
        p: { xs: 1, sm: 2 },
        borderRadius: 3,
        backgroundImage:
          theme.palette.mode === "light"
            ? `linear-gradient(135deg, ${theme.palette.grey[50]}, ${theme.palette.primary.light}33)`
            : `linear-gradient(135deg, ${theme.palette.background.paper}, ${theme.palette.grey[900]})`,
        border: `1px solid ${theme.palette.divider}`,
        boxShadow:
          theme.palette.mode === "light"
            ? "0px 10px 25px rgba(15, 23, 42, 0.08)"
            : theme.shadows[3],
      }}
    >
      <Stack
        direction="row"
        spacing={1}
        alignItems="center"
        flexWrap="nowrap"
        sx={{
          width: "100%",
          minWidth: 0,
          gap: { xs: 2, sm: 2, md: 0 },
          flexWrap: { xs: "wrap", sm: "wrap", md: "nowrap" },
        }}
      >
        <Box
          sx={{
            minWidth: 200,
          }}
        >
          <ToggleViewButton
            isAdmin={!!isAdmin}
            planEditMode={!!planEditMode}
            viewMode={viewMode}
            onChange={handleViewModeChange}
            login={login}
            showLogout={!!token}
            onLogout={handleLogout}
            paletteMode={paletteMode}
            onTogglePaletteMode={handlePaletteModeChange}
            useSystemTheme={useSystemTheme}
            onToggleUseSystemTheme={handleSystemThemeChange}
          />
        </Box>

        {isAdmin && (
          <Box>
            <FetchModeSwitch
              showAdminControls={showAdminControls}
              onToggle={handleToggleShowAdminControls}
              disabled={isLoading}
            />
          </Box>
        )}
        {showAdminControls && viewMode !== "table_time_plan" && (
          <Box
            sx={{
              minWidth: 250,
              pr: 1,
            }}
          >
            <AutocompleteGroupPatientsList />
          </Box>
        )}
        <HeaderFilters
          showAdminControls={showAdminControls}
          showRange={showRange}
          viewMode={viewMode}
          weekNavigation={weekNavigation}
          reportRange={reportRange}
        />

        <Stack
          direction={{ xs: "row-reverse", md: "row" }}
          spacing={2}
          alignItems="center"
          justifyContent={{ xs: "space-between", md: "flex-end" }}
          sx={{
            width: "auto",
            minWidth: 280,
          }}
        >
          <Box sx={{ display: "flex", justifyContent: "flex-end", flex: 1 }}>
            <LogInOut />
          </Box>
          {showAdminControls &&
            viewMode === "table_time_plan" &&
            !dataTimeSpendLoading && (
              <Box sx={{ flex: "1 1 0", minWidth: 0 }}>
                <SyncChecklistDataPlanDialog onRefresh={onRefresh} />
              </Box>
            )}
          {showRefresh && !!token && !dataTimeSpendLoading && (
            <IconButton
              onClick={onRefresh}
              sx={{
                borderRadius: "50%",
                width: 56,
                height: 56,
                color: theme.palette.background.default,
                background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.light})`,
                boxShadow: "0px 8px 18px rgba(25, 118, 210, 0.25)",
                transition: "transform 0.2s ease, box-shadow 0.2s ease",
                "&:hover": {
                  transform: "translateY(-2px)",
                  boxShadow: "0px 12px 24px rgba(25, 118, 210, 0.35)",
                  background: `linear-gradient(135deg, ${theme.palette.primary.dark}, ${theme.palette.primary.main})`,
                },
              }}
            >
              <RefreshIcon />
            </IconButton>
          )}
        </Stack>
      </Stack>
    </Paper>
  );
};

export default AppHeader;
