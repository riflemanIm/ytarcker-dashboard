import { getTlGroupPatients } from "@/actions/data";
import { useAppContext } from "@/context/AppContext";
import {
  Box,
  CircularProgress,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import Autocomplete from "@mui/material/Autocomplete";
import ClearIcon from "@mui/icons-material/Clear";
import React, { useEffect, useMemo } from "react";
import isEmpty from "../helpers";
import { TlGroupPatient } from "@/types/global";

interface AutocompleteGroupPatientsListProps {
  variant?: "standard" | "outlined" | "filled";
  margin?: "none" | "dense" | "normal";
  required?: boolean;
  error?: boolean;
  helperText?: string;
}

const AutocompleteGroupPatientsList: React.FC<
  AutocompleteGroupPatientsListProps
> = ({
  variant = "outlined",
  margin = "normal",
  required = false,
  error = false,
  helperText,
}) => {
  const { state: appState, dispatch } = useAppContext();
  const {
    groupPatients,
    loadingPatients,
    selectedGroupIds,
    selectedPatientUid,
    groupPatientsKey,
  } = appState.tableTimePlanState;
  const groupIds = useMemo(
    () =>
      selectedGroupIds
        .map((id) => Number(id))
        .filter((id) => Number.isFinite(id)),
    [selectedGroupIds],
  );

  useEffect(() => {
    let isMounted = true;

    const groupKey = groupIds.join(",");
    if (groupIds.length === 0) {
      if (
        groupPatients.length !== 0 ||
        groupPatientsKey !== "" ||
        selectedPatientUid !== ""
      ) {
        dispatch({
          type: "setTableTimePlanState",
          payload: (prev) => ({
            ...prev,
            groupPatients: [],
            groupPatientsKey: "",
            selectedPatientUid: "",
            loadingPatients: false,
          }),
        });
      }
      return () => {
        isMounted = false;
      };
    }

    if (groupKey === groupPatientsKey && groupPatients.length > 0) {
      return () => {
        isMounted = false;
      };
    }
    dispatch({
      type: "setTableTimePlanState",
      payload: (prev) => ({ ...prev, loadingPatients: true }),
    });
    getTlGroupPatients(groupIds)
      .then((data) => {
        if (!isMounted) return;
        const sorted = [...data].sort(
          (a, b) => (a.sort_by ?? 0) - (b.sort_by ?? 0),
        );
        dispatch({
          type: "setTableTimePlanState",
          payload: (prev) => {
            const nextSelected = sorted.some(
              (item) => item.trackerUid === prev.selectedPatientUid,
            )
              ? prev.selectedPatientUid
              : "";
            return {
              ...prev,
              groupPatients: sorted,
              loadingPatients: false,
              groupPatientsKey: groupKey,
              selectedPatientUid: nextSelected,
            };
          },
        });
      })
      .catch((error) => {
        console.error(
          "[AutocompleteGroupPatientsList] getTlGroupPatients error:",
          error.message,
        );
        if (!isMounted) return;
        dispatch({
          type: "setTableTimePlanState",
          payload: (prev) => ({ ...prev, groupPatientsKey: "" }),
        });
      })
      .finally(() => {
        dispatch({
          type: "setTableTimePlanState",
          payload: (prev) => ({ ...prev, loadingPatients: false }),
        });
      });

    return () => {
      isMounted = false;
    };
  }, [
    dispatch,
    groupIds,
    groupPatientsKey,
    groupPatients.length,
    selectedPatientUid,
  ]);

  const handleChange = (
    event: React.SyntheticEvent,
    value: TlGroupPatient | null,
  ) => {
    dispatch({
      type: "setTableTimePlanState",
      payload: (prev) => ({
        ...prev,
        selectedPatientUid: value?.trackerUid ?? "",
      }),
    });
  };

  const disabled = loadingPatients || isEmpty(groupPatients);

  const options = (groupPatients || []).map((item) => item);
  const value =
    (groupPatients || []).find(
      (item) => selectedPatientUid && item.trackerUid === selectedPatientUid,
    ) || null;

  return (
    <Autocomplete
      blurOnSelect
      clearOnBlur
      autoSelect
      clearIcon={<ClearIcon fontSize="small" />}
      disabled={disabled}
      value={value}
      options={options}
      onChange={handleChange}
      getOptionLabel={(option: TlGroupPatient) => option?.patients_fio || ""}
      isOptionEqualToValue={(option: TlGroupPatient, value: TlGroupPatient) =>
        option.trackerUid === value.trackerUid
      }
      renderOption={(props, option: TlGroupPatient) => (
        <Box
          component="li"
          {...props}
          sx={{ display: "flex", alignItems: "center", gap: 1.5 }}
        >
          <Typography variant="body1" whiteSpace="wrap">
            {option.patients_fio}
          </Typography>
        </Box>
      )}
      noOptionsText={"Введите имя сотрудника"}
      renderInput={(params) => (
        <TextField
          {...params}
          name="filter-patients"
          margin={margin}
          label={"Сотрудник"}
          fullWidth
          variant={variant}
          required={required}
          error={error}
          helperText={
            loadingPatients ? (
              <Stack direction="row" spacing={1} alignItems="center">
                <CircularProgress size={16} />
              </Stack>
            ) : (
              helperText
            )
          }
        />
      )}
    />
  );
};

export default AutocompleteGroupPatientsList;
