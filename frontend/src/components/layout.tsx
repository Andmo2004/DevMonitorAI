import { Outlet } from "react-router-dom";
import { Sidebar } from "./sidebar";
import { useState, useEffect, useRef } from "react";

export function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
        if (!collapsed) {
          setCollapsed(true);
        }
      }
    }
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [collapsed]);

  return (
    <div className="min-h-[100dvh]">
      <div ref={sidebarRef}>
        <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
      </div>
      <main className={`min-h-[100dvh] main-content-transition ${collapsed ? "ml-0" : "ml-0 lg:ml-[300px]"}`}>
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-6 lg:py-10">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
