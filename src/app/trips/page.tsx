import { redirect } from "next/navigation";

// The dashboard used to live here; it now lives on the home page.
// Redirect any old bookmarks/links instead of leaving this route dead.
export default function TripsPage() {
  redirect("/");
}
