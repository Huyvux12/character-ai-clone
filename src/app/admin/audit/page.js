import { prisma } from "@/lib/prisma";
import { formatWhen } from "@/lib/usage-math";

export const dynamic = "force-dynamic";

export default async function AdminAuditPage() {
  let entries = [];
  let error = "";
  try {
    entries = await prisma.adminAuditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { admin: { select: { email: true } } },
    });
  } catch (err) {
    error = err.message;
  }
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-black">Nhật ký thao tác</h1>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <ul className="space-y-2 text-sm">
        {entries.length === 0 && <li className="text-secondary-text">Chưa có dòng nào.</li>}
        {entries.map((entry) => (
          <li key={entry.id} className="rounded-xl border border-divider/40 px-3 py-2">
            <p className="font-bold">{entry.action} · {entry.targetType}</p>
            <p className="text-xs text-secondary-text">{entry.admin?.email || "hệ thống"} · {formatWhen(entry.createdAt)} · {entry.targetId}</p>
            {entry.reason && <p className="text-xs">{entry.reason}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}
