import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import config from "@/lib/config";
import SiteFrame from "@/components/SiteFrame";
import { formatVnd, resolveUnlimitedPrice } from "@/lib/usage-math";

export const dynamic = "force-dynamic";

const STEPS = [
  ["Chọn nhân vật", "Mở một persona có sẵn hoặc tạo nhân vật giả tưởng của riêng bạn."],
  ["Nói", "Bấm micro, nói tiếng Việt hoặc tiếng Anh. Giọng nói được nhận dạng ngay trong trình duyệt."],
  ["Nghe trả lời", "Nhân vật trả lời bằng chữ và bằng giọng. File ghi âm không được lưu lại."],
];

const QUESTIONS = [
  ["Đây có phải người thật không?", "Không. Nhân vật là persona giả tưởng do bạn hoặc hệ thống tạo ra, để trò chuyện và nhập vai."],
  ["Usage được tính thế nào?", "Mỗi tin bạn gửi, mỗi câu trả lời, mỗi lần nói và mỗi lần nghe đều được đếm. Trang Usage cho bạn xem số liệu của chính mình. Gói không trừ credit theo lượt."],
  ["Unlimited khác Free chỗ nào?", "Free là gói mặc định. Unlimited là gói đã thanh toán 250.000đ, được đánh dấu không giới hạn và theo dõi riêng trong admin."],
];

async function featuredCharacters() {
  try {
    return await prisma.character.findMany({
      where: { isPublic: true, moderationStatus: "visible" },
      orderBy: { createdAt: "desc" },
      take: 4,
      select: { id: true, name: true, avatar: true, profileUrl: true, description: true },
    });
  } catch {
    return [];
  }
}

export default async function LandingPage() {
  const [session, characters] = await Promise.all([
    getServerSession(authOptions),
    featuredCharacters(),
  ]);
  const startHref = session?.user ? "/explore" : "/login?callbackUrl=/explore";
  const price = resolveUnlimitedPrice();

  return (
    <SiteFrame>
      <section className="mx-auto grid max-w-6xl items-center gap-8 px-4 py-14 sm:px-6 lg:grid-cols-[1.2fr_0.8fr] lg:py-20">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-primary">Voice chat nhân vật giả tưởng</p>
          <h1 className="mt-4 max-w-xl font-black text-4xl leading-tight tracking-tight sm:text-6xl">
            Nói chuyện với nhân vật, và nghe họ trả lời.
          </h1>
          <p className="mt-5 max-w-lg text-sm leading-relaxed text-secondary-text sm:text-base">
            {config.appName} là nơi bạn chọn một persona, nói bằng giọng của mình, rồi nhận câu trả lời thành tiếng. Phù hợp để nhập vai, kể chuyện và thử nhân vật do cộng đồng tạo.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href={startHref} className="rounded-full bg-primary px-5 py-3 text-sm font-black text-white">Bắt đầu trò chuyện</Link>
            <Link href="/pricing" className="rounded-full border border-divider px-5 py-3 text-sm font-bold">Xem gói Free và Unlimited</Link>
          </div>
        </div>
        <div className="rounded-3xl border border-divider/60 bg-bg-card p-6 shadow-2xl">
          <p className="text-[10px] font-black uppercase tracking-widest text-secondary-text">Một lượt voice</p>
          <div className="mt-5 space-y-3 text-sm">
            <p className="ml-auto w-fit max-w-[80%] rounded-2xl bg-primary px-4 py-3 font-semibold text-white">Kể tôi nghe vì sao bầu trời ở đây có hai mặt trăng.</p>
            <p className="max-w-[85%] rounded-2xl border border-divider bg-bg-page px-4 py-3 leading-relaxed">Ta đã thấy chúng từ khi còn là đứa trẻ giữ hải đăng. Một mặt kéo thủy triều. Mặt kia chỉ để nhắc người ta nhớ đường về.</p>
          </div>
          <p className="mt-5 text-[11px] text-secondary-text">Bản ghi âm bị bỏ sau khi có transcript. Câu chữ nằm trong hội thoại của bạn.</p>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-4 pb-14 sm:grid-cols-3 sm:px-6">
        {STEPS.map(([title, copy], index) => (
          <article key={title} className="rounded-2xl border border-divider/50 bg-bg-card p-5">
            <p className="text-xs font-black text-primary">0{index + 1}</p>
            <h2 className="mt-3 text-lg font-black">{title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-secondary-text">{copy}</p>
          </article>
        ))}
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-14 sm:px-6">
        <div className="mb-4 flex items-end justify-between gap-4">
          <h2 className="text-2xl font-black">Nhân vật đang mở</h2>
          <Link href="/explore" className="text-xs font-bold text-primary">Vào thư viện</Link>
        </div>
        {characters.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-divider p-8 text-sm text-secondary-text">Thư viện sẽ hiện ở đây khi đã kết nối database.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {characters.map((character) => (
              <Link key={character.id} href="/explore" className="rounded-2xl border border-divider/50 bg-bg-card p-4 hover:-translate-y-0.5 transition">
                <div className="flex h-28 items-center justify-center overflow-hidden rounded-xl bg-bg-page text-5xl">
                  {character.profileUrl ? <img src={character.profileUrl} alt="" className="h-full w-full object-cover" /> : character.avatar}
                </div>
                <h3 className="mt-3 font-black">{character.name}</h3>
                <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-secondary-text">{character.description}</p>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-4 pb-14 sm:px-6 md:grid-cols-2">
        <article className="rounded-3xl border border-divider/50 bg-bg-card p-6">
          <h2 className="text-xl font-black">Free</h2>
          <p className="mt-2 text-3xl font-black">0 ₫</p>
          <p className="mt-3 text-sm leading-relaxed text-secondary-text">Dùng chat và voice. Mọi lượt được ghi vào trang Usage của bạn. Không trừ credit theo tin nhắn.</p>
        </article>
        <article className="rounded-3xl border border-primary bg-bg-card p-6">
          <h2 className="text-xl font-black">Unlimited</h2>
          <p className="mt-2 text-3xl font-black">{price ? formatVnd(price) : "Chưa cấu hình giá"}</p>
          <p className="mt-3 text-sm leading-relaxed text-secondary-text">Một lần thanh toán qua SePay, quét VietQR. Gói được đánh dấu không giới hạn sau khi SePay xác nhận tiền vào.</p>
          <Link href="/pricing" className="mt-5 inline-flex rounded-full bg-primary px-4 py-2 text-xs font-black text-white">Mua trên trang giá</Link>
        </article>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <h2 className="text-2xl font-black">Câu hỏi thường gặp</h2>
        <div className="mt-4 space-y-3">
          {QUESTIONS.map(([title, copy]) => (
            <article key={title} className="rounded-2xl border border-divider/50 bg-bg-card p-5">
              <h3 className="font-black">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-secondary-text">{copy}</p>
            </article>
          ))}
        </div>
      </section>
    </SiteFrame>
  );
}
