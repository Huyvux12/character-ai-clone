import LegalDocument from "@/components/LegalDocument";
import config from "@/lib/config";

export const metadata = { title: `Quyền riêng tư — ${config.appName}` };

export default function PrivacyPage() {
  return (
    <LegalDocument title="Quyền riêng tư">
      <p>Đăng nhập dùng Google. Chúng tôi lưu tên, email và ảnh hồ sơ mà Google trả về để nhận ra tài khoản của bạn.</p>
      <p>Hội thoại chữ, nhân vật bạn tạo và bản tóm tắt câu chuyện được lưu trong database để bạn mở lại. File ghi âm từ micro không được lưu. Hệ thống chỉ giữ transcript và câu trả lời chữ.</p>
      <p>Lượt chat và lượt voice được đếm để hiện trên trang Usage của bạn và trên console vận hành. Thanh toán đi qua SePay. Chúng tôi lưu mã hóa đơn, số tiền và trạng thái đơn, không lưu thông tin thẻ.</p>
      <p>Key MuAPI nếu bạn tự nhập được mã hóa trước khi lưu và không được trả lại qua API.</p>
    </LegalDocument>
  );
}
