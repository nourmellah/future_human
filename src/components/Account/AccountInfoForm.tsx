// src/components/AccountInfoForm.tsx
import React from "react";
import Field from "../Form/Field";

const ACCENT = "#E7E31B";

export type AccountData = {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  address?: string;
  postalCode?: string;
  country?: string;
};

export type AccountInfoFormProps = {
  values: AccountData;
  onChange: (patch: Partial<AccountData>) => void;
	onSave?: (values: AccountData) => Promise<void> | void;
  saving?: boolean;
};

export default function AccountInfoForm({ values, onChange, onSave, saving }: AccountInfoFormProps) {
  const set = (key: keyof AccountData) => (e: React.ChangeEvent<HTMLInputElement>) =>
    onChange({ [key]: e.target.value } as Partial<AccountData>);

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSave?.(values); }} className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="First Name" name="firstName" placeholder="Enter your first name" value={values.firstName} onChange={set("firstName")} type="text" />
        <Field label="Last Name" name="lastName" placeholder="Enter your last name" value={values.lastName} onChange={set("lastName")} type="text" />
      </div>

      <Field label="Mail" name="email" type="email" placeholder="test@gmail.com" value={values.email} onChange={set("email")} />
      <Field label="Numéro de téléphone" name="phone" placeholder="Enter your phone number" value={values.phone || ""} onChange={set("phone")} type="tel" />
      <Field label="Adresse" name="address" placeholder="Enter your address" value={values.address || ""} onChange={set("address")} type="text" />
      <Field label="Code Postal" name="postalCode" placeholder="Enter your postal code" value={values.postalCode || ""} onChange={set("postalCode")} type="text" />

      <div className="flex items-center gap-4">
        <div className="flex-1">
          <Field label="Pays" name="country" placeholder="Enter your country" value={values.country || ""} onChange={set("country")} type="text" />
        </div>
        <div className="flex items-center gap-3 ml-auto">
          <button type="submit" className={`rounded-full font-extrabold text-black px-8 py-3 ${saving ? "opacity-60 cursor-wait" : ""}`} style={{ backgroundColor: ACCENT }} disabled={saving}>
            SAVE
          </button>
        </div>
      </div>
    </form>
  );
}
