import { useRef, useState } from "react";

const ACCENT = "#E7E31B";

export type DropZoneProps = {
  value?: string;                    // preview URL (object URL or remote URL)
  onChange: (url: string) => void;   // called with preview URL
  onFile?: (file: File) => void;     // optional raw file
};

export default function DropZone({ value, onChange, onFile }: DropZoneProps) {
  const [drag, setDrag] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const openingRef = useRef(false);

  function handleFiles(files: FileList | null) {
    if (!files || !files.length) return;
    const file = files[0];
    const url = URL.createObjectURL(file);
    onChange(url);        // preview for immediate display
    onFile?.(file);       // raw file for upload/persistence
  }

  function openPicker() {
    if (openingRef.current) return;   // gate to prevent double-open
    openingRef.current = true;
    inputRef.current?.click();
    setTimeout(() => { openingRef.current = false; }, 0);
  }

  return (
    <>
      <div
        className={`rounded-xl border border-[#222] bg-[#111] px-4 py-6 text-center cursor-pointer select-none ${drag ? "ring-2 ring-[var(--accent)]" : ""}`}
        style={{ ["--accent" as any]: ACCENT }}
        onClick={openPicker}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); handleFiles(e.dataTransfer.files); }}
      >
        {value ? (
          <img src={value} alt="Preview" className="mx-auto max-h-36 rounded-lg object-contain" />
        ) : (
          <div className="text-gray-300">
            <div className="font-semibold">Click to upload</div>
            <div className="text-xs opacity-80">or drag & drop an image</div>
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onClick={(e) => e.stopPropagation()}              // avoids bubbling -> double open
        onChange={(e) => handleFiles(e.currentTarget.files)}
      />
    </>
  );
}
