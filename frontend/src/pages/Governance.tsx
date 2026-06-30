import { useState, useEffect } from "react";
import { GlassCard } from "../components/glass-card";
import { getUsers, updateUserPolicy, deleteUser } from "../api/client";
import type { UserResponse, UserPolicyUpdate } from "../types/api";
import { cn } from "../lib/utils";

const Governance = () => {
  const [users, setUsers] = useState<UserResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [userToDelete, setUserToDelete] = useState<UserResponse | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pagination & Search States
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    fetchUsers();
  }, [search, pageSize, page]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      setError(null);
      const data = await getUsers(search, pageSize, page * pageSize);
      setUsers(data.items);
      setTotalCount(data.total_count);
    } catch (err) {
      console.error("Error fetching users:", err);
      setError("Error de conexión con el servidor. Verifica que el backend está corriendo (localhost:8000).");
    } finally {
      setLoading(false);
    }
  };

  const handlePolicyUpdate = async (
    userId: number,
    update: UserPolicyUpdate
  ) => {
    setSaving(userId);
    try {
      const updated = await updateUserPolicy(userId, update);
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? updated : u))
      );
      showToast("Política actualizada correctamente");
    } catch (err) {
      console.error("Error updating policy:", err);
      showToast("Error al actualizar la política");
    } finally {
      setSaving(null);
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    setIsDeleting(true);
    try {
      await deleteUser(userToDelete.id);
      setUsers((prev) => prev.filter((u) => u.id !== userToDelete.id));
      showToast("Usuario eliminado correctamente");
      setUserToDelete(null);
    } catch (err) {
      console.error("Error deleting user:", err);
      showToast("Error al eliminar el usuario");
    } finally {
      setIsDeleting(false);
    }
  };

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="float-in">
        <h1 className="text-2xl font-semibold text-dm-foreground tracking-tight">
          Management
        </h1>
        <p className="text-sm text-dm-muted-foreground mt-1">
          Configuración de políticas de uso de IA · Cumplimiento RGPD
        </p>
      </header>

      {/* RGPD Banner */}
      <GlassCard className="p-4 float-in border-l-2 border-dm-primary" style={{ animationDelay: "60ms" }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-dm-primary/15 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-dm-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-dm-foreground">
              Datos anonimizados · Cumplimiento RGPD
            </p>
            <p className="text-xs text-dm-muted-foreground">
              Cuando la anonimización está activada, los textos de prompts no se almacenan. Solo se registran metadatos (tokens, modelo, tipo).
            </p>
          </div>
        </div>
      </GlassCard>

      {/* Search and Pagination Controls */}
      <div className="flex flex-col sm:flex-row gap-4 float-in">
        <div className="relative flex-1 max-w-md">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dm-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Buscar usuarios..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-dm-secondary/30 border border-dm-glass-border text-sm text-dm-foreground placeholder:text-dm-muted-foreground focus:outline-none focus:border-dm-primary/50 transition-colors"
          />
        </div>
        <div className="relative w-48">
          <select
            value={pageSize}
            onChange={(e) => { setPageSize(Number(e.target.value)); setPage(0); }}
            className="w-full pl-3 pr-9 py-2 rounded-xl bg-dm-secondary/30 border border-dm-glass-border text-sm text-dm-foreground focus:outline-none focus:border-dm-primary/50 transition-colors appearance-none cursor-pointer"
          >
            <option value={10}>10 por página</option>
            <option value={20}>20 por página</option>
            <option value={50}>50 por página</option>
          </select>
          <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dm-muted-foreground pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* Users list */}
      {error && (
        <div className="glass rounded-2xl p-4 border border-dm-destructive/30 text-dm-destructive text-sm float-in">
          {error}
        </div>
      )}
      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="glass rounded-3xl p-6 h-40 animate-pulse" />
          ))}
        </div>
      ) : users.length === 0 && !error ? (
        <GlassCard className="p-8 text-center">
          <p className="text-dm-muted-foreground">No hay usuarios registrados.</p>
        </GlassCard>
      ) : !error && (
        <div className="space-y-4">
          {users.map((user, i) => (
            <GlassCard
              key={user.id}
              className="p-6 float-in"
              style={{ animationDelay: `${120 + i * 60}ms` }}
            >
              <div className="flex flex-col lg:flex-row lg:items-center gap-6">
                {/* User info */}
                <div className="flex items-center gap-4 lg:w-56 flex-shrink-0">
                  <div className="w-10 h-10 rounded-xl bg-dm-secondary flex items-center justify-center text-sm font-semibold text-dm-primary">
                    {user.username.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-dm-foreground">
                      {user.username}
                    </p>
                    <p className="text-xs text-dm-muted-foreground">
                      {user.email}
                    </p>
                    {user.team && (
                      <span className="inline-block mt-1 text-[10px] px-2 py-0.5 rounded-full bg-dm-secondary text-dm-muted-foreground">
                        {user.team}
                      </span>
                    )}
                  </div>
                </div>

                {/* Policies */}
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Anonymize toggle */}
                  <div className="flex flex-col gap-2 items-start">
                    <label className="text-[10px] text-dm-muted-foreground uppercase tracking-wider font-medium">
                      Anonimizar prompts
                    </label>
                    <button
                      onClick={() =>
                        handlePolicyUpdate(user.id, {
                          anonymize: !user.anonymize,
                        })
                      }
                      disabled={saving === user.id}
                      className={cn(
                        "relative flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 transition-colors duration-200",
                        user.anonymize
                          ? "bg-dm-primary border-transparent"
                          : "bg-dm-secondary border-dm-border"
                      )}
                    >
                      <span
                        className={cn(
                          "pointer-events-none block h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 ease-in-out",
                          user.anonymize ? "translate-x-[22px]" : "translate-x-0.5"
                        )}
                      />
                    </button>
                  </div>

                  {/* Cost alert */}
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] text-dm-muted-foreground uppercase tracking-wider font-medium">
                      Alerta coste (€/día)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      value={user.cost_alert_eur_day ?? ""}
                      onChange={(e) => {
                        const val = e.target.value
                          ? parseFloat(e.target.value)
                          : null;
                        handlePolicyUpdate(user.id, {
                          cost_alert_eur_day: val,
                        });
                      }}
                      className="w-full px-3 py-1.5 rounded-lg bg-dm-background/50 border border-dm-border text-dm-foreground text-sm tabular-nums focus:outline-none focus:border-dm-primary/50 focus:ring-1 focus:ring-dm-primary/30 transition-colors"
                      placeholder="Sin límite"
                    />
                  </div>

                  {/* Retention days */}
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] text-dm-muted-foreground uppercase tracking-wider font-medium">
                      Retención (días)
                    </label>
                    <select
                      value={user.retention_days}
                      onChange={(e) =>
                        handlePolicyUpdate(user.id, {
                          retention_days: parseInt(e.target.value),
                        })
                      }
                      className="w-full px-3 py-1.5 rounded-lg bg-dm-background/50 border border-dm-border text-dm-foreground text-sm focus:outline-none focus:border-dm-primary/50 focus:ring-1 focus:ring-dm-primary/30 transition-colors"
                    >
                      {[30, 60, 90, 180, 365].map((d) => (
                        <option key={d} value={d}>
                          {d} días
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Status indicator */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {saving === user.id ? (
                    <svg className="w-4 h-4 animate-spin text-dm-primary" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : (
                    <span
                      className={cn(
                        "w-2 h-2 rounded-full",
                        user.anonymize ? "bg-dm-success" : "bg-dm-warning"
                      )}
                    />
                  )}
                  
                  {/* Delete button */}
                  <button
                    onClick={() => setUserToDelete(user)}
                    className="p-1.5 text-dm-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors ml-2"
                    title="Eliminar usuario"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      {/* Pagination Bottom */}
      {!loading && totalCount > 0 && (
        <div className="flex justify-between items-center float-in" style={{ animationDelay: "300ms" }}>
          <p className="text-sm text-dm-muted-foreground">
            Mostrando {page * pageSize + 1} a {Math.min((page + 1) * pageSize, totalCount)} de {totalCount} usuarios
          </p>
          <div className="flex gap-2">
            <button 
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-4 py-2 rounded-xl bg-dm-secondary/30 hover:bg-dm-secondary/50 border border-dm-glass-border text-dm-foreground disabled:opacity-50 text-sm font-medium transition-all"
            >
              Anterior
            </button>
            <button 
              onClick={() => setPage(p => p + 1)}
              disabled={(page + 1) * pageSize >= totalCount}
              className="px-4 py-2 rounded-xl bg-dm-secondary/30 hover:bg-dm-secondary/50 border border-dm-glass-border text-dm-foreground disabled:opacity-50 text-sm font-medium transition-all"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed inset-x-0 bottom-6 flex justify-center z-50 float-in">
          <div className="glass rounded-2xl px-4 py-2.5 text-sm text-dm-foreground shadow-xl">
            {toast}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <GlassCard className="max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-dm-foreground mb-2">
              Eliminar Usuario
            </h3>
            <p className="text-sm text-dm-muted-foreground mb-6">
              ¿Estás seguro de que deseas eliminar a <strong>{userToDelete.username}</strong>? Esta acción no se puede deshacer y eliminará también todos los eventos asociados al usuario.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setUserToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium text-dm-muted-foreground hover:text-dm-foreground transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteUser}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Eliminando...
                  </>
                ) : (
                  "Eliminar"
                )}
              </button>
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
};

export default Governance;
