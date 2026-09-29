import LegalDocument from "@/components/LegalDocument";
import config from "@/lib/config";

export const metadata = { title: `Hoàn tiền — ${config.appName}` };

export default function RefundPage() {
  return (
    <LegalDocument title="Hoàn tiền">
      <p>Gói Unlimited là thanh toán một lần. Credit không được cộng theo lượt, nên không có ví credit để hoàn.</p>
      <p>Trang cảm ơn của trình duyệt không tự bật gói. Gói chỉ chuyển sang Unlimited khi SePay gửi thông báo khớp mã đơn và đúng số tiền.</p>
      <p>Nếu tiền đã trừ nhưng gói chưa bật sau 30 phút, viết cho email liên hệ ở đầu trang kèm mã hóa đơn INV. Đây là chính sách mẫu: hãy sửa thời hạn và điều kiện hoàn trước khi nhận thanh toán thật.</p>
      <p>Giao dịch VOID từ SePay được ghi vào nhật ký để admin xem. Đợt này không tự gỡ gói Unlimited khi nhận VOID.</p>
    </LegalDocument>
  );
}
