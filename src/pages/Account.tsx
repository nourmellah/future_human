import AccountRightPanel from "../components/Account/AccountRightPanel";
import SidebarNav, { type Agent } from "../components/SidebarNav";
import ThreePaneLayout from "../layouts/ThreePaneLayout";

const agents: Agent[] = [
  { id: "1", name: "Nour", role: "Sales Agent", thumbnail: "src/assets/avatars/1.png" },
  { id: "1", name: "Nour", role: "Sales Agent", thumbnail: "src/assets/avatars/1.png" },
  { id: "1", name: "Nour", role: "Sales Agent", thumbnail: "src/assets/avatars/1.png" },
  { id: "1", name: "Nour", role: "Sales Agent", thumbnail: "src/assets/avatars/1.png" },
  { id: "1", name: "Nour", role: "Sales Agent", thumbnail: "src/assets/avatars/1.png" },
  { id: "1", name: "Nour", role: "Sales Agent", thumbnail: "src/assets/avatars/1.png" },
  { id: "1", name: "Nour", role: "Sales Agent", thumbnail: "src/assets/avatars/1.png" },
  { id: "1", name: "Nour", role: "Sales Agent", thumbnail: "src/assets/avatars/1.png" },
  { id: "1", name: "Nour", role: "Sales Agent", thumbnail: "src/assets/avatars/1.png" },
  { id: "1", name: "Nour", role: "Sales Agent", thumbnail: "src/assets/avatars/1.png" },
  { id: "1", name: "Nour", role: "Sales Agent", thumbnail: "src/assets/avatars/1.png" },
];

export default function AccountPage() {
  return (
    <ThreePaneLayout
      sidebar={
        <SidebarNav
          agents={agents}
          activeAgentId={"0"}
        />
      }
      center={<p>Account Information</p>}
      rightWidth={480}
      right={<AccountRightPanel data={{
        firstName: "",
        lastName: "",
        email: "",
        phone: undefined,
        address: undefined,
        postalCode: undefined,
        country: undefined
      }} />}
    />
  );
}
