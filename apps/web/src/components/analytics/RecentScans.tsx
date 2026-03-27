import type { UrlScan } from "@qurl/shared";

interface Props {
  scans: UrlScan[];
}

export function RecentScans({ scans }: Props) {
  if (!scans.length) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h3 className="text-sm font-medium text-gray-900">Recent Scans</h3>
        <p className="mt-4 text-sm text-gray-500">No scans yet</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <h3 className="text-sm font-medium text-gray-900">Recent Scans</h3>
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="pb-2 text-left font-medium text-gray-500">Time</th>
              <th className="pb-2 text-left font-medium text-gray-500">Country</th>
              <th className="pb-2 text-left font-medium text-gray-500">City</th>
              <th className="pb-2 text-left font-medium text-gray-500">Device</th>
              <th className="pb-2 text-left font-medium text-gray-500">Referer</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {scans.map((scan) => (
              <tr key={scan.id}>
                <td className="py-2 text-gray-600">
                  {new Date(scan.scanned_at).toLocaleString("en", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </td>
                <td className="py-2 text-gray-600">{scan.country ?? "-"}</td>
                <td className="py-2 text-gray-600">{scan.city ?? "-"}</td>
                <td className="py-2 text-gray-600">{scan.device_type}</td>
                <td className="max-w-xs truncate py-2 text-gray-600">
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
