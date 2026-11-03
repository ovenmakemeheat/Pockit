import { createAuth } from "@Pockit/auth";
import { createPrismaClient } from "@Pockit/db";

import { ENV } from "./env.server";

export const db = createPrismaClient(ENV);
export const auth = createAuth(ENV, db);
