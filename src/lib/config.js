const config = {
  appName: process.env.NEXT_PUBLIC_APP_NAME || "Open Character AI",
  theme: process.env.NEXT_PUBLIC_THEME || "slate-indigo",
  company: {
    name: process.env.NEXT_PUBLIC_COMPANY_NAME || "",
    email: process.env.NEXT_PUBLIC_COMPANY_EMAIL || "",
    address: process.env.NEXT_PUBLIC_COMPANY_ADDRESS || "",
  },
  auth: {
    url: process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3000",
  },
};

export default config;
