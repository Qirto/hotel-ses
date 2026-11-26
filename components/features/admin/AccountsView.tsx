"use client";

import { memo, useMemo, useState } from "react";
import { KeyRound, Pencil, Power, Trash2, UserPlus, UserRound, UsersRound } from "lucide-react";
import type { Staff } from "@/utils/roomsData";
import type { Account } from "@/lib/server/accounts";
import { Button } from "@/components/ui/button";
import { DataTable, DataTableActions, rowButton, rowIconButton, type DataTableColumn } from "@/components/ui/data-table";
import { FilterBar, SearchInput, SelectField } from "@/components/features/Filters";
import { EmptyState, Panel } from "@/components/features/Panel";
import { ToneBadge } from "@/components/features/StatusBadges";
import { formatDateTime } from "@/lib/datetime";
import { plural } from "@/lib/format";
import { PORTAL_ROLES, ROLE_LABEL, type PortalRole } from "@/lib/portals";
import type { Tone } from "@/lib/rooms";

const ROLE_TONE: Record<PortalRole, Tone> = { admin: "special", gm: "info", rh: "success", reception: "neutral" };
const ROLE_FILTER = [{ value: "ALL", label: "Tous les rôles" }, ...PORTAL_ROLES.map((r) => ({ value: r, label: ROLE_LABEL[r] }))];

function status(a: Account): { label: string; tone: Tone } {
  if (!a.is_active) return { label: "Désactivé", tone: "danger" };
  if (a.must_change_password) return { label: "Mot de passe à définir", tone: "warning" };
  return { label: "Actif", tone: "success" };
}

/** Administration: accounts with their role, linked employee, status and last sign-in. */
export const AccountsView = memo(function AccountsView({
  accounts,
  staff,
  currentUserId,
  pending,
  onAdd,
  onEdit,
  onReset,
  onToggleActive,
  onRemove,
}: {
  accounts: readonly Account[];
  staff: readonly Staff[];
  currentUserId: string;
  pending: boolean;
  onAdd: () => void;
  onEdit: (a: Account) => void;
  onReset: (a: Account) => void;
  onToggleActive: (a: Account) => void;
  onRemove: (a: Account) => void;
}) {
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("ALL");
  const staffName = useMemo(() => new Map(staff.map((s) => [s.id, s.full_name])), [staff]);
  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return accounts.filter(
      (a) => (role === "ALL" || a.role === role) && (!q || a.username.includes(q) || a.display_name.toLowerCase().includes(q))
    );
  }, [accounts, search, role]);

  const columns = useMemo<DataTableColumn<Account>[]>(
    () => [
      {
        key: "display_name",
        header: "Compte",
        primary: true,
        minWidth: 12,
        grow: 1.6,
        cell: (a) => (
          <span className="flex min-w-0 items-center gap-2.5">
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-surface-hover text-fg-muted">
              <UserRound className="size-4" aria-hidden />
            </span>
            <span className="min-w-0">
              <span className="block truncate font-medium text-fg">{a.display_name}</span>
              <span className="block truncate text-xs text-fg-muted">
                <span className="font-mono">{a.username}</span>
                {a.id === currentUserId && " · vous"}
              </span>
            </span>
          </span>
        ),
      },
      {
        key: "role",
        header: "Rôle",
        minWidth: 11.5, // « Ressources humaines » badge + padding
        accessor: (a) => ROLE_LABEL[a.role],
        cell: (a) => <ToneBadge tone={ROLE_TONE[a.role]} dot={false}>{ROLE_LABEL[a.role]}</ToneBadge>,
      },
      {
        key: "staff_id",
        header: "Employé lié",
        minWidth: 9,
        priority: 3,
        accessor: (a) => (a.staff_id ? staffName.get(a.staff_id) ?? "" : ""),
        cell: (a) => <span className="block truncate text-fg-secondary">{a.staff_id ? staffName.get(a.staff_id) ?? "–" : "–"}</span>,
      },
      {
        key: "status",
        header: "Statut",
        minWidth: 10.5,
        accessor: (a) => status(a).label,
        cell: (a) => {
          const s = status(a);
          return <ToneBadge tone={s.tone}>{s.label}</ToneBadge>;
        },
      },
      {
        key: "last_sign_in_at",
        header: "Dernière connexion",
        minWidth: 9,
        priority: 2,
        accessor: (a) => (a.last_sign_in_at ? new Date(a.last_sign_in_at).getTime() : 0),
        cell: (a) => <span className="whitespace-nowrap text-fg-secondary">{a.last_sign_in_at ? formatDateTime(a.last_sign_in_at) : "Jamais"}</span>,
      },
      {
        key: "actions",
        header: "Actions",
        sortable: false,
        align: "right",
        minWidth: 22, // « Réinitialiser » + « Désactiver » + edit + delete (small buttons) + padding
        grow: 1.2,
        fullWidthOnMobile: true,
        mobileLabel: "",
        accessor: () => "",
        cell: (a, { layout }) => {
          const self = a.id === currentUserId;
          return (
            <DataTableActions layout={layout}>
              <Button variant="outline" size={rowButton(layout)} title="Générer un nouveau mot de passe temporaire" onClick={() => onReset(a)} disabled={pending} leftIcon={<KeyRound className="size-3.5" aria-hidden />}>
                Réinitialiser
              </Button>
              <Button
                variant="secondary"
                size={rowButton(layout)}
                className={layout === "cards" ? undefined : "w-[7.5rem]"}
                title={a.is_active ? "Désactiver le compte" : "Réactiver le compte"}
                onClick={() => onToggleActive(a)}
                disabled={pending || (self && a.is_active)}
                leftIcon={<Power className="size-3.5" aria-hidden />}
              >
                {a.is_active ? "Désactiver" : "Réactiver"}
              </Button>
              <Button variant="ghost" size={rowIconButton(layout)} className="flex-none" title={`Modifier ${a.username}`} aria-label={`Modifier ${a.username}`} onClick={() => onEdit(a)} disabled={pending}>
                <Pencil className="size-3.5" aria-hidden />
              </Button>
              <Button variant="ghost" size={rowIconButton(layout)} className="flex-none" title={`Supprimer ${a.username}`} aria-label={`Supprimer ${a.username}`} onClick={() => onRemove(a)} disabled={pending || self}>
                <Trash2 className="size-3.5 text-danger" aria-hidden />
              </Button>
            </DataTableActions>
          );
        },
      },
    ],
    [currentUserId, staffName, pending, onEdit, onReset, onToggleActive, onRemove]
  );

  return (
    <Panel
      title="Comptes"
      description={`${rows.length} sur ${plural(accounts.length, "compte")}`}
      icon={<UsersRound />}
      actions={
        <Button variant="primary" size="touch" onClick={onAdd} leftIcon={<UserPlus className="size-4" aria-hidden />}>
          Créer un compte
        </Button>
      }
    >
      <FilterBar className="mb-4">
        <SearchInput label="Rechercher un compte" placeholder="Nom ou identifiant" value={search} onChange={setSearch} />
        <SelectField label="Rôle" value={role} onChange={setRole} options={ROLE_FILTER} />
      </FilterBar>
      <DataTable<Account>
        rows={rows}
        columns={columns}
        getRowLabel={(a) => `${a.display_name} (${a.username})`}
        selectable={false}
        searchable={false}
        maxHeight={null}
        defaultSort={{ key: "display_name", dir: "asc" }}
        pageSize={50}
        density="compact"
        emptyState={<EmptyState icon={<UsersRound />} title="Aucun compte" description="Créez un compte pour chaque membre du personnel qui utilise l’application." />}
        ariaLabel="Comptes"
      />
    </Panel>
  );
});
