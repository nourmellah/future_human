type FieldProps = {
	label: string;
	type?: string;
	name: string;
	value?: string
	placeholder?: string;
	autoComplete?: string;
	required?: boolean;
	onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
	onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
	accent?: string;
};

export default function Field({ label, type = "text", name, placeholder, value, autoComplete, required, onChange, onBlur, accent = "#E7E31B" }: FieldProps) {
	return (
		<label className="block text-sm mb-5">
			<span className="block text-gray-300 mb-2">{label}</span>
			<input
				className="w-full rounded-full bg-[#0b0b0b] text-white placeholder-gray-500 border border-[#222] focus:outline-none focus:ring-2"
				style={{ boxShadow: "inset 0 0 0 1px #161616", padding: "14px 18px", caretColor: accent, outline: "none", borderColor: "#222" }}
				type={type}
				name={name}
				value={value}
				placeholder={placeholder}
				autoComplete={autoComplete}
				required={required}
				onChange={onChange}
				onBlur={onBlur}
			/>
		</label>
	);
}