"use client";

import { useCallback, useState } from "react";
import type { Staff } from "@/utils/roomsData";
import type { Account } from "@/lib/server/accounts";
import { AccountFormSheet, type AccountFormInput } from "@/components/features/admin/AccountFormSheet";
import { TemporaryPasswordSheet } from "@/components/features/admin/TemporaryPasswordSheet";
import { createAccount, deleteAccount, resetAccountPassword, setAccountActive, updateAccount } from "@/app/admin-actions";
import { useSyncedState } from "./useActions";
import type { ConfirmRequest, PortalRunner } from "./useConfirm";

/**
 * Account management for the Administration portal: list, create / edit form,
 * password reset, disable / enable, delete. A new temporary password is shown once
 * in its own modal. Render `elements` once.
 */
export function useAccounts(p: PortalRunner, accountList: Account[], staff: readonly Staff[], ask: (r: ConfirmRequest) => void) {
  const { run, runForResult, flash, isPending } = p;
  const [accounts, setAccounts] = useSyncedState<Account[]>(accountList);
  const [form, setForm] = useState<{ open: boolean; account: Account | null }>({ open: false, account: null });
  const [credentials, setCredentials] = useState<{ username: string; password: string } | null>(null);

  const openCreate = useCallback(() => setForm({ open: true, account: null }), []);
  const openEdit = useCallback((account: Account) => setForm({ open: true, account }), []);
  const setFormOpen = useCallback((open: boolean) => setForm((f) => ({ ...f, open })), []);
  const patch = useCallback((id: string, change: Partial<Account>) => setAccounts((prev) => prev.map((a) => (a.id === id ? { ...a, ...change } : a))), [setAccounts]);

  const save = (input: AccountFormInput) =>
    runForResult(async () => {
      const account = form.account;
      if (account) {
        const res = await updateAccount(account.id, input);
        if (res.success) {
          patch(account.id, { display_name: input.displayName, role: input.role, staff_id: input.staffId });
          setFormOpen(false);
          flash("success", `Le compte ${account.username} a été mis à jour.`);
        } else flash("danger", res.error || `Impossible de mettre à jour le compte ${account.username}.`);
        return Boolean(res.success);
      }
      const res = await createAccount(input);
      if (res.success) {
        setAccounts((prev) => [...prev, res.data.account]);
        setFormOpen(false);
        setCredentials({ username: res.data.account.username, password: res.data.temporaryPassword });
      } else flash("danger", res.error || "Impossible de créer le compte.");
      return Boolean(res.success);
    });

  const reset = useCallback(
    (a: Account) =>
      ask({
        title: "Réinitialiser le mot de passe",
        description: `Générer un nouveau mot de passe temporaire pour ${a.display_name} (${a.username}) ? L’actuel ne fonctionnera plus.`,
        confirmLabel: "Réinitialiser",
        tone: "primary",
        action: async () => {
          const res = await resetAccountPassword(a.id);
          if (res.success) {
            patch(a.id, { must_change_password: true });
            setCredentials({ username: a.username, password: res.data.temporaryPassword });
          } else flash("danger", res.error || "Impossible de réinitialiser le mot de passe.");
        },
      }),
    [ask, patch, flash]
  );

  // Re-enabling is harmless and immediate; disabling blocks someone, so it confirms.
  const toggleActive = useCallback(
    (a: Account) => {
      const apply = async () => {
        const res = await setAccountActive(a.id, !a.is_active);
        if (res.success) {
          patch(a.id, { is_active: !a.is_active });
          flash("success", a.is_active ? `Le compte ${a.username} est désactivé.` : `Le compte ${a.username} est réactivé.`);
        } else flash("danger", res.error || "Impossible de changer le statut du compte.");
      };
      if (!a.is_active) return run(apply);
      ask({
        title: "Désactiver le compte",
        description: `${a.display_name} (${a.username}) ne pourra plus se connecter tant que le compte n’est pas réactivé.`,
        confirmLabel: "Désactiver",
        tone: "danger",
        action: apply,
      });
    },
    [ask, run, patch, flash]
  );

  const remove = useCallback(
    (a: Account) =>
      ask({
        title: "Supprimer le compte",
        description: `Supprimer le compte ${a.username} ? La fiche de l’employé lié est conservée. Cette action est irréversible.`,
        confirmLabel: "Supprimer",
        pendingLabel: "Suppression",
        tone: "danger",
        action: async () => {
          const res = await deleteAccount(a.id);
          if (res.success) {
            setAccounts((prev) => prev.filter((x) => x.id !== a.id));
            flash("success", `Le compte ${a.username} a été supprimé.`);
          } else flash("danger", res.error || "Impossible de supprimer le compte.");
        },
      }),
    [ask, setAccounts, flash]
  );

  const elements = (
    <>
      <AccountFormSheet key={`account-${form.account?.id ?? "new"}`} open={form.open} onOpenChange={setFormOpen} account={form.account} staff={staff} pending={isPending} onSubmit={save} />
      <TemporaryPasswordSheet credentials={credentials} onClose={() => setCredentials(null)} />
    </>
  );

  return { accounts, openCreate, openEdit, reset, toggleActive, remove, elements };
}
