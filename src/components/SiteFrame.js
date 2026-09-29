import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function SiteFrame({ children }) {
  return (
    <div className="studio-shell flex min-h-dvh flex-col text-primary-text">
      <Navbar />
      <div className="flex-1">{children}</div>
      <Footer />
    </div>
  );
}
