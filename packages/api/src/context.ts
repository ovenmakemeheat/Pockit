import type { Session } from "@Pockit/auth";
import type { Database } from "@Pockit/db";

export type Context = {
  session: Session | null;
  db: Database;
};
