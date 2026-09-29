# Voice chat với nhân vật giả tưởng

Ứng dụng Next.js để nói chuyện với persona giả tưởng và nghe họ trả lời. Người dùng chọn nhân vật, nói tiếng Việt hoặc tiếng Anh, rồi nhận câu trả lời bằng chữ và bằng giọng. File ghi âm không được lưu. Câu chữ nằm trong hội thoại.

Repo: [github.com/Huyvux12/character-ai-clone](https://github.com/Huyvux12/character-ai-clone)

Trang quảng cáo tĩnh nằm trên nhánh `landing` và dùng được với GitHub Pages: [huyvux12.github.io/character-ai-clone](https://huyvux12.github.io/character-ai-clone/) sau khi bật Pages theo mục bên dưới.

## Trang trong ứng dụng

| Đường dẫn | Việc |
|---|---|
| `/` | Trang giới thiệu tiếng Việt |
| `/explore` | Thư viện nhân vật, tạo và nhập card |
| `/[tên]/[id]` | Hội thoại, micro, nghe trả lời |
| `/pricing` | Free và Unlimited |
| `/usage` | Số lượt của chính người dùng |
| `/admin` | Console của chủ sản phẩm |
| `/terms`, `/privacy`, `/refund` | Trang pháp lý, chỗ trống để điền tên công ty |

## Gói và thanh toán

Có hai gói. **Free** là mặc định, chat và voice đều dùng được, không có hạn mức cứng. **Unlimited** là 250.000đ, thanh toán một lần bằng VietQR qua SePay, không hết hạn. Gói chỉ bật khi IPN `ORDER_PAID` khớp đúng số tiền. Trang quay lại sau khi quét mã không tự bật gói.

Mỗi tin người dùng, câu trả lời, lần nói và lần nghe được đếm trên `/usage`. Không trừ credit theo lượt.

Admin là email liệt kê trong `ADMIN_EMAILS`. Danh sách trống thì không ai vào được `/admin`. Admin xem usage, đơn, lỗi, nhật ký, khóa tài khoản, trả gói về Free, hoặc ẩn nhân vật công khai.

## Chạy local

Cần Node.js 20+ và một Postgres của riêng app này.

```bash
npm install
copy .env.example .env
npx prisma generate
npx prisma db push
npm run dev
```

Mở http://localhost:3000.

`npx prisma db push` ghi schema của app này (gói, đơn SePay, voice, audit) lên database trong `DATABASE_URL`. Chỉ chạy trên database của app. Đừng đẩy schema lên một Postgres đang dùng chung với ứng dụng khác.

Kiểm tra trước khi deploy:

```bash
npm test
npm run lint
npm run build
```

## Biến môi trường

Mẫu để trống nằm ở `.env.example`.

| Biến | Việc |
|---|---|
| `DATABASE_URL`, `DIRECT_URL` | Postgres của app |
| `NEXTAUTH_SECRET`, `NEXTAUTH_URL` | Phiên đăng nhập |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Đăng nhập Google |
| `ADMIN_EMAILS` | Email admin, cách nhau bởi dấu phẩy |
| `SEPAY_MERCHANT_ID`, `SEPAY_SECRET_KEY` | Để trống đến khi có merchant |
| `SEPAY_ENV` | `sandbox` hoặc `production` |
| `PLAN_UNLIMITED_VND` | Để trống thì giá là 250000 |
| `NEXT_PUBLIC_APP_NAME` | Tên hiển thị. Trống thì dùng Open Character AI |
| `NEXT_PUBLIC_COMPANY_NAME`, `NEXT_PUBLIC_COMPANY_EMAIL`, `NEXT_PUBLIC_COMPANY_ADDRESS` | Điền trước khi công khai trang pháp lý |
| `MU_API_KEY` | Key chat khi không dùng endpoint OpenAI-compatible |
| `LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL` | Chat qua `/chat/completions`. Base URL phải là HTTPS |
| `API_KEY_ENCRYPTION_KEY` | Mã hóa key MuAPI do người dùng tự nhập. Trống thì dùng `NEXTAUTH_SECRET` |
| `GROQ_API_KEY`, `GROQ_STT_MODEL` | Nhận giọng. Model trống thì `whisper-large-v3-turbo` |
| `GEMINI_API_KEY`, `GEMINI_TTS_MODEL` | Đọc trả lời. Model trống thì `gemini-3.8-flash-lite-tts` |
| `AUTO_MEMORY_ENABLED` | `true` thì tóm tắt đoạn chat cũ. Chi phí thuộc về key của nền tảng |

Trong SePay, IPN URL là `https://<domain-app>/api/sepay/ipn`, kiểu xác thực Secret Key, trùng `SEPAY_SECRET_KEY`.

Voice dùng key Groq và Gemini của nền tảng. Micro cần HTTPS hoặc localhost. Mỗi loại voice tối đa 10 request mỗi phút cho một người dùng.

## Trang quảng cáo trên GitHub Pages

Nhánh `main` là ứng dụng. Nhánh `landing` chỉ có `index.html` tĩnh, không chạy Next.js, database hay SePay.

Bật Pages một lần:

1. Mở repo trên GitHub → **Settings** → **Pages**.
2. **Build and deployment** chọn **Deploy from a branch**.
3. Branch **`landing`**, folder **`/ (root)`**, rồi Save.

Sau khi Pages xanh, link quảng cáo là https://huyvux12.github.io/character-ai-clone/

Nút chính trên trang đó đọc meta `app-url` trong `index.html`. Để trống thì nút ghi "Sắp mở cửa". Khi app đã có domain, sửa dòng này trên nhánh `landing` rồi push lại nhánh đó:

```html
<meta name="app-url" content="https://domain-cua-app">
```

## Bố cục code

```
prisma/schema.prisma          User, Character, Chat, Message, đơn SePay, voice, audit
src/app/page.js               Trang giới thiệu
src/app/explore/page.js       Thư viện nhân vật
src/app/pricing/page.js       Hai gói
src/app/usage/page.js         Usage của người dùng
src/app/admin/                Console chủ sản phẩm
src/app/api/sepay/ipn/        IPN SePay
src/app/api/checkout/         Tạo đơn Unlimited
src/app/api/voice/            STT và TTS
src/lib/server/sepay.js       Khóa SePay, chỉ chạy trên server
```
