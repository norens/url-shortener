import type { UrlScan } from "@qurl/shared";

interface Props {
  scans: UrlScan[];
}

export function RecentScans({ scans }: Props) {
  if (!scans.length) {
    return (
      <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6">
        <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
          Recent Scans
        </h3>
        <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
          No scans yet
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6">
      <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
        Recent Scans
      </h3>
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-800">
              <th className="pb-2 text-left font-medium text-gray-500 dark:text-gray-400">
                Time
              </th>
              <th className="pb-2 text-left font-medium text-gray-500 dark:text-gray-400">
                Country
              </th>
              <th className="pb-2 text-left font-medium text-gray-500 dark:text-gray-400">
                City
              </th>
              <th className="pb-2 text-left font-medium text-gray-500 dark:text-gray-400">
                Device
              </th>
              <th className="pb-2 text-left font-medium text-gray-500 dark:text-gray-400">
                Referer
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {scans.map((scan) => (
              <tr key={scan.id}>
                <td className="py-2 text-gray-600 dark:text-gray-400">
                  {new Date(scan.scanned_at).toLocaleString("en", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </td>
                <td className="py-2 text-gray-600 dark:text-gray-400">
                  {scan.country ?? "-"}
                </td>
                <td className="py-2 text-gray-600 dark:text-gray-400">
                  {scan.city ?? "-"}
                </td>
                <td className="py-2 text-gray-600 dark:text-gray-400">
                  {scan.device_type}
                </td>
                <td className="max-w-xs truncate py-2 text-gray-600 dark:text-gray-400">
                  {scan.referer ?? "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
