"use client";

const periods = [
  { value: "24h", label: "24h" },
  { value: "7d", label: "7d" },
  { value: "30d", label: "30d" },
  { value: "90d", label: "90d" },
  { value: "365d", label: "365d" },
  { value: "all", label: "All" },
];

interface Props {
  value: string;
  onChange: (period: string) => void;
}

export function PeriodSelector({ value, onChange }: Props) {
  return (
    <div className="flex flex-wrap gap-1">
      {periods.map((period) => (
        <button
          key={period.value}
          type="button"
          onClick={() => onChange(period.value)}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            value === period.value
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
          }`}
        >
          {period.label}
        </button>
      ))}
    </div>
  );
}
