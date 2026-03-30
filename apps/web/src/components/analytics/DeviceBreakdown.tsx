"use client";

import { HelpCircle, Monitor, Smartphone, Tablet } from "lucide-react";

interface Props {
  devices: {
    mobile: number;
    desktop: number;
    tablet: number;
    unknown: number;
  };
}

const deviceConfig = [
  {
    key: "desktop" as const,
    label: "Desktop",
    icon: Monitor,
    color: "bg-blue-500",
  },
  {
    key: "mobile" as const,
    label: "Mobile",
    icon: Smartphone,
    color: "bg-green-500",
  },
  {
    key: "tablet" as const,
    label: "Tablet",
    icon: Tablet,
    color: "bg-yellow-500",
  },
  {
    key: "unknown" as const,
    label: "Unknown",
    icon: HelpCircle,
    color: "bg-gray-400",
  },
];

export function DeviceBreakdown({ devices }: Props) {
  const total =
    devices.mobile + devices.desktop + devices.tablet + devices.unknown;

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6">
      <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
        Devices
      </h3>
      {total === 0 ? (
        <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
          No data yet
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          {deviceConfig.map(({ key, label, icon: Icon, color }) => {
            const count = devices[key];
            const pct = total > 0 ? Math.round((count / total) * 100) : 0;
            return (
              <div key={key} className="flex items-center gap-3">
                <Icon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                <span className="w-16 text-sm text-gray-700 dark:text-gray-300">
                  {label}
                </span>
                <div className="flex-1">
                  <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-800">
                    <div
                      className={`h-2 rounded-full ${color}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
                <span className="w-12 text-right text-sm text-gray-600 dark:text-gray-400">
                  {pct}%
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
