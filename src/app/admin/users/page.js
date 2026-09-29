import { searchUsers } from "@/lib/admin-data";
import { UserActions } from "@/components/admin/RowActions";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage({ searchParams }) {
  const params = await searchParams;
  const q = String(params?.q || "");
  let users = [];
  let error = "";
  try {
    users = await searchUsers(q);
  } catch (err) {
    error = err.message;
  }
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-black">Người dùng</h1>
      <form className="flex gap-2">
        <input name="q" defaultValue={q} placeholder="Email hoặc tên" className="flex-1 rounded-full border border-divider bg-bg-card px-4 py-2 text-sm" />
        <button className="rounded-full bg-primary px-4 py-2 text-xs font-black text-white">Tìm</button>
      </form>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <div className="space-y-3">
        {users.map((user) => (
          <article key={user.id} className="flex flex-col gap-3 rounded-2xl border border-divider/50 bg-bg-card p-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="font-bold">{user.email || "Không có email"}</p>
              <p className="text-xs text-secondary-text">{user.name || "—"} · {user.plan} · tháng này {user.messages} tin, {user.voice} voice</p>
              {user.disabledAt && <p className="text-xs text-red-400">Đang khóa{user.disabledReason ? `: ${user.disabledReason}` : ""}</p>}
            </div>
            <UserActions user={user} />
          </article>
        ))}
      </div>
    </div>
  );
}
