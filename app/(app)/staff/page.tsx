import type { Metadata } from "next";
import { DirectoryTab } from "./tabs";

export const metadata: Metadata = { title: "Personnel · Hotel SES" };

export default function StaffDirectoryPage() {
  return <DirectoryTab />;
}
