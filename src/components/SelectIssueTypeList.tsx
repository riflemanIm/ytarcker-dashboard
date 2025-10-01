import { IssueType } from "@/types/global";
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

interface SelectIssueTypeListProps {
  issueTypes: IssueType[];
  handleIssueTypeChange: (label: string) => void;
  selectedIssueTypeLabel?: string | null;
  variant?: "standard" | "outlined" | "filled";
  margin?: "none" | "dense" | "normal";
  required?: boolean;
  error?: boolean;
  helperText?: string;
  loading?: boolean; // NEW
}

const SelectIssueTypeList: React.FC<SelectIssueTypeListProps> = ({
  issueTypes,
  handleIssueTypeChange,
  selectedIssueTypeLabel = "",
  variant = "outlined",
  margin = "normal",
  required = false,
  error = false,
  helperText,
  loading = false, // NEW
}) => {
  const handleChange = (e: SelectChangeEvent<string>) => {
    handleIssueTypeChange(e.target.value);
  };

  const disabled = loading || !issueTypes || issueTypes.length === 0;

  return (
    <FormControl
      fullWidth
      variant={variant}
      margin={margin}
      required={required}
      error={error}
      disabled={disabled}
    >
      <InputLabel id="select-issue-type-label">Тип работы</InputLabel>

      <Select
        labelId="select-issue-type-label"
        id="select-issue-type"
        value={selectedIssueTypeLabel ?? ""}
        label="Тип работы"
        onChange={handleChange}
        sx={{ width: "auto" }}
      >
        {(issueTypes ?? []).map((item) => (
          <MenuItem key={item.label} value={item.label}>
            <Box sx={{ maxWidth: 380 }}>
              <Typography variant="body1" whiteSpace="wrap">
                {item.label}
              </Typography>
              {item.hint && item.hint !== item.label && (
                <Typography variant="body2" whiteSpace="wrap" color="secondary">
                  {item.hint}
                </Typography>
              )}
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

export default SelectIssueTypeList;
