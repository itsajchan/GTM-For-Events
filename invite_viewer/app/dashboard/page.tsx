import type { Metadata } from "next";
import InviteViewer from "../components/InviteViewer";
import { getReports } from "../lib/reports";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Event Invite Dashboard | GTM My Events",
  description:
    "Review event research reports, prioritize invite prospects, and inspect supporting public web evidence.",
};

export default async function Dashboard() {
  const reports = await getReports();

  return <InviteViewer initialReports={reports} />;
}
