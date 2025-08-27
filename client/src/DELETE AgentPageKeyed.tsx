import React from "react";
import { useLocation, useParams } from "react-router-dom";
import AgentPage from "./pages/AgentPage";
import { AgentWizardProvider } from "./state/agentWizard";

/**
 * Forces a full remount when agent ID or location changes,
 * preventing stale form state from "sticking" across pages.
 */
export default function AgentPageKeyed() {
  const location = useLocation();
  const { id } = useParams();
  const key = id ?? "new"; // treat "create" (no id) as its own key
  // Also include pathname to be extra-safe when navigating between create/edit
  return (
    <AgentWizardProvider key={`${key}:${location.pathname}`}>
      <AgentPage />
    </AgentWizardProvider>
  );
}
