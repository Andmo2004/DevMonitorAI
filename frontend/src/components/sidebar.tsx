import { NavLink } from "react-router-dom";
import { cn } from "../lib/utils";

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
    to: "/governance",
    label: "Management",
    icon: (
      <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
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
    label: "Predicciones ML",
    icon: (
      <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
      </svg>
    ),
  },
];

interface SidebarProps {
  collapsed: boolean;
  setCollapsed: (val: boolean) => void;
}

export function Sidebar({ collapsed, setCollapsed }: SidebarProps) {
  return (
    <aside 
      className={cn("apple-sidebar glass flex flex-col", collapsed && "collapsed")}
      onClick={(e) => {
        if (collapsed) {
          setCollapsed(false);
          e.stopPropagation();
        }
      }}
    >
      <div className={cn("flex flex-col h-full sidebar-content-wrapper", collapsed && "opacity-0")}>
        {/* Logo */}
        <div className="px-6 py-6 border-b border-dm-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 flex-shrink-0 rounded-xl bg-dm-primary/20 border border-dm-primary/30 flex items-center justify-center">
              <svg className="w-5 h-5 text-dm-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
              </svg>
            </div>
            <div className="app-name-transition">
              <h1 className="text-sm font-semibold text-dm-foreground tracking-tight">
                DevMonitor<span className="text-dm-primary">·AI</span>
              </h1>
              <p className="text-[10px] text-dm-muted-foreground uppercase tracking-widest">
                Governance Hub
              </p>
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
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
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
        <div className="px-6 py-4 border-t border-dm-border mt-auto">
          <div className="flex items-center gap-2 app-name-transition">
            <div className="live-dot flex-shrink-0" />
            <span className="text-[10px] text-dm-muted-foreground uppercase tracking-wider font-medium whitespace-nowrap">
              Sistema activo
            </span>
          </div>
          <p className="text-[10px] text-dm-muted-foreground/60 mt-2 app-name-transition">
            Hackathon Atmira 2026
          </p>
        </div>
      </div>
      
      {/* Absolute Logo visible only when collapsed */}
      {collapsed && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <svg className="w-6 h-6 text-dm-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
          </svg>
        </div>
      )}
    </aside>
  );
}
