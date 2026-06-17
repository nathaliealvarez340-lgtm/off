"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { useOffLanguage } from "@/components/useOffLanguage";

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
  const { t } = useOffLanguage();
  const toggleLabel = visible ? t("hidePassword") : t("showPassword");

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
          aria-label={toggleLabel}
          aria-pressed={visible}
          className="password-visibility-toggle"
          data-i18n-aria-label={visible ? "hidePassword" : "showPassword"}
          data-i18n-title={visible ? "hidePassword" : "showPassword"}
          onClick={() => setVisible((current) => !current)}
          title={toggleLabel}
          type="button"
        >
          {visible ? <EyeOff aria-hidden="true" size={17} /> : <Eye aria-hidden="true" size={17} />}
        </button>
      </span>
    </label>
  );
}
