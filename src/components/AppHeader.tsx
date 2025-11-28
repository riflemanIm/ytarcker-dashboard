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
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
          alignItems={{ xs: "flex-start", sm: "center" }}
          justifyContent="flex-start"
          flexWrap="wrap"
          sx={{ minWidth: 220 }}
        >
          {showAdminControls && (
            <Box sx={{ alignSelf: { xs: "flex-start", sm: "center" } }}>
              <ToggleViewButton
                viewMode={viewMode}
                onChange={onViewModeChange}
              />
            </Box>
          )}

          {showRange && (
            <Box
              sx={{
                flex: 1,
                width: { xs: "100%", sm: "auto" },
                minWidth: { xs: "100%", sm: 260 },
              }}
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
            direction="row"
            spacing={2}
            alignItems="center"
            flexWrap="nowrap"
            sx={{
              width: "100%",
              minWidth: fetchByLogin ? 220 : undefined,
              overflow: "auto",
            }}
          >
            <Box sx={{ flexShrink: 0 }}>
              <FetchModeSwitch
                fetchByLogin={fetchByLogin}
                login={login ?? ""}
                onToggle={onToggleFetchMode}
                disabled={!loaded}
              />
            </Box>
            {isEmpty(users) && !fetchByLogin ? (
              <Alert severity="info" sx={{ flex: 1, minWidth: 160 }}>
                Нет сотрудников за этот период
              </Alert>
            ) : (
              <Box
                sx={{
                  flex: 1,
                  minWidth: 160,
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
