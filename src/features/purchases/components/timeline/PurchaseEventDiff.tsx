import { getPurchaseEventDiffRows } from "@/features/purchases/utils/purchase-event-labels";

type Props = {
  oldValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
};

export function PurchaseEventDiff({ oldValues, newValues }: Props) {
  const rows = getPurchaseEventDiffRows(oldValues, newValues);

  if (!rows.length) return null;

  return (
    <div className="mt-3 overflow-hidden rounded-sm border border-black/10">
      <table className="w-full text-xs">
        <thead className="bg-black/[0.03] text-black/55">
          <tr>
            <th className="px-3 py-2 text-left font-semibold">Campo</th>
            <th className="px-3 py-2 text-left font-semibold">Antes</th>
            <th className="px-3 py-2 text-left font-semibold">Después</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.field} className="border-t border-black/10">
              <td className="px-3 py-2 font-medium text-black">{row.field}</td>
              <td className="max-w-72 break-words px-3 py-2 text-black/60">{row.before}</td>
              <td className="max-w-72 break-words px-3 py-2 text-black/75">{row.after}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
