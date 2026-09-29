import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import SiteFrame from "@/components/SiteFrame";
import CheckoutButton from "@/components/CheckoutButton";
import { unlimitedOffer } from "@/lib/server/sepay";
import { formatVnd } from "@/lib/usage-math";

export const dynamic = "force-dynamic";

const NOTES = {
  success: "SePay đã đưa bạn trở lại. Gói Unlimited chỉ bật sau khi thông báo thanh toán khớp đúng số tiền.",
  error: "Thanh toán không thành công. Bạn có thể thử lại.",
  cancel: "Bạn đã hủy thanh toán. Gói hiện tại không đổi.",
};

export default async function PricingPage({ searchParams }) {
  const params = await searchParams;
  const note = NOTES[params?.payment] || "";
  const session = await getServerSession(authOptions);
  let plan = "free";
  if (session?.user?.id) {
    const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { plan: true } }).catch(() => null);
    plan = user?.plan || "free";
  }
  const offer = unlimitedOffer();

  return (
    <SiteFrame>
      <div className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-12 sm:px-6">
        <div className="text-center">
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-primary">Bảng giá</p>
          <h1 className="mt-3 text-3xl font-black sm:text-5xl">Free, hoặc Unlimited</h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-secondary-text">
            Không bán credit theo lượt. Chat và voice đều được đếm trên trang Usage. Unlimited là gói một lần {offer.priceVnd ? formatVnd(offer.priceVnd) : ""}, thanh toán bằng quét VietQR qua SePay.
          </p>
        </div>
        {note && <p className="rounded-2xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm">{note}</p>}
        <div className="grid gap-4 md:grid-cols-2">
          <article className={`rounded-3xl border p-6 ${plan === "free" ? "border-primary" : "border-divider/50"} bg-bg-card`}>
            <h2 className="text-lg font-black">Free</h2>
            <p className="mt-2 text-3xl font-black">0 ₫</p>
            <ul className="mt-4 space-y-2 text-sm text-secondary-text">
              <li>Chat với nhân vật giả tưởng</li>
              <li>Nói và nghe voice</li>
              <li>Trang Usage của riêng bạn</li>
            </ul>
            {session?.user && plan === "free" && <p className="mt-5 text-xs font-bold text-primary">Đây là gói hiện tại của bạn.</p>}
          </article>
          <article className={`rounded-3xl border p-6 ${plan === "unlimited" ? "border-primary" : "border-divider/50"} bg-bg-card`}>
            <h2 className="text-lg font-black">Unlimited</h2>
            <p className="mt-2 text-3xl font-black">{offer.priceVnd ? formatVnd(offer.priceVnd) : "Giá chưa hợp lệ"}</p>
            <ul className="mt-4 space-y-2 text-sm text-secondary-text">
              <li>Không giới hạn lượt theo gói</li>
              <li>Usage vẫn được ghi để bạn và admin theo dõi</li>
              <li>Thanh toán một lần, tiền vào tài khoản SePay của bạn</li>
            </ul>
            <div className="mt-5">
              <CheckoutButton configured={offer.sellable} currentPlan={plan} />
            </div>
          </article>
        </div>
        <p className="text-xs leading-relaxed text-secondary-text">
          Merchant ID và Secret Key để trống trong biến môi trường cho đến khi bạn điền. Khi chưa có khóa, nút mua ở trạng thái chưa cấu hình và không tạo đơn.
        </p>
      </div>
    </SiteFrame>
  );
}
