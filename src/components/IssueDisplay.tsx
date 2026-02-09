import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { Box, IconButton, Tooltip, Typography } from "@mui/material";
import { FC, ReactNode } from "react";

export interface IssueDisplayProps {
  display?: ReactNode;
  taskKey?: ReactNode;
  taskName?: ReactNode;
  href?: string | null;
  fio?: ReactNode;
  hint?: ReactNode;
}

const IssueDisplay: FC<IssueDisplayProps> = ({
  display,
  taskKey,
  taskName,
  href = null,
  fio = null,
  hint = null,
}) => {
  const content = (
    <Typography variant="body1" sx={{ position: "relative", left: -7 }}>
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
      {taskKey || taskName ? (
        <>
          {taskKey && (
            <Box component="span" sx={{ fontWeight: 700, mr: 1 }}>
              {taskKey}
            </Box>
          )}
          <Box component="span">{taskName ?? null}</Box>
        </>
      ) : (
        display
      )}
    </Typography>
  );

  return (
    <>
      {hint ? (
        <Tooltip title={hint}>
          <span>{content}</span>
        </Tooltip>
      ) : (
        content
      )}
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
};

export default IssueDisplay;
