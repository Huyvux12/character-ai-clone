import { Inter, Outfit } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import config from "@/lib/config";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

export const metadata = {
  title: `${config.appName} — Voice chat với nhân vật giả tưởng`,
  description: "Chọn một nhân vật giả tưởng, nói bằng giọng của bạn và nghe nhân vật trả lời. Hội thoại được lưu; file ghi âm không được lưu.",
};

export default function RootLayout({ children }) {
  const theme = config?.theme || "slate-indigo";

  return (
    <html lang="vi" className={`h-full scroll-smooth ${inter.variable} ${outfit.variable}`} data-theme={theme}>
      <body
        className={`${inter.className} min-h-full flex flex-col antialiased bg-bg-page text-primary-text`}
      >
        <Providers>
          <main className="relative z-10 flex-1 flex flex-col">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
