import { Alert, Box, Stack } from "@mui/material";
import dayjs from "dayjs";
import { FC } from "react";
import isEmpty from "@/helpers";
import { User, ViewMode } from "@/types/global";
import AutocompleteUsers from "./AutocompleteUsers";
import FetchModeSwitch from "./FetchModeSwitch";
import ReportDateRange from "./ReportDateRange";
import ToggleViewButton from "./ToggleViewButton";
import WeekNavigator from "./WeekNavigator";

export interface WeekNavigationProps {
  start: dayjs.Dayjs;
  end: dayjs.Dayjs;
  onPrevious: () => void;
  onNext: () => void;
  disableNext: boolean;
}

export interface ReportRangeProps {
  from: dayjs.Dayjs;
  to: dayjs.Dayjs;
  onPrevMonth: () => void;
  onThisMonth: () => void;
  onNextMonth: () => void;
}

interface HeaderFiltersProps {
  showAdminControls: boolean;
  showRange: boolean;
  showUserSelection: boolean;
  viewMode: ViewMode;
  weekNavigation: WeekNavigationProps;
  reportRange: ReportRangeProps;
  onViewModeChange: (mode: ViewMode) => void;
  fetchByLogin: boolean;
  login: string | null | undefined;
  onToggleFetchMode: () => void;
  loaded: boolean;
  users: User[] | null;
  userId: string | null;
  handleSelectedUsersChange: (userId: string | null) => void;
}

const HeaderFilters: FC<HeaderFiltersProps> = ({
  showAdminControls,
  showRange,
  showUserSelection,
  viewMode,
  weekNavigation,
  reportRange,
  onViewModeChange,
  fetchByLogin,
  login,
  onToggleFetchMode,
  loaded,
  users,
  userId,
  handleSelectedUsersChange,
}) => {
  const rangeFilters =
    viewMode === "table_time_spend" ? (
      <WeekNavigator
        start={weekNavigation.start}
        end={weekNavigation.end}
        onPrevious={weekNavigation.onPrevious}
        onNext={weekNavigation.onNext}
        disableNext={weekNavigation.disableNext}
      />
    ) : viewMode === "report" ? (
      <ReportDateRange
        from={reportRange.from}
        to={reportRange.to}
        onPrevMonth={reportRange.onPrevMonth}
        onThisMonth={reportRange.onThisMonth}
        onNextMonth={reportRange.onNextMonth}
      />
    ) : null;

  return (
    <Stack
      direction="row"
      spacing={2}
      alignItems="center"
      justifyContent="flex-start"
      flexWrap={{ xs: "nowrap", sm: "wrap" }}
    >
      {showAdminControls && (
        <Stack direction="row" spacing={2} alignItems="center">
          <Box>
            <ToggleViewButton viewMode={viewMode} onChange={onViewModeChange} />
          </Box>

          {showUserSelection && (
            <>
              <Box>
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
                <Box sx={{ flex: 1, minWidth: 160 }}>
                  <AutocompleteUsers
                    userId={userId}
                    handleSelectedUsersChange={handleSelectedUsersChange}
                    users={users}
                    disabled={!loaded || fetchByLogin}
                  />
                </Box>
              )}
            </>
          )}
        </Stack>
      )}

      {showRange && rangeFilters && (
        <Box
          sx={{
            flex: 1,
            width: { xs: "100%", sm: "auto" },
            minWidth: { xs: "100%", sm: 260 },
          }}
        >
          {rangeFilters}
        </Box>
      )}
    </Stack>
  );
};

export default HeaderFilters;
