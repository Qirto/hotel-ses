"use client";

import type { Staff } from "@/utils/roomsData";
import type { Account } from "@/lib/server/accounts";
import { AccountsView } from "@/components/features/admin/AccountsView";
import { useAccounts } from "@/hooks/useAccounts";
import { useActions } from "@/hooks/useActions";
import { useConfirm } from "@/hooks/useConfirm";

/** Accounts: create, edit, reset password, disable / re-enable, delete. */
export function AccountsClient({ accounts, staff, currentUserId }: { accounts: Account[]; staff: Staff[]; currentUserId: string }) {
  const actions = useActions();
  const confirm = useConfirm(actions);
  const list = useAccounts(actions, accounts, staff, confirm.ask);
  return (
    <>
      <AccountsView
        accounts={list.accounts}
        staff={staff}
        currentUserId={currentUserId}
        pending={actions.isPending}
        onAdd={list.openCreate}
        onEdit={list.openEdit}
        onReset={list.reset}
        onToggleActive={list.toggleActive}
        onRemove={list.remove}
      />
      {list.elements}
      {confirm.element}
    </>
  );
}
