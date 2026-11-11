import { createContext, useContext } from "react";
import { lvl } from "./domain";
import { ME_ROLES } from "./store";
type User = { n: string; r: string; p?: string };
export const MeCtx = createContext<User>({ n: "", r: "" });
export const useMe = () => {
  const me = useContext(MeCtx);
  return { ...me, l: lvl(me.r), admin: !!ME_ROLES.admin, owner: !!ME_ROLES.owner };
};
