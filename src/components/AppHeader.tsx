import RefreshIcon from "@mui/icons-material/Refresh";
import { Box, IconButton, Paper, Stack, useMediaQuery, useTheme } from "@mui/material";
import { FC } from "react";
import { AuthState, User, ViewMode } from "@/types/global";
import HeaderFilters, {
  ReportRangeProps,
  WeekNavigationProps,
} from "./HeaderFilters";
import LogInOut from "./LogInOut";

interface AppHeaderProps {
  token: string | null;
  login: string | null | undefined;
  isSuperUser: boolean;
  loaded: boolean;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  weekNavigation: WeekNavigationProps;
  reportRange: ReportRangeProps;
  showRangeControls: boolean;
  fetchByLogin: boolean;
  onToggleFetchMode: () => void;
  users: User[] | null;
  userId: string | null;
  handleSelectedUsersChange: (userId: string | null) => void;
  onRefresh: () => void;
  showRefresh: boolean;
  setAuth: React.Dispatch<React.SetStateAction<AuthState>>;
}

const AppHeader: FC<AppHeaderProps> = ({
  token,
  login,
  isSuperUser,
  loaded,
  viewMode,
  onViewModeChange,
  weekNavigation,
  reportRange,
  showRangeControls,
  fetchByLogin,
  onToggleFetchMode,
  users,
  userId,
  handleSelectedUsersChange,
  onRefresh,
  showRefresh,
  setAuth,
}) => {
  const showControls = !!token && loaded;
  const showAdminControls = showControls && !!isSuperUser;
  const showRange = showControls && showRangeControls;
  const showUserSelection = showAdminControls && showRangeControls;
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  return (
    <Paper
      elevation={2}
      sx={{
        p: { xs: 2, md: 3 },
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
      <Box
        sx={(theme) => ({
          display: "grid",
          gap: theme.spacing(isMobile ? 2 : 3),
          gridTemplateColumns: {
            xs: "1fr",
            md: showUserSelection
              ? "auto minmax(280px, 1fr) auto"
              : "auto auto",
          },
          alignItems: "center",
        })}
      >
        <HeaderFilters
          showAdminControls={showAdminControls}
          showRange={showRange}
          showUserSelection={showUserSelection}
          viewMode={viewMode}
          weekNavigation={weekNavigation}
          reportRange={reportRange}
          onViewModeChange={onViewModeChange}
          fetchByLogin={fetchByLogin}
          login={login}
          onToggleFetchMode={onToggleFetchMode}
          loaded={loaded}
          users={users}
          userId={userId}
          handleSelectedUsersChange={handleSelectedUsersChange}
        />

        <Stack
          direction={{ xs: "row-reverse", md: "row" }}
          spacing={2}
          alignItems="center"
          justifyContent={{ xs: "space-between", md: "flex-end" }}
          sx={{
            width: "100%",
            minWidth: { xs: "100%", md: 220 },
          }}
        >
          <Box sx={{ display: "flex", justifyContent: "flex-end", flex: 1 }}>
            <LogInOut token={token} setAuth={setAuth} />
          </Box>
          {showRefresh && showControls && (
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
      </Box>
    </Paper>
  );
};

export default AppHeader;
