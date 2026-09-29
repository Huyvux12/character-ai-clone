import LegalDocument from "@/components/LegalDocument";
import config from "@/lib/config";

export const metadata = { title: `Điều khoản — ${config.appName}` };

export default function TermsPage() {
  return (
    <LegalDocument title="Điều khoản sử dụng">
      <p>Trang này là bản mẫu. Hãy điền tên công ty, email và địa chỉ bằng biến NEXT_PUBLIC_COMPANY_NAME, NEXT_PUBLIC_COMPANY_EMAIL và NEXT_PUBLIC_COMPANY_ADDRESS trước khi dùng cho khách hàng.</p>
      <p>{config.appName} cho phép bạn trò chuyện bằng chữ và giọng nói với nhân vật giả tưởng. Nhân vật không phải người thật. Bạn không được dùng sản phẩm để mạo danh một người thật nhằm lừa đảo.</p>
      <p>Bạn giữ trách nhiệm với nội dung mình nhập, nhân vật mình tạo và cách mình chia sẻ hội thoại. Chúng tôi có thể ẩn nhân vật công khai hoặc khóa tài khoản khi nội dung vi phạm pháp luật Việt Nam.</p>
      <p>Gói Free là gói mặc định. Gói Unlimited có giá niêm yết trên trang bảng giá và chỉ được kích hoạt sau khi SePay xác nhận thanh toán.</p>
    </LegalDocument>
  );
}
