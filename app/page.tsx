import { redirect } from "next/navigation";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export default async function Page() {
  const cookieStore = await cookies();
  const role = cookieStore.get("hotel_role")?.value;

  if (role === "reception" || role === "rh" || role === "gm") {
    redirect(`/${role}`);
  } else {
    redirect("/login");
  }
}
