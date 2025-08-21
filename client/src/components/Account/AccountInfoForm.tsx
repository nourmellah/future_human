// src/components/AccountInfoForm.tsx
import React, { useMemo } from "react";
import ReactCountryFlag from "react-country-flag";
import Field from "../Form/Field";
import IconSelect from "../Form/IconSelect";

const ACCENT = "#E7E31B";

export type AccountData = {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  address?: string;
  postalCode?: string;
  country?: string; // store full country name (value field)
};

type Option = { value: string; label: string; icon?: React.ReactNode };

const COUNTRY_OPTIONS: Option[] = [
  { value: "US", label: "United States of America", icon: <ReactCountryFlag countryCode="US" svg /> },
  { value: "GB", label: "United Kingdom", icon: <ReactCountryFlag countryCode="GB" svg /> },
  { value: "DE", label: "Germany", icon: <ReactCountryFlag countryCode="DE" svg /> },
  { value: "FR", label: "France", icon: <ReactCountryFlag countryCode="FR" svg /> },
  { value: "ES", label: "Spain", icon: <ReactCountryFlag countryCode="ES" svg /> },
  { value: "IT", label: "Italy", icon: <ReactCountryFlag countryCode="IT" svg /> },
  { value: "CA", label: "Canada", icon: <ReactCountryFlag countryCode="CA" svg /> },
  { value: "AU", label: "Australia", icon: <ReactCountryFlag countryCode="AU" svg /> },
  { value: "CH", label: "Switzerland", icon: <ReactCountryFlag countryCode="CH" svg /> },
  { value: "AT", label: "Austria", icon: <ReactCountryFlag countryCode="AT" svg /> },
  { value: "NL", label: "Netherlands", icon: <ReactCountryFlag countryCode="NL" svg /> },
  { value: "BE", label: "Belgium", icon: <ReactCountryFlag countryCode="BE" svg /> },
  { value: "SE", label: "Sweden", icon: <ReactCountryFlag countryCode="SE" svg /> },
  { value: "NO", label: "Norway", icon: <ReactCountryFlag countryCode="NO" svg /> },
  { value: "TN", label: "Tunisia", icon: <ReactCountryFlag countryCode="TN" svg /> },
];

export default function AccountInfoForm({
  values,
  onChange,
  onSave,
  saving,
}: {
  values: AccountData;
  onChange: (patch: Partial<AccountData>) => void;
  onSave?: (values: AccountData) => Promise<void> | void;
  saving?: boolean;
}) {
  // robust handler that supports both (e) and (value) signatures from Field
  const bind =
    (key: keyof AccountData) =>
      (arg: any) => {
        const next =
          arg && typeof arg === "object" && "target" in arg
            ? (arg as React.ChangeEvent<HTMLInputElement>).target.value
            : (arg as string);
        onChange({ [key]: next } as Partial<AccountData>);
      };

  const selectedCountry = useMemo(
    () => COUNTRY_OPTIONS.find((o) => o.value === values.country) ?? null,
    [values.country]
  );

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave?.(values);
      }}
      className="space-y-5"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field
          label="First Name"
          name="firstName"
          placeholder="Enter your first name"
          value={values.firstName}
          onChange={bind("firstName")}
        />
        <Field
          label="Last Name"
          name="lastName"
          placeholder="Enter your last name"
          value={values.lastName}
          onChange={bind("lastName")}
        />
      </div>

      <Field
        label="Email"
        name="email"
        type="email"
        placeholder="Enter your email"
        value={values.email}
        onChange={bind("email")}
      />

      <Field
        label="Phone Number"
        name="phoneNumber"
        placeholder="Enter your phone number"
        value={values.phoneNumber || ""}
        onChange={bind("phoneNumber")}
      />

      <Field
        label="Address"
        name="address"
        placeholder="Enter your address"
        value={values.address || ""}
        onChange={bind("address")}
      />

      <Field
        label="Postal Code"
        name="postalCode"
        placeholder="Enter your postal code"
        value={values.postalCode || ""}
        onChange={bind("postalCode")}
      />

      {/* Country + Save in one row; button matches the select height */}
      <div className="mb-2 text-sm font-semibold text-gray-300">Country</div>

      <div className="grid grid-cols-[1fr_auto] items-stretch">
        <div className="flex flex-col">
          {/* wrapper ensures identical height; IconSelect fills it */}
          <div className={`w-full`}>
            <IconSelect
              className={`w-full`}
              options={COUNTRY_OPTIONS}
              value={selectedCountry?.value || ""}
              onChange={(opt: string | null) => onChange({ country: opt || "" })}
              placeholder="Select your country"
            />
          </div>
        </div>

        <button
          type="submit"
          className={`rounded-full font-extrabold text-black px-8 h-10 self-stretch flex items-center justify-center ${saving ? "opacity-60 cursor-wait" : ""
            }`}
          style={{ backgroundColor: ACCENT }}
          disabled={!!saving}
        >
          SAVE
        </button>
      </div>
    </form>
  );
}
