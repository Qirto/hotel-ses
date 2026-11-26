import type { Metadata } from "next";
import { ServicesTab } from "../tabs";

export const metadata: Metadata = { title: "Services · Hotel SES" };

export default function StaffServicesPage() {
  return <ServicesTab />;
}
