"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";

type Option = { value: string; label: string };

export function Select({
  value,
  onChange,
  options,
  placeholder = "Seleccionar",
  required = false,
  className = "",
}: {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  required?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dropdownStyle, setDropdownStyle] = useState({ top: 0, left: 0, width: 0 });

  const updateDropdownPosition = () => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    setDropdownStyle({
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
    });
  };

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      const clickedTrigger = !!ref.current?.contains(target);
      const clickedDropdown = !!dropdownRef.current?.contains(target);
      if (!clickedTrigger && !clickedDropdown) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!open || typeof document === "undefined") return;
    updateDropdownPosition();
    window.addEventListener("resize", updateDropdownPosition);
    window.addEventListener("scroll", updateDropdownPosition, true);
    return () => {
      window.removeEventListener("resize", updateDropdownPosition);
      window.removeEventListener("scroll", updateDropdownPosition, true);
    };
  }, [open]);

  const selected = options.find((o) => o.value === value);

  const dropdownContent = open && (
    <div
      ref={dropdownRef}
      role="listbox"
      aria-required={required}
      className="fixed z-[9999] max-h-60 overflow-y-auto rounded-xl border border-neutral-200 bg-[#fffefb] p-1.5 shadow-[0_16px_40px_rgba(32,31,29,0.14)]"
      style={{
        top: dropdownStyle.top,
        left: dropdownStyle.left,
        width: dropdownStyle.width,
        minWidth: dropdownStyle.width,
      }}
    >
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          role="option"
          aria-selected={opt.value === value}
          onClick={() => {
            onChange(opt.value);
            setOpen(false);
          }}
          className={`w-full rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
            opt.value === value
              ? "bg-neutral-900 text-white font-medium"
              : "text-neutral-700 hover:bg-neutral-100"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className="flex h-11 w-full items-center justify-between gap-2 rounded-xl border border-[#d8d5ce] bg-[#fffefb] px-3.5 py-2.5 text-left text-sm text-neutral-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_1px_2px_rgba(32,31,29,0.025)] transition hover:border-[#b9b6af] focus:border-neutral-700 focus:outline-none focus:ring-[3px] focus:ring-neutral-900/10"
      >
        <span className={value ? "" : "text-neutral-400"}>{selected?.label ?? placeholder}</span>
        <svg
          className={`w-4 h-4 text-neutral-400 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {typeof document !== "undefined" && dropdownContent
        ? createPortal(dropdownContent, document.body)
        : null}
    </div>
  );
}
