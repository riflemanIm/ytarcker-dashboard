import type React from "react";
import type { Dispatch, RefObject, SetStateAction } from "react";
import type { AlertState, AppState, MenuState } from "@/types/global";
import type { DeleteDataArgs, SetDataArgs } from "@/actions/data";

export interface BaseCellMenuProps {
  open: boolean;
  onClose: () => void;
  menuState: MenuState;
  onPaperMouseEnter?: (event: React.MouseEvent<HTMLElement>) => void;
  onPaperMouseLeave?: (event: React.MouseEvent<HTMLElement>) => void;
  paperRef?: RefObject<HTMLDivElement>;
  onCloseButtonClick?: () => void;
}

export interface EditableCellMenuProps extends BaseCellMenuProps {
  setState: Dispatch<SetStateAction<AppState>>;
  deleteData: (args: DeleteDataArgs) => void;
  token: string | null;
  setData: (args: SetDataArgs) => void;
  setAlert: (args: AlertState) => void;
}
