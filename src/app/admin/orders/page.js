import { prisma } from "@/lib/prisma";
import { formatVnd, formatWhen } from "@/lib/usage-math";

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage() {
  let orders = [];
  let error = "";
  try {
    orders = await prisma.paymentOrder.findMany({
      orderBy: { createdAt: "desc" },
      take: 80,
      include: { user: { select: { email: true, plan: true } } },
    });
  } catch (err) {
    error = err.message;
  }
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-black">Đơn SePay</h1>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="text-secondary-text">
            <tr>
              <th className="py-2 pr-3">Hóa đơn</th>
              <th className="py-2 pr-3">User</th>
              <th className="py-2 pr-3">Tiền</th>
              <th className="py-2 pr-3">Trạng thái</th>
              <th className="py-2">Thời điểm</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id} className="border-t border-divider/40">
                <td className="py-2 pr-3 font-bold">{order.invoiceNumber}</td>
                <td className="py-2 pr-3">{order.user?.email} · {order.user?.plan}</td>
                <td className="py-2 pr-3">{formatVnd(order.amountVnd)}</td>
                <td className="py-2 pr-3">{order.status}</td>
                <td className="py-2">{formatWhen(order.paidAt || order.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
