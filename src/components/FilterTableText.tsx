import { TextField } from "@mui/material";
import React from "react";

interface FilterTableTextProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
}

const FilterTableText: React.FC<FilterTableTextProps> = ({
  value,
  onChange,
  label = "Фильтр",
  placeholder,
  disabled = false,
}) => {
  return (
    <TextField
      value={value}
      onChange={(event) => onChange(event.target.value)}
      label={label}
      placeholder={placeholder}
      fullWidth
      size="small"
      margin="dense"
      disabled={disabled}
    />
  );
};

export default FilterTableText;
