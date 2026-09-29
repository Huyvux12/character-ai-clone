"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  ["/admin", "Tổng quan"],
  ["/admin/users", "Người dùng"],
  ["/admin/characters", "Nhân vật"],
  ["/admin/orders", "Đơn SePay"],
  ["/admin/health", "Lỗi hệ thống"],
  ["/admin/audit", "Nhật ký"],
];

export default function AdminShell({ email, children }) {
  const pathname = usePathname();
  return (
    <div className="studio-shell min-h-dvh text-primary-text">
      <header className="border-b border-divider/50 px-4 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-secondary-text">Vận hành</p>
          <Link href="/admin" className="font-black text-lg">Admin</Link>
        </div>
        <nav className="flex flex-wrap gap-2 text-xs font-bold">
          {LINKS.map(([href, label]) => {
            const active = pathname === href;
            return (
              <Link key={href} href={href} className={`rounded-full px-3 py-1.5 border ${active ? "bg-primary text-white border-primary" : "border-divider text-secondary-text"}`}>
                {label}
              </Link>
            );
          })}
        </nav>
        <Link href="/explore" className="text-xs font-bold text-secondary-text">Về app</Link>
      </header>
      <div className="max-w-6xl mx-auto px-4 py-6">{children}</div>
      <p className="text-center text-[11px] text-secondary-text pb-6">{email}</p>
    </div>
  );
}
