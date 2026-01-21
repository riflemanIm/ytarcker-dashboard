import type React from "react";
import type { RefObject } from "react";
import type { MenuState } from "@/types/global";
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
  deleteData: (args: DeleteDataArgs) => void;
  setData: (args: SetDataArgs) => void;
}
