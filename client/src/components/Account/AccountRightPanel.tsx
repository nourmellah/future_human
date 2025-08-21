// src/components/AccountRightPanel.tsx
import React, { useMemo, useState } from "react";
import { Power, UserRound, Crown, Settings, SlidersHorizontal } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthProvider";
import AccountInfoForm from "./AccountInfoForm";

const ACCENT = "#E7E31B"; // brand yellow

export type AccountData = {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  address?: string;
  postalCode?: string;
  country?: string;
};

const TABS = [
  { key: "account", Icon: UserRound, label: "Account" },
  { key: "roles", Icon: Crown, label: "Roles" },
  { key: "settings", Icon: Settings, label: "Settings" },
  { key: "advanced", Icon: SlidersHorizontal, label: "Advanced" },
] as const;
type TabKey = typeof TABS[number]["key"];

function BlankPanel() {
  return <div className="rounded-3xl bg-[#0b0b0b] border border-[#222] min-h-[420px]" />;
}

export default function AccountRightPanel({
  data,
  onSave,
}: {
  data: AccountData;
  onSave?: (values: AccountData) => Promise<void> | void;
}) {
  const [values, setValues] = useState<AccountData>(data);
  const [active, setActive] = useState<TabKey>("account");
  const [saving, setSaving] = useState(false);

  const { logout } = useAuth();
  const navigate = useNavigate();

  const applyPatch = (patch: Partial<AccountData>) =>
    setValues((v) => ({ ...v, ...patch }));

  async function handleSave() {
    if (!onSave) return;
    setSaving(true);
    try {
      await onSave(values);
    } finally {
      setSaving(false);
    }
  }

  const tabContent = useMemo<Record<TabKey, React.ReactNode>>(
    () => ({
      account: (
        <AccountInfoForm
          values={values}
          onChange={applyPatch}
          onSave={handleSave}
          saving={saving}
        />
      ),
      roles: <BlankPanel />,
      settings: <BlankPanel />,
      advanced: <BlankPanel />,
    }),
    [values, saving]
  );

  return (
    <div className="w-full text-white pr-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-extrabold leading-tight">
            {values.firstName || "First"} {values.lastName || "Last"}
          </h1>
          <p className="text-gray-400">{values.email || "email@example.com"}</p>
        </div>
        <button
          aria-label="Logout"
          onClick={async () => {
            try {
              await logout();
            } finally {
              navigate("/auth", { replace: true });
            }
          }}
          className="grid place-items-center w-12 h-12 rounded-full"
          style={{ backgroundColor: "#ff0022" }}
        >
          <Power className="w-5 h-5 text-white" />
        </button>
      </div>

      <div className="h-px w-full bg-[#1e1e1e] my-5" />

      {/* White circular icons */}
      <div className="flex items-center gap-4 mb-6">
        {TABS.map(({ key, Icon, label }) => {
          const activeTab = active === key;
          return (
            <button
              key={key}
              type="button"
              title={label}
              onClick={() => setActive(key)}
              className="grid place-items-center w-11 h-11 rounded-full transition"
              style={{
                backgroundColor: "#fff",
                color: "#000",
                boxShadow: activeTab ? `0 0 0 2px ${ACCENT}` : undefined,
              }}
            >
              <Icon className="w-5 h-5" />
            </button>
          );
        })}
      </div>

      {/* Content */}
      {tabContent[active]}
    </div>
  );
}
