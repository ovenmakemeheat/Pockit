import { Link } from "@tanstack/react-router";
import { CircleDollarSign } from "lucide-react";

import UserMenu from "./user-menu";

export default function Header() {
  return (
    <header className="border-border/80 bg-background/95 z-10 border-b backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-8">
          <Link
            to="/"
            className="flex items-center gap-2.5"
            aria-label="Pockit home"
          >
            <span className="bg-primary text-primary-foreground grid size-8 place-items-center">
              <CircleDollarSign aria-hidden="true" className="size-[18px]" />
            </span>
            <span className="text-base font-semibold tracking-tight">
              pockit<span className="text-primary">.</span>
            </span>
          </Link>
          <nav
            aria-label="Main navigation"
            className="hidden items-center gap-1 sm:flex"
          >
            <Link
              to="/dashboard"
              className="text-muted-foreground hover:text-foreground px-3 py-2 text-xs font-medium transition-colors"
              activeProps={{ className: "bg-muted text-foreground" }}
            >
              Overview
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-muted-foreground hidden items-center gap-2 text-[10px] font-medium tracking-[0.14em] uppercase md:flex">
            <span className="size-1.5 bg-emerald-400" /> Private ledger
          </div>
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
