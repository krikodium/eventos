"use client";

import { useState, type ChangeEvent } from "react";

type PasswordFieldProps = {
  id: string;
  label: string;
  value: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  autoComplete: "current-password" | "new-password";
  placeholder?: string;
};

export function PasswordField({ id, label, value, onChange, autoComplete, placeholder }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <label htmlFor={id} className="block text-xs font-semibold text-neutral-600">{label}</label>
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          className="text-xs font-medium text-sky-700 transition hover:text-sky-900"
          aria-controls={id}
          aria-pressed={visible}
        >
          {visible ? "Ocultar" : "Mostrar"}
        </button>
      </div>
      <input
        id={id}
        type={visible ? "text" : "password"}
        value={value}
        onChange={onChange}
        required
        minLength={autoComplete === "new-password" ? 8 : undefined}
        autoComplete={autoComplete}
        placeholder={placeholder}
        className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-900 outline-none transition placeholder:text-neutral-400 hover:border-neutral-300 focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
      />
    </div>
  );
}
