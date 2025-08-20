// src/components/ui/DualBalanceSlider.tsx
import React from "react";

export type DualBalanceSliderProps = {
  label?: string;
  leftLabel: string;
  rightLabel: string;
  /** Left value 0..10. Right is derived as 10-left. */
  value: number;
  onChange: (left: number, right: number) => void;
  /** Optional: show numeric chips */
  showValues?: boolean;
  className?: string;
};

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

const DualBalanceSlider: React.FC<DualBalanceSliderProps> = ({
  label,
  leftLabel,
  rightLabel,
  value,
  onChange,
  showValues = false,
  className = "",
}) => {
  const left = clamp(Math.round(value), 0, 10);
  const right = 10 - left;

  return (
    <div className={`w-full ${className}`}>
      {label ? <div className="text-sm font-semibold mb-2">{label}</div> : null}

      <div className="flex items-center justify-between text-xs text-gray-300 mb-2">
        <span>{leftLabel}</span>
        <span>{rightLabel}</span>
      </div>

      <input
        type="range"
        min={0}
        max={10}
        step={1}
        value={left}
        onChange={(e) => {
          const v = clamp(parseInt(e.target.value || "0", 10), 0, 10);
          onChange(v, 10 - v);
        }}
        className="w-full accent-[#E7E31B]"
      />

      {showValues && (
        <div className="mt-2 text-xs text-gray-400">
          {leftLabel}: <span className="text-white font-semibold">{left}</span> · {rightLabel}: <span className="text-white font-semibold">{right}</span>
        </div>
      )}
    </div>
  );
};

export default DualBalanceSlider;
