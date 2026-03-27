interface Props {
  data: { country: string; clicks: number }[];
}

export function CountryList({ data }: Props) {
  if (!data.length) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h3 className="text-sm font-medium text-gray-900">Top Countries</h3>
        <p className="mt-4 text-sm text-gray-500">No data yet</p>
      </div>
    );
  }

  const max = data[0]?.clicks ?? 1;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <h3 className="text-sm font-medium text-gray-900">Top Countries</h3>
      <div className="mt-4 space-y-3">
        {data.map((item) => (
          <div key={item.country} className="flex items-center gap-3">
            <span className="w-8 text-sm font-medium text-gray-700">
              {item.country}
            </span>
            <div className="flex-1">
              <div className="h-2 rounded-full bg-gray-100">
                <div
                  className="h-2 rounded-full bg-blue-500"
                  style={{ width: `${(item.clicks / max) * 100}%` }}
                />
              </div>
            </div>
            <span className="text-sm text-gray-600">
              {item.clicks.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
