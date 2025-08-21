// src/components/ui/IconSelect.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Check } from "lucide-react";

export type IconSelectOption = {
  value: string;
  label: string;
  /** Option-specific icon. Can be a ReactNode (e.g., <img …/>) or a URL string. */
  icon?: React.ReactNode | string;
  disabled?: boolean;
};

export type IconSelectProps = {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: IconSelectOption[];
  /** Optional constant icon pinned at the far-left of the input (e.g., a category icon). */
  constantIcon?: React.ReactNode;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  /** Size of the option icons (px). */
  optionIconSize?: number;
};

const ACCENT = "#E7E31B";

function renderIcon(icon: IconSelectOption["icon"], size = 16) {
  if (!icon) return null;
  if (typeof icon === "string") {
    return (
      <img
        src={icon}
        alt=""
        width={size}
        height={size}
        className="rounded-sm object-cover"
        onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = "none")}
      />
    );
  }
  return <span className="grid place-items-center" style={{ width: size, height: size }}>{icon}</span>;
}

const IconSelect: React.FC<IconSelectProps> = ({
  label,
  value,
  onChange,
  options,
  placeholder = "Select…",
  disabled,
  className = "",
  optionIconSize = 16,
}) => {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const selected = useMemo(() => options.find((o) => o.value === value), [options, value]);
  const [activeIndex, setActiveIndex] = useState(() =>
    Math.max(0, options.findIndex((o) => o.value === value))
  );

  // Close on outside click
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!open) return;
      const t = e.target as Node;
      if (!btnRef.current?.contains(t) && !listRef.current?.contains(t)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  // Keyboard nav
  function onKeyDown(e: React.KeyboardEvent) {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => {
        let next = i + 1;
        while (next < options.length && options[next].disabled) next++;
        return Math.min(next, options.length - 1);
      });
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => {
        let prev = i - 1;
        while (prev >= 0 && options[prev].disabled) prev--;
        return Math.max(prev, 0);
      });
    } else if (e.key === "Enter") {
      e.preventDefault();
      const opt = options[activeIndex];
      if (opt && !opt.disabled) {
        onChange(opt.value);
        setOpen(false);
      }
    }
  }

  return (
    <label className={`block ${className}`}>
      {label ? <span className="block text-sm text-gray-300 mb-2">{label}</span> : null}

      {/* Button */}
      <button
        ref={btnRef}
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={onKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`relative w-full rounded-full border border-[#222] bg-[#0b0b0b] px-4 py-2 text-left
          ${disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
      >
        <div className="flex items-center gap-3">

          {/* Selected option icon */}
          {selected ? (
            <span className="shrink-0 grid place-items-center">
              {renderIcon(selected.icon, optionIconSize)}
            </span>
          ) : null}

          {/* Label */}
          <span className={`truncate ${selected ? "text-white" : "text-white/60"}`}>
            {selected ? selected.label : placeholder}
          </span>

          <ChevronDown className="ml-auto h-4 w-4 text-white/60" />
        </div>
      </button>

      {/* Dropdown */}
      {open && (
        <div
          ref={listRef}
          role="listbox"
          tabIndex={-1}
          className="relative z-50 mt-2 w-full rounded-xl border border-[#222] bg-[#0b0b0b] shadow-lg overflow-hidden"
        >
          <div className="max-h-60 overflow-auto">
            {options.map((opt, idx) => {
              const isSelected = opt.value === value;
              const isActive = idx === activeIndex;
              return (
                <div
                  key={opt.value}
                  role="option"
                  aria-selected={isSelected}
                  onMouseEnter={() => setActiveIndex(idx)}
                  onClick={() => {
                    if (opt.disabled) return;
                    onChange(opt.value);
                    setOpen(false);
                  }}
                  className={`flex items-center gap-3 px-3 py-2 cursor-pointer
                    ${opt.disabled ? "opacity-50 cursor-not-allowed" : ""}
                    ${isActive ? "bg-[#121212]" : "bg-transparent"}`}
                  style={{
                    boxShadow: isSelected ? `inset 0 0 0 2px ${ACCENT}` : undefined,
                  }}
                >
                  {renderIcon(opt.icon, optionIconSize)}
                  <span className="flex-1 text-sm">{opt.label}</span>
                  {isSelected ? <Check className="w-4 h-4 text-[${ACCENT}] text-yellow-300" /> : null}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </label>
  );
};

export default IconSelect;
