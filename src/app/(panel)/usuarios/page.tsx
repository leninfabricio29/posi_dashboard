"use client";

import * as React from "react";
import { KeyRound, MoreHorizontal, Pencil, Plus, Power, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/auth-provider";
import { ConfirmDialog, EmptyState, ErrorState, LoadingState, PageHeader, SimpleSelect } from "@/components/common";
import { DataTable } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAsync } from "@/hooks/use-async";
import { errorMessage } from "@/lib/api/client";
import { usersApi } from "@/lib/api/users";
import type { Role, User } from "@/lib/api/types";
import { ROLE_LABEL, fmtDate } from "@/lib/format";

const ROLE_OPTIONS = (Object.keys(ROLE_LABEL) as Role[]).map((r) => ({ value: r, label: ROLE_LABEL[r] }));
const ROLE_FILTER = [{ value: "ALL", label: "Todos los roles" }, ...ROLE_OPTIONS];
const ACTIVE_FILTER = [
  { value: "ALL", label: "Activos e inactivos" },
  { value: "true", label: "Solo activos" },
  { value: "false", label: "Solo inactivos" },
];

export default function UsuariosPage() {
  const { user: me } = useAuth();
  const [role, setRole] = React.useState("ALL");
  const [active, setActive] = React.useState("ALL");
  const users = useAsync(
    () =>
      usersApi.list({
        role: role === "ALL" ? undefined : (role as Role),
        active: active === "ALL" ? undefined : active === "true",
      }),
    [role, active]
  );
  const [dialog, setDialog] = React.useState<{ open: boolean; user?: User }>({ open: false });
  const [pwdUser, setPwdUser] = React.useState<User | null>(null);
  const [toDelete, setToDelete] = React.useState<User | null>(null);

  async function toggleActive(u: User) {
    try {
      const updated = await usersApi.update(u.id, { isActive: !u.isActive });
      users.setData((prev) => prev?.map((x) => (x.id === u.id ? updated : x)));
      toast.success(`${updated.name} ${updated.isActive ? "activado" : "desactivado"}`);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  return (
    <>
      <PageHeader
        title="Usuarios"
        description="Meseros, cajeros y administradores. Los meseros usan la app móvil; el panel es para administradores y cajeros."
        actions={
          <Button onClick={() => setDialog({ open: true })}>
            <Plus /> Nuevo usuario
          </Button>
        }
      />
      <div className="flex flex-wrap gap-2">
        <SimpleSelect ariaLabel="Filtrar por rol" className="w-48" value={role} options={ROLE_FILTER} onChange={setRole} />
        <SimpleSelect ariaLabel="Filtrar por estado" className="w-52" value={active} options={ACTIVE_FILTER} onChange={setActive} />
      </div>

      {users.loading && !users.data ? (
        <LoadingState />
      ) : users.error && !users.data ? (
        <ErrorState message={users.error} onRetry={users.reload} />
      ) : !users.data?.length ? (
        <EmptyState title="Sin usuarios" description="No hay usuarios con esos filtros." />
      ) : (
        <DataTable
          data={users.data}
          rowKey={(u) => u.id}
          rowClassName={(u) => (u.isActive ? undefined : "opacity-60")}
          searchText={(u) => [
            u.name,
            u.email,
            ROLE_LABEL[u.role],
            u.isActive ? "Activo" : "Inactivo",
            fmtDate(u.createdAt),
          ]}
          searchPlaceholder="Buscar por nombre, correo o rol…"
          columns={[
            {
              header: "Nombre",
              className: "font-medium",
              cell: (u) => (
                <>
                  {u.name} {u.id === me?.id && <span className="text-xs text-muted-foreground">(tú)</span>}
                </>
              ),
            },
            { header: "Correo", cell: (u) => u.email },
            { header: "Rol", cell: (u) => ROLE_LABEL[u.role] },
            {
              header: "Estado",
              cell: (u) => (
                <Badge variant={u.isActive ? "secondary" : "outline"}>{u.isActive ? "Activo" : "Inactivo"}</Badge>
              ),
            },
            { header: "Creado", cell: (u) => fmtDate(u.createdAt) },
            {
              header: null,
              className: "w-12",
              cell: (u) => {
                const isMe = u.id === me?.id;
                return (
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button variant="ghost" size="icon-sm" aria-label={`Acciones de ${u.name}`}>
                          <MoreHorizontal />
                        </Button>
                      }
                    />
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setDialog({ open: true, user: u })}>
                        <Pencil /> Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setPwdUser(u)}>
                        <KeyRound /> Cambiar contraseña
                      </DropdownMenuItem>
                      <DropdownMenuItem disabled={isMe} onClick={() => toggleActive(u)}>
                        <Power /> {u.isActive ? "Desactivar" : "Activar"}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem variant="destructive" disabled={isMe} onClick={() => setToDelete(u)}>
                        <Trash2 /> Eliminar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                );
              },
            },
          ]}
        />
      )}

      <UserDialog
        state={dialog}
        isSelf={dialog.user?.id === me?.id}
        onClose={() => setDialog({ open: false })}
        onSaved={() => void users.reload()}
      />
      <PasswordDialog user={pwdUser} onClose={() => setPwdUser(null)} />
      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title={`¿Eliminar a ${toDelete?.name ?? ""}?`}
        description="Si el usuario tiene pedidos o ventas registradas, se desactivará en lugar de eliminarse."
        confirmLabel="Eliminar"
        destructive
        onConfirm={async () => {
          if (!toDelete) return;
          try {
            const res = await usersApi.remove(toDelete.id);
            toast.success(res.deactivated ? "El usuario tenía movimientos: se desactivó" : "Usuario eliminado");
            void users.reload();
          } catch (err) {
            toast.error(errorMessage(err));
          }
        }}
      />
    </>
  );
}

function UserDialog({
  state,
  isSelf,
  onClose,
  onSaved,
}: {
  state: { open: boolean; user?: User };
  isSelf: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const editing = !!state.user;
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [role, setRole] = React.useState<Role>("WAITER");
  const [isActive, setIsActive] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!state.open) return;
    setName(state.user?.name ?? "");
    setEmail(state.user?.email ?? "");
    setPassword("");
    setRole(state.user?.role ?? "WAITER");
    setIsActive(state.user?.isActive ?? true);
  }, [state.open, state.user]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return toast.error("El nombre es obligatorio");
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return toast.error("Correo inválido");
    if (!editing && password.length < 6) return toast.error("La contraseña debe tener al menos 6 caracteres");
    setSaving(true);
    try {
      if (state.user) {
        await usersApi.update(state.user.id, {
          name: name.trim(),
          email: email.trim(),
          ...(isSelf ? {} : { role, isActive }),
        });
        toast.success("Usuario actualizado");
      } else {
        await usersApi.create({ name: name.trim(), email: email.trim(), password, role });
        toast.success("Usuario creado");
      }
      onSaved();
      onClose();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={state.open} onOpenChange={(o) => !o && !saving && onClose()}>
      <DialogContent size="md">
        <form onSubmit={submit} className="grid gap-4" noValidate>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar usuario" : "Nuevo usuario"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="uName">Nombre</Label>
            <Input id="uName" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} autoFocus />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="uEmail">Correo electrónico</Label>
            <Input id="uEmail" type="email" autoComplete="off" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          {!editing && (
            <div className="space-y-1.5">
              <Label htmlFor="uPassword">Contraseña (mínimo 6)</Label>
              <Input
                id="uPassword"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="uRole">Rol</Label>
            <SimpleSelect id="uRole" value={role} options={ROLE_OPTIONS} onChange={setRole} disabled={isSelf} />
            {role === "WAITER" && (
              <p className="text-xs text-muted-foreground">Los meseros no pueden ingresar al panel (usan la app móvil).</p>
            )}
          </div>
          {editing && (
            <div className="flex items-center justify-between rounded-lg border p-3">
              <Label htmlFor="uActive">Usuario activo</Label>
              <Switch id="uActive" checked={isActive} onCheckedChange={setIsActive} disabled={isSelf} />
            </div>
          )}
          {isSelf && <p className="text-xs text-muted-foreground">No puedes cambiar tu propio rol ni desactivarte.</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Guardando…" : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function PasswordDialog({ user, onClose }: { user: User | null; onClose: () => void }) {
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    setPassword("");
    setConfirm("");
  }, [user]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (password.length < 6) return toast.error("La contraseña debe tener al menos 6 caracteres");
    if (password !== confirm) return toast.error("Las contraseñas no coinciden");
    setSaving(true);
    try {
      await usersApi.update(user.id, { password });
      toast.success("Contraseña actualizada");
      onClose();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={!!user} onOpenChange={(o) => !o && !saving && onClose()}>
      <DialogContent size="sm">
        <form onSubmit={submit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Cambiar contraseña</DialogTitle>
            <DialogDescription>{user?.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="newPwd">Nueva contraseña</Label>
            <Input
              id="newPwd"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="newPwd2">Confirmar contraseña</Label>
            <Input
              id="newPwd2"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Guardando…" : "Actualizar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
