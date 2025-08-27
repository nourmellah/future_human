// src/pages/Account.tsx
import ThreePaneLayout from "../layouts/ThreePaneLayout";
import SidebarNav from "../components/SidebarNav";
import AccountRightPanel from "../components/Account/AccountRightPanel";
import { useAuth } from "../auth/AuthProvider";
import React from "react";
import { updateAccount } from "../services/account";
import { toast } from "react-hot-toast";

const CENTER_IMG = "src/assets/face1.png";

export type AccountData = {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  address?: string;
  postalCode?: string;
  country?: string;
};

function toAccountData(user: any | null): AccountData {
  const name = (user?.name as string) || "";
  const [first, ...rest] = name.split(" ").filter(Boolean);
  return {
    firstName: user?.firstName ?? first ?? "",
    lastName: user?.lastName ?? (rest.length ? rest.join(" ") : "") ?? "",
    email: user?.email ?? "",
    phoneNumber: user?.phoneNumber ?? user?.profile?.phoneNumber ?? "",
    address: user?.address ?? user?.profile?.address ?? "",
    postalCode: user?.postalCode ?? user?.profile?.postalCode ?? "",
    country: user?.country ?? user?.profile?.country ?? "",
  };
}

export default function Account() {
  const { user, accessToken, login } = useAuth();

  const initial = React.useMemo(() => toAccountData(user), [user]);

  async function handleSave(values: AccountData) {
    // TODO: persist to your backend (e.g., await api.updateProfile(values))
    // Local app state update so the whole app reflects the new info:
    const nextUser: any = {
      ...(user ?? {}),
      // keep both split fields and a combined name for compatibility
      firstName: values.firstName,
      lastName: values.lastName,
      name: [values.firstName, values.lastName].filter(Boolean).join(" "),
      email: values.email,
      // store simple fields at top-level if they exist…
      phoneNumber: values.phoneNumber,
      address: values.address,
      postalCode: values.postalCode,
      country: values.country,
    };
    try {
      const update = await updateAccount(nextUser);
      console.log(update);

      // Update the Auth context (token unchanged)
      if (typeof login === "function") {
        login({
          email: update.user.email,
          password: "UNCHANGED", // dummy, won't be used
        });
      }
    } catch (err) {
      console.error(err);

      // ❌ Notification d'erreur avec style personnalisé
      toast.error("Une erreur est survenue lors de la mise à jour.", {
        className: "custom-toast custom-toast-error",
        iconTheme: {
          primary: "#ff3b3b", // Rouge erreur
          secondary: "#000",   // Fond noir
        },
      });
    }
  }

  return (
    <ThreePaneLayout
      sidebar={<SidebarNav />}
      center={
        <aside className="hidden lg:block sticky top-0 h-screen overflow-hidden">
          <img
            src={CENTER_IMG}
            alt="Future Human"
            className="w-full h-full object-cover select-none pointer-events-none scrollbar-hide"
            draggable={false}
          />
        </aside>
      }
      right={
        <AccountRightPanel
          data={initial}
          onSave={handleSave}
        />
      }
      rightWidth={520}
    />
  );
}
