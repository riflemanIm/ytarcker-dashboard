import { TlGroupPatient } from "@/types/global";
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
import React from "react";

interface SelectGroupPatientsListProps {
  patients: TlGroupPatient[];
  handlePatientChange: (patientUid: string) => void;
  selectedPatientUid?: string | null;
  variant?: "standard" | "outlined" | "filled";
  margin?: "none" | "dense" | "normal";
  required?: boolean;
  error?: boolean;
  helperText?: string;
  loading?: boolean;
}

const SelectGroupPatientsList: React.FC<SelectGroupPatientsListProps> = ({
  patients,
  handlePatientChange,
  selectedPatientUid = "",
  variant = "outlined",
  margin = "normal",
  required = false,
  error = false,
  helperText,
  loading = false,
}) => {
  const handleChange = (e: SelectChangeEvent<string>) => {
    handlePatientChange(e.target.value);
  };

  const disabled = loading || !patients || patients.length === 0;

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
        {(patients ?? []).map((item) => (
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

      {loading ? (
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
