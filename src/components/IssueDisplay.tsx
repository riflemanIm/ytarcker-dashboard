import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { IconButton, Typography } from "@mui/material";
import { FC, ReactNode } from "react";

export interface IssueDisplayProps {
  display: ReactNode;
  href?: string | null;
  fio?: ReactNode;
}

const IssueDisplay: FC<IssueDisplayProps> = ({
  display,
  href = null,
  fio = null,
}) => (
  <>
    <Typography variant="subtitle1" sx={{ position: "relative", left: -7 }}>
      {href && (
        <IconButton
          component="a"
          href={href}
          target="_blank"
          sx={(theme) => ({
            borderRadius: "50%",
            color: theme.palette.primary.light,
            "&:hover": {
              color: theme.palette.primary.main,
            },
          })}
        >
          <OpenInNewIcon fontSize="small" />
        </IconButton>
      )}
      {display}
    </Typography>
    {fio && (
      <Typography
        variant="subtitle2"
        color="text.secondary"
        sx={{ position: "relative", top: -5, left: 30 }}
      >
        {fio}
      </Typography>
    )}
  </>
);

export default IssueDisplay;
