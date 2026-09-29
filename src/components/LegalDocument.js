import SiteFrame from "@/components/SiteFrame";
import config from "@/lib/config";
import { companyField } from "@/lib/usage-math";

export default function LegalDocument({ title, children }) {
  const company = companyField(config.company.name, "tên công ty");
  const email = companyField(config.company.email, "email liên hệ");
  const address = companyField(config.company.address, "địa chỉ");

  return (
    <SiteFrame>
      <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-primary">{config.appName}</p>
        <h1 className="mt-3 text-3xl font-black">{title}</h1>
        <p className="mt-3 text-sm text-secondary-text">{company} · {email} · {address}</p>
        <div className="mt-8 space-y-4 text-sm leading-relaxed text-secondary-text">{children}</div>
      </article>
    </SiteFrame>
  );
}
