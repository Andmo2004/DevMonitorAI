import { Outlet } from "react-router-dom";
import { Sidebar } from "./sidebar";
import { useState, useEffect, useRef } from "react";

export function Layout() {
  // 💡 TIP: Iniciamos el estado en 'true' (colapsado) para que el menú no 
  // tape la pantalla de golpe al cargar la aplicación por primera vez.
  const [collapsed, setCollapsed] = useState(true); 
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Lógica para cerrar el menú si se hace clic fuera de él
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
    <div className="min-h-[100dvh] relative">
      
      {/* =========================================================
          CAPA 1: FONDO OVERLAY (El "Backdrop")
          Se muestra solo cuando el menú está abierto (!collapsed)
          ========================================================= */}
      <div 
        className={`fixed inset-0 bg-black/20 dark:bg-black/40 z-40 transition-opacity duration-300 ${
          collapsed ? "opacity-0 pointer-events-none" : "opacity-100 pointer-events-auto"
        }`}
        onClick={() => setCollapsed(true)}
        aria-hidden="true"
      />

      {/* =========================================================
          CAPA 2: EL SIDEBAR
          Lo envolvemos en un div 'fixed' con un z-index alto (50) 
          para que flote por encima del Overlay y del contenido
          ========================================================= */}
      <div ref={sidebarRef} className="fixed z-50 h-full">
        <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
      </div>

      {/* =========================================================
          CAPA 3: CONTENIDO PRINCIPAL (Main)
          Ya no tiene margen dinámico. Siempre ocupa el 100% del ancho
          ========================================================= */}
      <main className="min-h-[100dvh] w-full ml-0">
        <div className="w-full max-w-screen-2xl mx-auto px-4 lg:px-8 py-6 lg:py-10">
          <Outlet />
        </div>
      </main>
      
    </div>
  );
}
