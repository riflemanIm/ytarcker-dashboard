import { ViewMode } from "@/types/global";
import { Box, Stack } from "@mui/material";
import dayjs from "dayjs";
import { FC } from "react";
import AutocompleteGroupList from "./AutocompleteGroupList";
import AutocompleteGroupPatientsList from "./AutocompleteGroupPatientsList";
import AutocompleteProjectList from "./AutocompleteProjectList";
import AutocompleteRoleList from "./AutocompleteRoleList";
import FetchModeSwitch from "./FetchModeSwitch";
import ReportDateRange from "./ReportDateRange";
import SelectSprintList from "./SelectSprintList";
import SyncChecklistDataPlanDialog from "./SyncChecklistDataPlanDialog";
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
  isSuperUser: boolean;
  showAdminControls: boolean;
  showRange: boolean;
  viewMode: ViewMode;
  weekNavigation: WeekNavigationProps;
  reportRange: ReportRangeProps;
  login: string | null | undefined;
  onToggleShowAdminControls: () => void;
  dataTimeSpendLoading: boolean;
  onRefresh: () => void | Promise<void>;
}

const HeaderFilters: FC<HeaderFiltersProps> = ({
  isSuperUser,
  showAdminControls,
  showRange,
  viewMode,
  weekNavigation,
  reportRange,
  login,
  onToggleShowAdminControls,
  dataTimeSpendLoading,
  onRefresh,
}) => {
  const isLoading = dataTimeSpendLoading;
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
        {showAdminControls && (
          <Box sx={{ flex: "1 1 160px", minWidth: 0 }}>
            <AutocompleteGroupList />
          </Box>
        )}
        {showAdminControls && (
          <Box sx={{ flex: "1 0 210px", minWidth: 0 }}>
            <AutocompleteGroupPatientsList />
          </Box>
        )}
        {showAdminControls && (
          <Box sx={{ flex: "0 0 220px", minWidth: 0 }}>
            <AutocompleteRoleList />
          </Box>
        )}
        {showAdminControls && (
          <Box sx={{ flex: "0 0 260px", minWidth: 0 }}>
            <AutocompleteProjectList />
          </Box>
        )}
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
      {isSuperUser && (
        <Stack alignItems="center" sx={{ flex: "0 0 auto" }}>
          <Box sx={{ flex: "1 1 40px", minWidth: 40 }}>
            <FetchModeSwitch
              showAdminControls={showAdminControls}
              login={login ?? ""}
              onToggle={onToggleShowAdminControls}
              disabled={isLoading}
            />
          </Box>

          {showAdminControls && viewMode !== "table_time_plan" && (
            <Box sx={{ flex: "1 1 260px", minWidth: 260 }}>
              <AutocompleteGroupPatientsList />
            </Box>
          )}

          {showAdminControls &&
            viewMode === "table_time_plan" &&
            !dataTimeSpendLoading && (
              <Box sx={{ flex: "1 1 0", minWidth: 0 }}>
                <SyncChecklistDataPlanDialog onRefresh={onRefresh} />
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
