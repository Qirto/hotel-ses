import type { Metadata } from "next";
import { ShiftsTab } from "../tabs";

export const metadata: Metadata = { title: "Horaires · Hotel SES" };

export default function StaffShiftsPage() {
  return <ShiftsTab />;
}
