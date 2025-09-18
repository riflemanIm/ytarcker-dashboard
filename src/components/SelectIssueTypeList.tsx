import { IssueType } from "@/types/global";
import {
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  SelectChangeEvent,
  Typography,
} from "@mui/material";
import React from "react";

interface SelectIssueTypeListProps {
  selectedIssueTypeLabel: string | null;
  handleIssueTypeChange: (label: string) => void;
  issueTypes: IssueType[];
  variant?: "standard" | "outlined" | "filled";
  margin?: "none" | "dense" | "normal";
}

const SelectIssueTypeList: React.FC<SelectIssueTypeListProps> = ({
  selectedIssueTypeLabel = null,
  handleIssueTypeChange,
  issueTypes,
  variant = "outlined",
  margin = "normal",
}) => {
  const handleChange = (e: SelectChangeEvent<string>) => {
    handleIssueTypeChange(e.target.value);
  };

  const value = issueTypes.find(
    (item) => item.label === selectedIssueTypeLabel
  )?.label;

  if (!issueTypes || issueTypes.length === 0) {
    return null;
  }

  return (
    <FormControl fullWidth variant={variant} margin={margin}>
      <InputLabel id="select-issue-type-label">Тип работы</InputLabel>

      <Select
        labelId="select-issue-type-label"
        id="select-issue-type"
        value={value || ""}
        label="Тип работы"
        onChange={handleChange}
        sx={{ width: "auto" }}
      >
        {issueTypes.map((item) => (
          <MenuItem key={item.label} value={item.label}>
            <Typography variant="body1" whiteSpace="wrap">
              {item.label}
            </Typography>
            {item.hint && item.label !== item.hint && (
              <Typography variant="body2" whiteSpace="wrap">
                {item.hint}
              </Typography>
            )}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};

export default SelectIssueTypeList;
