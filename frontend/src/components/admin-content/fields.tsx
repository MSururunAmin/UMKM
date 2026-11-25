type TextFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
};

export function TextField({ label, value, onChange, maxLength = 255 }: TextFieldProps) {
  return (
    <label className="block text-sm font-semibold text-stone-700">
      {label}
      <input value={value} maxLength={maxLength} onChange={(event) => onChange(event.target.value)} className="mt-1.5 h-11 w-full rounded-control border border-brand-border bg-white px-3 text-sm font-normal outline-none focus:border-brand-secondary focus:ring-2 focus:ring-brand-light" />
    </label>
  );
}

type TextAreaFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
};

export function TextAreaField({ label, value, onChange, rows = 3 }: TextAreaFieldProps) {
  return (
    <label className="block text-sm font-semibold text-stone-700">
      {label}
      <textarea value={value} onChange={(event) => onChange(event.target.value)} rows={rows} className="mt-1.5 w-full rounded-control border border-brand-border bg-white px-3 py-2 text-sm font-normal outline-none focus:border-brand-secondary focus:ring-2 focus:ring-brand-light" />
    </label>
  );
}
