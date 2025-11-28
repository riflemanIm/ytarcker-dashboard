import RefreshIcon from "@mui/icons-material/Refresh";
import {
  Alert,
  Box,
  IconButton,
  Paper,
  Stack,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import dayjs from "dayjs";
import { FC } from "react";
import isEmpty from "@/helpers";
import { AuthState, User, ViewMode } from "@/types/global";
import AutocompleteUsers from "./AutocompleteUsers";
import FetchModeSwitch from "./FetchModeSwitch";
import LogInOut from "./LogInOut";
import ReportDateRange from "./ReportDateRange";
import ToggleViewButton from "./ToggleViewButton";
import WeekNavigator from "./WeekNavigator";

interface WeekNavigationProps {
  start: dayjs.Dayjs;
  end: dayjs.Dayjs;
  onPrevious: () => void;
  onNext: () => void;
  disableNext: boolean;
}

interface ReportRangeProps {
  from: dayjs.Dayjs;
  to: dayjs.Dayjs;
  onPrevMonth: () => void;
  onThisMonth: () => void;
  onNextMonth: () => void;
}

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
      <Stack spacing={isMobile ? 2 : 3}>
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={isMobile ? 2 : 3}
          alignItems={{ xs: "stretch", md: "center" }}
          justifyContent="space-between"
          flexWrap="wrap"
          sx={{ gap: isMobile ? 2 : 1.5 }}
        >
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={2}
            alignItems={{ xs: "stretch", md: "center" }}
            flexWrap="wrap"
            sx={{ flex: { xs: "1 1 100%", md: "1 1 0" }, minWidth: 220 }}
          >
            {showAdminControls && (
              <ToggleViewButton
                viewMode={viewMode}
                onChange={onViewModeChange}
              />
            )}

            {showRange && (
              <Box
                sx={{ flex: 1, minWidth: { xs: "100%", sm: 240, padding: 8 } }}
              >
                {viewMode === "table" ? (
                  <WeekNavigator
                    start={weekNavigation.start}
                    end={weekNavigation.end}
                    onPrevious={weekNavigation.onPrevious}
                    onNext={weekNavigation.onNext}
                    disableNext={weekNavigation.disableNext}
                  />
                ) : (
                  <ReportDateRange
                    from={reportRange.from}
                    to={reportRange.to}
                    onPrevMonth={reportRange.onPrevMonth}
                    onThisMonth={reportRange.onThisMonth}
                    onNextMonth={reportRange.onNextMonth}
                  />
                )}
              </Box>
            )}
          </Stack>

          {showUserSelection && (
            <Stack
              direction={{ xs: "column", md: "row" }}
              spacing={2}
              alignItems={{ xs: "stretch", md: "center" }}
              flexWrap="wrap"
              sx={{
                flex: { xs: "1 1 100%", md: "1 1 0" },
                minWidth: fetchByLogin ? 220 : undefined,
              }}
            >
              <FetchModeSwitch
                fetchByLogin={fetchByLogin}
                login={login ?? ""}
                onToggle={onToggleFetchMode}
                disabled={!loaded}
              />
              {isEmpty(users) && !fetchByLogin ? (
                <Alert severity="info" sx={{ flex: 1 }}>
                  Нет сотрудников за этот период
                </Alert>
              ) : (
                <Box
                  sx={{
                    flex: 1,
                    minWidth: fetchByLogin
                      ? { xs: "100%", sm: 160 }
                      : undefined,
                  }}
                >
                  <AutocompleteUsers
                    userId={userId}
                    handleSelectedUsersChange={handleSelectedUsersChange}
                    users={users}
                    disabled={!loaded || fetchByLogin}
                  />
                </Box>
              )}
            </Stack>
          )}

          <Stack
            direction={{ xs: "column-reverse", md: "row" }}
            spacing={2}
            alignItems={{ xs: "stretch", md: "center" }}
            justifyContent={{ xs: "flex-start", md: "flex-end" }}
            sx={{
              flex: { xs: "1 1 100%", md: "0 0 auto" },
              minWidth: { xs: "100%", md: 200 },
            }}
          >
            {showRefresh && showControls && (
              <IconButton
                onClick={onRefresh}
                sx={{
                  alignSelf: { xs: "flex-start", md: "center" },
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
            <Box sx={{ alignSelf: { xs: "flex-end", md: "center" } }}>
              <LogInOut token={token} setAuth={setAuth} />
            </Box>
          </Stack>
        </Stack>
      </Stack>
    </Paper>
  );
};

export default AppHeader;
