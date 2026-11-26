"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Building2, CalendarDays, Users } from "lucide-react";
import type { Department, Staff } from "@/utils/roomsData";
import { AnimatedTabs } from "@/components/ui/animated-tabs";
import { initialRoster, type Roster } from "@/components/features/hr/Roster";
import { useActions } from "@/hooks/useActions";
import { useConfirm } from "@/hooks/useConfirm";
import { useDepartmentsCrud } from "@/hooks/useDepartmentsCrud";
import { useStaffDirectory } from "@/hooks/useStaffDirectory";
import type { ShiftType } from "@/lib/constants";

type StaffSection = {
  people: ReturnType<typeof useStaffDirectory>;
  services: ReturnType<typeof useDepartmentsCrud>;
  pending: boolean;
  roster: Roster;
  setShift: (staffId: number, day: string, shift: ShiftType) => void;
};

const StaffContext = createContext<StaffSection | null>(null);

export function useStaffSection(): StaffSection {
  const value = useContext(StaffContext);
  if (!value) throw new Error("useStaffSection must be used inside the staff layout");
  return value;
}

const TABS = [
  { href: "/staff", label: "Annuaire", icon: <Users className="size-4" aria-hidden /> },
  { href: "/staff/shifts", label: "Horaires", icon: <CalendarDays className="size-4" aria-hidden /> },
  { href: "/staff/services", label: "Services", icon: <Building2 className="size-4" aria-hidden /> },
];

/** Staff, services and roster state shared by the three staff pages, plus their tabs (links). */
export function StaffProvider({ staff, departments, children }: { staff: Staff[]; departments: Department[]; children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const actions = useActions();
  const confirm = useConfirm(actions);
  const services = useDepartmentsCrud(actions, departments, confirm.ask);
  const people = useStaffDirectory(actions, staff, confirm.ask, services.options);

  // Weekly roster: client-side only (not saved), kept while moving between the staff pages.
  const [roster, setRoster] = useState<Roster>(() => initialRoster(staff));
  const setShift = useCallback((staffId: number, day: string, shift: ShiftType) => {
    setRoster((prev) => ({ ...prev, [staffId]: { ...(prev[staffId] || {}), [day]: shift } }));
  }, []);

  const badges: Record<string, number> = { "/staff": people.staff.length, "/staff/services": services.departments.length };

  return (
    <StaffContext.Provider value={{ people, services, pending: actions.isPending, roster, setShift }}>
      <AnimatedTabs
        tabs={TABS.map((t) => ({ id: t.href, label: t.label, icon: t.icon, badge: badges[t.href] }))}
        activeTab={TABS.find((t) => t.href === pathname)?.href ?? "/staff"}
        onChange={(href) => router.push(href, { scroll: false })}
        renderContent={false}
        tabsContainerClassName="no-scrollbar max-w-full overflow-x-auto"
      />
      {children}
      {people.formElement}
      {services.formElement}
      {confirm.element}
    </StaffContext.Provider>
  );
}
