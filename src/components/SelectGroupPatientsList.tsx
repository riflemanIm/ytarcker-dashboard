import { getTlGroupPatients } from "@/actions/data";
import { useAppContext } from "@/context/AppContext";
import {
  Box,
  CircularProgress,
  FormControl,
  FormHelperText,
  InputLabel,
  MenuItem,
  Select,
  SelectChangeEvent,
  Stack,
  Typography,
} from "@mui/material";
import React, { useEffect, useMemo, useRef } from "react";

interface SelectGroupPatientsListProps {
  variant?: "standard" | "outlined" | "filled";
  margin?: "none" | "dense" | "normal";
  required?: boolean;
  error?: boolean;
  helperText?: string;
}

const SelectGroupPatientsList: React.FC<SelectGroupPatientsListProps> = ({
  variant = "outlined",
  margin = "normal",
  required = false,
  error = false,
  helperText,
}) => {
  const { tableTimePlanState, setTableTimePlanState } = useAppContext();
  const {
    groupPatients,
    loadingPatients,
    selectedGroupIds,
    selectedPatientUid,
  } = tableTimePlanState;
  const lastGroupKeyRef = useRef<string>("");

  const groupIds = useMemo(
    () =>
      selectedGroupIds
        .map((id) => Number(id))
        .filter((id) => Number.isFinite(id)),
    [selectedGroupIds]
  );

  useEffect(() => {
    let isMounted = true;

    if (groupIds.length === 0) {
      lastGroupKeyRef.current = "";
      setTableTimePlanState((prev) => ({
        ...prev,
        groupPatients: [],
        loadingPatients: false,
        selectedPatientUid: "",
      }));
      return;
    }

    const groupKey = groupIds.join(",");
    if (groupKey === lastGroupKeyRef.current) return;
    lastGroupKeyRef.current = groupKey;
    setTableTimePlanState((prev) => ({ ...prev, loadingPatients: true }));
    getTlGroupPatients(groupIds)
      .then((data) => {
        if (!isMounted) return;
        const sorted = [...data].sort(
          (a, b) => (a.sort_by ?? 0) - (b.sort_by ?? 0),
        );
        setTableTimePlanState((prev) => {
          const nextSelected = sorted.some(
            (item) => item.trackerUid === prev.selectedPatientUid,
          )
            ? prev.selectedPatientUid
            : "";
          return {
            ...prev,
            groupPatients: sorted,
            loadingPatients: false,
            selectedPatientUid: nextSelected,
          };
        });
      })
      .catch((error) => {
        console.error(
          "[SelectGroupPatientsList] getTlGroupPatients error:",
          error.message,
        );
        if (!isMounted) return;
        lastGroupKeyRef.current = "";
      })
      .finally(() => {
        setTableTimePlanState((prev) => ({ ...prev, loadingPatients: false }));
      });

    return () => {
      isMounted = false;
    };
  }, [groupIds, setTableTimePlanState]);

  const handleChange = (e: SelectChangeEvent<string>) => {
    const patientUid = e.target.value;
    setTableTimePlanState((prev) => ({
      ...prev,
      selectedPatientUid: patientUid,
    }));
  };

  const disabled =
    loadingPatients || !groupPatients || groupPatients.length === 0;

  return (
    <FormControl
      fullWidth
      variant={variant}
      margin={margin}
      required={required}
      error={error}
      disabled={disabled}
    >
      <InputLabel id="select-patient-label">Сотрудник</InputLabel>

      <Select
        labelId="select-patient-label"
        id="select-patient"
        value={selectedPatientUid ?? ""}
        label="Сотрудник"
        onChange={handleChange}
        sx={{ width: "auto" }}
      >
        {(groupPatients ?? []).map((item) => (
          <MenuItem key={item.trackerUid} value={item.trackerUid}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.5,
              }}
            >
              <Box
                sx={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  bgcolor: item.color_str || "transparent",
                  border: "1px solid rgba(0,0,0,0.2)",
                }}
              />
              <Typography variant="body1" whiteSpace="wrap">
                {item.patients_fio}
              </Typography>
            </Box>
          </MenuItem>
        ))}
      </Select>

      {loadingPatients ? (
        <FormHelperText>
          <Stack direction="row" spacing={1} alignItems="center">
            <CircularProgress size={16} />
          </Stack>
        </FormHelperText>
      ) : helperText ? (
        <FormHelperText>{helperText}</FormHelperText>
      ) : null}
    </FormControl>
  );
};

export default SelectGroupPatientsList;
