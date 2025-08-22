import React from "react";
import Field from "../../Form/Field";

export type IdentityValues = {
  name: string;
  role: string;
  companyName: string;
  description: string;
};

export type IdentityFormProps = {
  initial: IdentityValues;
  onChange: (patch: Partial<IdentityValues>) => void;
  /** Called when the user submits this step ("Save & Next"). */
  onSubmit?: () => void;
  /** Optional: disabled state while saving */
  saving?: boolean;
};

/**
 * Step 1 — Identity form used on /create (right panel)
 * Extracted so the step wizard stays lean. Styling matches the black/rounded inputs.
 */
export default function IdentityForm({ initial, onChange, onSubmit }: IdentityFormProps) {
  const set = (key: keyof IdentityValues) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      onChange({ [key]: e.target.value } as Partial<IdentityValues>);

  return (
    <>
      <section className="flex flex-col gap-4">
        <h3 className="text-xl font-extrabold leading-tight">
          Step 1: Identity
        </h3>
        <img
          src="src/assets/agent/banners/step-1.png"
          alt="Give your Future Human an identity"
          className="block w-full rounded-3xl mt-0 mb-5"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }} />
      </section>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit?.();
        }}
        className="space-y-4"
      >
        <Field
          label="Name"
          name="name"
          placeholder="Agent name"
          value={initial.name}
          onChange={set("name")}
          type="text" />

        <Field
          label="Function"
          name="role"
          placeholder="e.g. Support, Sales, Tutor"
          value={initial.role}
          onChange={set("role")}
          type="text" />

        <Field
          label="Company Name"
          name="companyName"
          placeholder="e.g. Acme Corp"
          value={initial.companyName}
          onChange={set("companyName")}
          type="text" />

        {/* Description */}
        <label className="block">
          <span className="block text-sm text-gray-300 mb-2">Description</span>
          <textarea
            className="w-full rounded-2xl bg-[#0b0b0b] text-white placeholder-gray-500 border border-[#222] p-4 min-h-[140px] focus:outline-none"
            placeholder="Describe the agent..."
            value={initial.description}
            onChange={set("description")} />
        </label>

        {/* Submit handled by parent wizard; keep the button external in the wizard's footer */}
      </form></>
  );
}
