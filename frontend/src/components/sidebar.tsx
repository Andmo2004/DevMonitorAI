import { NavLink } from "react-router-dom";
import { cn } from "../lib/utils";
import { useTheme } from "./theme-provider";
import { useState, useEffect } from "react";

const NAV_ITEMS = [
  {
    to: "/",
    label: "Dashboard",
    icon: (
      <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25a2.25 2.25 0 01-2.25-2.25v-2.25z" />
      </svg>
    ),
  },
  {
    to: "/insights",
    label: "Insights IA",
    icon: (
      <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
      </svg>
    ),
  },
  {
    to: "/predictions",
    label: "ML Predictions",
    icon: (
      <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
      </svg>
    ),
  },
  {
    to: "/governance",
    label: "Management",
    icon: (
      <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
      </svg>
    ),
  },
];

interface SidebarProps {
  collapsed: boolean;
  setCollapsed: (val: boolean) => void;
}

export function Sidebar({ collapsed, setCollapsed }: SidebarProps) {
  const { theme, setTheme } = useTheme();
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    setIsAnimating(true);
    const timer = setTimeout(() => {
      setIsAnimating(false);
    }, 550); // Matches the 0.52s --anim-duration
    return () => clearTimeout(timer);
  }, [collapsed]);

  return (
    <aside
      className={cn("apple-sidebar glass flex flex-col", collapsed && "collapsed", isAnimating && "animating")}
    >
      <div className={cn("flex flex-col h-full sidebar-content-wrapper", collapsed && "opacity-0")}>
        {/* Logo */}
        <div className="px-6 py-6 border-b border-dm-border">
          <div className="glass-untinted flex items-center justify-center gap-3 p-3 rounded-2xl">
            <img
              src={theme === "light" ? "/icon-for-light-theme.svg" : "/icon-for-dark-theme.svg"}
              alt="Glasstics Icon"
              className="w-8 h-8 flex-shrink-0"
            />
            <div className="app-name-transition">
              <img
                src={theme === "light" ? "/name-for-light-theme.svg" : "/name-for-dark-theme.svg"}
                alt="Glasstics"
                className="h-5 mb-1"
              />
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              onClick={() => {
                if (window.innerWidth < 1024) {
                  setCollapsed(true);
                }
              }}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors duration-200",
                  isActive
                    ? "bg-dm-primary/15 text-dm-primary border border-dm-primary/25 glow-active"
                    : "text-dm-muted-foreground hover:text-dm-foreground hover:bg-white/5 border border-transparent"
                )
              }
            >
              {item.icon}
              <span className="whitespace-nowrap">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-4 py-4 border-t border-dm-border mt-auto flex flex-col gap-3">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setTheme(theme === "dark" ? "light" : "dark");
            }}
            className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-dm-muted-foreground hover:text-dm-foreground hover:bg-black/5 dark:hover:bg-white/5 border border-transparent transition-colors duration-200"
          >
            {theme === "dark" ? (
              <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
              </svg>
            ) : (
              <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
              </svg>
            )}
            <span className="whitespace-nowrap">Tema {theme === "dark" ? "Claro" : "Oscuro"}</span>
          </button>

          <div className="px-2">
            <div className="flex items-center gap-2 app-name-transition">
              <div className="live-dot flex-shrink-0" />
              <span className="text-[10px] text-dm-muted-foreground uppercase tracking-normal font-medium whitespace-nowrap">
                Sistema activo
              </span>
            </div>
            <p className="text-[10px] text-dm-muted-foreground/60 mt-1 app-name-transition">
              v1.0.0 · Build 2026.07
            </p>
          </div>
        </div>
      </div>

      {/* Absolute Logo visible only when collapsed */}
      <div
        className={cn(
          "absolute inset-0 flex items-center justify-center cursor-pointer transition-all duration-300",
          collapsed
            ? "opacity-100 scale-100 pointer-events-auto"
            : "opacity-0 scale-75 pointer-events-none"
        )}
        onClick={(e) => {
          e.stopPropagation();
          setCollapsed(false);
        }}
      >
        <img
          src={theme === "light" ? "/icon-for-light-theme.svg" : "/icon-for-dark-theme.svg"}
          alt="Glasstics Icon"
          className="w-8 h-8 hover:scale-110 transition-transform duration-200"
        />
      </div>
    </aside>
  );
}
