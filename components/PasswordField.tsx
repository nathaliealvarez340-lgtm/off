"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

type PasswordFieldProps = {
  label: string;
  name: string;
  autoComplete: string;
  minLength?: number;
  maxLength?: number;
  placeholder?: string;
  required?: boolean;
};

export function PasswordField({
  label,
  name,
  autoComplete,
  minLength,
  maxLength,
  placeholder,
  required = false,
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);

  return (
    <label className="field">
      {label}
      <span className="password-input-shell">
        <input
          name={name}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          minLength={minLength}
          maxLength={maxLength}
          placeholder={placeholder}
          required={required}
        />
        <button
          aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
          aria-pressed={visible}
          className="password-visibility-toggle"
          onClick={() => setVisible((current) => !current)}
          title={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
          type="button"
        >
          {visible ? <EyeOff aria-hidden="true" size={17} /> : <Eye aria-hidden="true" size={17} />}
        </button>
      </span>
    </label>
  );
}
