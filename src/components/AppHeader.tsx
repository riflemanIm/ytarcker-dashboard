import { useAppContext } from "@/context/AppContext";
import { ViewMode } from "@/types/global";
import RefreshIcon from "@mui/icons-material/Refresh";
import { Box, IconButton, Paper, Stack, useTheme } from "@mui/material";
import { FC } from "react";
import HeaderFilters, {
  ReportRangeProps,
  WeekNavigationProps,
} from "./HeaderFilters";
import LogInOut from "./LogInOut";
import ToggleViewButton from "./ToggleViewButton";

interface AppHeaderProps {
  isSuperUser: boolean;
  showAdminControls: boolean;
  dataTimeSpendLoading: boolean;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  weekNavigation: WeekNavigationProps;
  reportRange: ReportRangeProps;
  showRangeControls: boolean;
  onToggleShowAdminControls: () => void;
  onRefresh: () => void;
  showRefresh: boolean;
}

const AppHeader: FC<AppHeaderProps> = ({
  isSuperUser,
  showAdminControls,
  dataTimeSpendLoading,
  viewMode,
  onViewModeChange,
  weekNavigation,
  reportRange,
  showRangeControls,
  onToggleShowAdminControls,
  onRefresh,
  showRefresh,
}) => {
  const { state } = useAppContext();
  const { token, login } = state.auth;
  const canShowAdminControls = !!token && !dataTimeSpendLoading && !!isSuperUser;
  const showRange = !!token && !dataTimeSpendLoading && showRangeControls;
  const theme = useTheme();

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
        <Box sx={{ minWidth: 200, mr: "auto", display: "flex" }}>
          <ToggleViewButton
            showAdminControls={canShowAdminControls && showAdminControls}
            viewMode={viewMode}
            onChange={onViewModeChange}
          />
        </Box>

        <HeaderFilters
          isSuperUser={canShowAdminControls}
          showAdminControls={showAdminControls}
          showRange={showRange}
          viewMode={viewMode}
          weekNavigation={weekNavigation}
          reportRange={reportRange}
          login={login}
          onToggleShowAdminControls={onToggleShowAdminControls}
          dataTimeSpendLoading={dataTimeSpendLoading}
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
