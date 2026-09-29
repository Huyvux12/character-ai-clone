import { getUsageOverview } from "@/lib/usage";
import { formatVnd, formatWhen } from "@/lib/usage-math";

export const dynamic = "force-dynamic";

function Stat({ label, value }) {
  return (
    <article className="rounded-2xl border border-divider/50 bg-bg-card p-4">
      <p className="text-[11px] font-bold uppercase tracking-wider text-secondary-text">{label}</p>
      <p className="mt-2 text-2xl font-black">{value}</p>
    </article>
  );
}

export default async function AdminHome() {
  let data;
  try {
    data = await getUsageOverview();
  } catch (error) {
    return <p className="text-sm text-secondary-text">Chưa đọc được số liệu. {error.message}</p>;
  }
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-black">Tổng quan</h1>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Người dùng" value={data.users} />
        <Stat label="Unlimited / Free" value={`${data.unlimited} / ${data.free}`} />
        <Stat label="Đơn paid hôm nay" value={`${data.paidTodayCount} · ${formatVnd(data.paidTodayVnd)}`} />
        <Stat label="Lỗi 24 giờ" value={`${data.failedGenerations} chat · ${data.failedVoice} voice`} />
        <Stat label="Tin người dùng trong tháng" value={data.monthMessages} />
        <Stat label="Voice thành công trong tháng" value={data.monthVoice} />
      </div>
      <section>
        <h2 className="text-lg font-black">Nhật ký mới</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {data.recentAudits.length === 0 && <li className="text-secondary-text">Chưa có thao tác.</li>}
          {data.recentAudits.map((entry) => (
            <li key={entry.id} className="rounded-xl border border-divider/40 px-3 py-2">
              <span className="font-bold">{entry.action}</span>
              <span className="text-secondary-text"> · {entry.admin?.email || "hệ thống"} · {formatWhen(entry.createdAt)}</span>
              {entry.reason && <p className="text-xs text-secondary-text">{entry.reason}</p>}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
