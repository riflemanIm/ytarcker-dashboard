import isEmpty from "@/helpers";
import { User, ViewMode } from "@/types/global";
import { Alert, Box, Stack } from "@mui/material";
import dayjs from "dayjs";
import { FC } from "react";
import AutocompleteUsers from "./AutocompleteUsers";
import FetchModeSwitch from "./FetchModeSwitch";
import ReportDateRange from "./ReportDateRange";
import SelectGroupList from "./SelectGroupList";
import SelectGroupPatientsList from "./SelectGroupPatientsList";
import SelectProjectList from "./SelectProjectList";
import SelectRoleList from "./SelectRoleList";
import SelectSprintList from "./SelectSprintList";
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
    ) : viewMode === "table_time_plan" ? (
      <Stack
        direction="row"
        gap={1}
        alignItems="center"
        flexWrap="wrap"
        sx={{ width: "100%", minWidth: 0 }}
      >
        <Box sx={{ flex: "1 1 160px", minWidth: 0 }}>
          <SelectSprintList />
        </Box>
        <Box sx={{ flex: "1 1 160px", minWidth: 0 }}>
          <SelectGroupList />
        </Box>
        <Box sx={{ flex: "1 0 210px", minWidth: 0 }}>
          <SelectGroupPatientsList />
        </Box>
        <Box sx={{ flex: "0 0 120px", minWidth: 0 }}>
          <SelectRoleList />
        </Box>
        <Box sx={{ flex: "0 0 120px", minWidth: 0 }}>
          <SelectProjectList />
        </Box>
      </Stack>
    ) : (
      <Box sx={{ width: "auto" }}></Box>
    );

  return (
    <Stack
      direction="row"
      spacing={2}
      alignItems="center"
      justifyContent="flex-start"
      flexWrap="nowrap"
      sx={{ overflowX: "auto", width: "100%", minWidth: 0, flex: "1 1 auto" }}
    >
      {showAdminControls && viewMode !== "table_time_plan" && (
        <Stack
          direction="row"
          spacing={2}
          alignItems="center"
          sx={{ flex: "0 0 auto" }}
        >
          <Box>
            <FetchModeSwitch
              fetchByLogin={fetchByLogin}
              login={login ?? ""}
              onToggle={onToggleFetchMode}
              disabled={!loaded}
            />
          </Box>

          {isEmpty(users) && !fetchByLogin ? (
            <Alert severity="info" sx={{ flex: 1, minWidth: 260 }}>
              Нет сотрудников за этот период
            </Alert>
          ) : (
            <Box sx={{ flex: "1 1 260px", minWidth: 260 }}>
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

      {showRange && rangeFilters && (
        <Box
          sx={{
            flex: "1 1 auto",
            width: "100%",
            minWidth: 0,
          }}
        >
          {rangeFilters}
        </Box>
      )}
    </Stack>
  );
};

export default HeaderFilters;
