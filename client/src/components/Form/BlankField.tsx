export default function BlankField({ label }: { label: string }) {
  return (
    <div className="block">
      <span className="block text-sm text-gray-300 mb-2">{label}</span>
      <div
        className="w-full rounded-full border border-[#222] bg-[#0b0b0b]"
        style={{ boxShadow: "inset 0 0 0 1px #161616", padding: "14px 18px" }}
      />
    </div>
  );
}