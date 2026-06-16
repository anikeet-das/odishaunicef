import { createFileRoute } from "@tanstack/react-router";
import { ClimateAlertsPage } from "@/components/cr-sap/climate/ClimateAlertsPage";

export const Route = createFileRoute("/alerts")({
  head: () => ({
    meta: [
      { title: "Climate Alerts · CR-SAP Odisha" },
      { name: "description", content: "Real-time AI-powered climate intelligence command center for Odisha, streaming live atmospheric data." },
    ],
  }),
  component: ClimateAlertsPage,
});
