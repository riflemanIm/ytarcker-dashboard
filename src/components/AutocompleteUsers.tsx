import React from "react";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Autocomplete from "@mui/material/Autocomplete";
import isEmpty from "../helpers";
import { User } from "@/types/global";

interface AutocompleteUsersProps {
  userId: string | null;
  handleSelectedUsersChange: (id: string | null) => void;
  disabled?: boolean;
  disableClearable?: boolean;
  users: User[] | null;
}

const AutocompleteUsers: React.FC<AutocompleteUsersProps> = ({
  userId,
  handleSelectedUsersChange,
  disabled = false,
  disableClearable = false,
  users,
}) => {
  if (!users) {
    return null;
  }
  const handleChange = (event: React.SyntheticEvent, value: User | null) => {
    handleSelectedUsersChange(value?.id ? value.id.toString() : null);
  };
  console.log("users", users, userId);

  const options = (users || []).map((item: User) => item);

  const value =
    (users || []).find((item: User) => item.id.toString() === userId) || null;

  return (
    !isEmpty(options) && (
      <Autocomplete
        disableClearable={disableClearable}
        blurOnSelect
        clearOnBlur
        autoSelect
        disabled={disabled}
        value={value}
        options={options}
        onChange={handleChange}
        getOptionLabel={(option: User) => option?.name || ""}
        isOptionEqualToValue={(option: User, value: User) =>
          option.id === value.id
        }
        renderOption={(props, option: User) => (
          <Typography variant="body1" {...props}>
            {option.name}
          </Typography>
        )}
        noOptionsText={"Ведите имя сотрудника"}
        renderInput={(params) => (
          <TextField
            {...params}
            name="filter-users"
            margin="dense"
            label={"Выбрать сотрудника"}
            fullWidth
            variant="outlined"
          />
        )}
      />
    )
  );
};

export default AutocompleteUsers;
