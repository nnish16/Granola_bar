import { Building2, CalendarClock, FolderOpen, Home, Settings, Users } from "lucide-react";
import { NavLink } from "react-router-dom";
import { cn } from "../../lib/utils";

const homeAnchors = [
  { label: "Coming Up", icon: CalendarClock, href: "/#coming-up" },
  { label: "Past Meetings", icon: Home, href: "/#past-meetings" },
];

const navItems = [
  { label: "People", icon: Users, to: "/", disabled: true },
  { label: "Companies", icon: Building2, to: "/", disabled: true },
  { label: "Folders", icon: FolderOpen, to: "/", disabled: true },
];

export default function Sidebar(): JSX.Element {
  return (
    <aside className="sticky top-0 flex h-screen w-sidebar flex-col border-r border-border bg-panel px-5 py-6">
      <div>
        <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-accent text-lg font-semibold text-white">
          N
        </div>
        <div className="mt-4">
          <p className="font-display text-2xl text-user">NoteFlow</p>
          <p className="mt-1 text-sm text-secondary">Phase 1 scaffold</p>
        </div>
      </div>

      <nav className="mt-10 flex flex-1 flex-col gap-1">
        {homeAnchors.map(({ label, icon: Icon, href }) => (
          <a
            key={label}
            href={href}
            className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-secondary transition-colors hover:bg-white hover:text-user dark:hover:bg-zinc-900"
          >
            <Icon className="h-4 w-4" />
            <span>{label}</span>
          </a>
        ))}

        <div className="my-3 h-px bg-border" />

        {navItems.map(({ label, icon: Icon, to, disabled }) => (
          <NavLink
            key={label}
            to={to}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-secondary transition-colors",
                isActive && !disabled && "bg-white text-user shadow-sm dark:bg-zinc-900",
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
      </nav>

      <NavLink
        to="/settings"
        className={({ isActive }) =>
          cn(
            "mt-auto flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-secondary transition-colors",
            isActive && "bg-white text-user shadow-sm dark:bg-zinc-900",
          )
        }
      >
        <Settings className="h-4 w-4" />
        <span>Settings</span>
      </NavLink>
    </aside>
  );
}
