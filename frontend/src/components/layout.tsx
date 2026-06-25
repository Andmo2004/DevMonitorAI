import { Outlet } from "react-router-dom";
import { Sidebar } from "./sidebar";

export function Layout() {
  return (
    <div className="min-h-screen">
      <Sidebar />
      <main className="ml-64 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-6 lg:py-10">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
