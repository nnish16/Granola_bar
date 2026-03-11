import { Building2, CalendarClock, ChevronDown, FolderOpen, Home, Settings, Users } from "lucide-react";
import { useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { cn } from "../../lib/utils";

const homeAnchors = [
  { label: "Coming Up", icon: CalendarClock, href: "/#coming-up" },
  { label: "Past Meetings", icon: Home, href: "/#past-meetings" },
];

const navItems = [
  { label: "Settings", icon: Settings, to: "/settings", disabled: false },
  { label: "People", icon: Users, to: "/", disabled: true },
  { label: "Companies", icon: Building2, to: "/", disabled: true },
  { label: "Folders", icon: FolderOpen, to: "/", disabled: true },
];

export default function Sidebar(): JSX.Element {
  const location = useLocation();
  const [libraryOpen, setLibraryOpen] = useState(true);
  const [exploreOpen, setExploreOpen] = useState(true);
  const activeHash = location.hash || "#coming-up";

  return (
    <aside className="sticky top-0 flex h-screen w-sidebar flex-col border-r border-border bg-panel px-5 py-6">
      <div>
        <div className="inline-flex items-center gap-3">
          <span className="text-sm text-accent">●</span>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-user">NoteFlow</p>
        </div>
      </div>

      <nav className="mt-10 flex flex-1 flex-col gap-4">
        <div>
          <button
            type="button"
            className="flex w-full items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-secondary"
            onClick={() => setLibraryOpen((value) => !value)}
          >
            <span>Library</span>
            <ChevronDown className={cn("h-4 w-4 transition-transform", !libraryOpen && "-rotate-90")} />
          </button>
          <div
            className={cn(
              "grid overflow-hidden transition-all duration-200",
              libraryOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-70",
            )}
          >
            <div className="overflow-hidden">
              {homeAnchors.map(({ label, icon: Icon, href }) => {
                const isActive = location.pathname === "/" && ((label === "Coming Up" && activeHash === "#coming-up") || (label === "Past Meetings" && activeHash === "#past-meetings"));
                return (
                  <Link
                    key={label}
                    to={href}
                    className={cn(
                      "flex items-center gap-3 border-l-2 px-4 py-3 text-sm font-medium text-secondary transition-colors hover:bg-gray-50 hover:text-user dark:hover:bg-zinc-900",
                      isActive && "border-l-accent bg-white text-user dark:bg-zinc-900",
                      !isActive && "border-l-transparent",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        <div>
          <button
            type="button"
            className="flex w-full items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-secondary"
            onClick={() => setExploreOpen((value) => !value)}
          >
            <span>Explore</span>
            <ChevronDown className={cn("h-4 w-4 transition-transform", !exploreOpen && "-rotate-90")} />
          </button>
          <div
            className={cn(
              "grid overflow-hidden transition-all duration-200",
              exploreOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-70",
            )}
          >
            <div className="overflow-hidden">
              {navItems.map(({ label, icon: Icon, to, disabled }) => (
                <NavLink
                  key={label}
                  to={to}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 border-l-2 px-4 py-3 text-sm font-medium text-secondary transition-colors hover:bg-gray-50 hover:text-user dark:hover:bg-zinc-900",
                      isActive && !disabled && "border-l-accent bg-white text-user dark:bg-zinc-900",
                      !isActive && "border-l-transparent",
                      disabled && "cursor-not-allowed opacity-55",
                    )
                  }
                  onClick={(event) => {
                    if (disabled) {
                      event.preventDefault();
                    }
                  }}
                >
                  <Icon className="h-4 w-4" />
                  <span>{label}</span>
                </NavLink>
              ))}
            </div>
          </div>
        </div>
      </nav>

    </aside>
  );
}
