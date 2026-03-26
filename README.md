<div align="center">
  <h1>🏦 MBBank Panel PRO</h1>
  <p><strong>Comprehensive Automation & Transaction Monitoring for MB Bank</strong></p>
  <p>
    <img src="https://img.shields.io/badge/Node.js-20.x-green" alt="Node" />
    <img src="https://img.shields.io/badge/Vue.js-3.x-4fc08d" alt="Vue" />
    <img src="https://img.shields.io/badge/TypeScript-5.x-blue" alt="TypeScript" />
    <img src="https://img.shields.io/badge/Docker-Ready-2496ED" alt="Docker" />
  </p>
</div>

## 🌟 Thông tin Dự Án (Overview)

**MBBank Panel PRO** là một hệ thống tự động hoá và giám sát giao dịch ngân hàng mạnh mẽ. Được xây dựng lại hoàn toàn bằng TypeScript, hệ thống không phụ thuộc vào trình duyệt ẩn danh (Puppeteer) nặng nề mà kết nối trực tiếp vào luồng API của ứng dụng MB Bank thông qua WebAssembly (WASM) và mô hình học máy OCR cục bộ.

> 🛠 **Developed by Dang Quoc Huy with ❤️**

---

## ⚡ Tính năng Nổi Bật (Features)

1. **Auto Login & Captcha Giải Mã Tự Động**: 
   - Tự động vượt qua Captcha bằng AI OCR (Mô hình ONNX cục bộ). Không cần API bên thứ 3.
   - Cơ chế tự động thử lại (Retry) thông minh.
   - Duy trì Session API 24/7.
2. **Theo Dõi Giao Dịch Thời Gian Thực (Transaction Monitor)**:
   - Theo dõi số dư `Balance` và Biến động số dư `Transactions` ngầm.
3. **Multi-Channel Notifications (Cảnh báo thông minh)**:
   - Tích hợp 3 kênh nhận thông báo mạnh mẽ: **Telegram**, **Discord**, và custom **Webhooks**.
   - Phân tích và báo động ngay lập tức khi phát hiện có giao dịch mới (Credit/Debit).
4. **Bảo Mật API Nguyên Bản (WASM Engine)**:
   - Cơ chế mã hoá chữ ký `dataEnc` chính chủ từ nền tảng ứng dụng MB Bank bằng Go WASM.
5. **Giao Diện Quản Trị Chuyên Nghiệp (Vue 3 UI)**:
   - Dashboard báo cáo trực quan, có biểu đồ thống kê, QR hoá đơn tự động (VietQR).
   - Hỗ trợ Dark Mode & Light Mode chuẩn chỉ.
   - Đa ngôn ngữ (Tiếng Việt & Tiếng Anh).

---

## 🚀 Hướng Dẫn Cài Đặt (Deployment)

Hệ thống được thiết kế tối ưu nhất khi chạy với **Docker**. Tuy nhiên bạn cũng có thể tự chạy môi trường Node.js local.

### 1. Chuẩn Bị File Cấu Hình `.env`

Tạo một file `.env` ở thư mục gốc (Hoặc copy từ `.env.example`). Bạn có thể đổi Port linh hoạt để không bị đụng độ với các services khác:

```env
# Port dành cho Docker và Backend Server
PORT=2001

# Port dành riêng cho chế độ Code Dev Frontend (tuỳ chọn)
VITE_PORT=2000
```

### 2. Chạy bằng Docker (Khuyên dùng cho Máy chủ/VPS)

Đây là cách an toàn và gọn gàng nhất. Frontend tĩnh và Backend API sẽ được phục vụ chung qua một Port duy nhất!

```bash
docker-compose up -d --build
```

Mở trình duyệt, truy cập vào `http://localhost:2001` (hoặc Port bạn cấu hình) và hưởng thụ! 🎉 Mọi dữ liệu cài đặt cài đặt (Telegram/Discord) sẽ được sao lưu an toàn tự động ra bên ngoài trong thư mục `server/data/`.

---

### 3. Chạy Bằng Node.js (Môi trường Phát Triển)

Yêu cầu: `Node.js >= 20`

1. **Cài đặt thư viện:**
   ```bash
   npm install
   ```

2. **Chạy Frontend (Port 2000):**
   ```bash
   npm run dev
   ```

3. **Chạy Backend Server (Port 2001):**
   Mở một Terminal phụ và chạy:
   ```bash
   npm run server
   ```

---

## 🔧 Phân Nhánh Thư Mục (Directory Structure)

```text
mb-bank-tool/
├── server/
│   ├── index.ts               # Backend Entrypoint (Express)
│   ├── routes/                # API REST Routes
│   ├── services/
│   │   ├── mb-bank.ts         # Core MB Bank Services
│   │   ├── captcha-ocr.ts     # ONNX AI Runtime cho Captcha
│   │   ├── wasm-engine.ts     # Go WASM Encryiption Bridge
│   │   ├── monitor.ts         # Cronjob theo dõi giao dịch ngầm
│   │   └── notifier.ts        # Bắn thông báo Telegram/Discord/Webhook
│   ├── model.onnx             # Model nhận diện Captcha AI
│   └── data/                  # Lưu trữ config (Settings.json)
├── src/                       # Frontend Vue.js Assets
│   ├── App.vue                # Khung sườn & Layout hệ thống
│   ├── views/                 # Chứa các màn hình (Dashboard, Settings, API Docs...)
│   └── locales/               # Cấu hình đa ngôn ngữ (EN, VI)
├── Dockerfile
├── docker-compose.yml
└── package.json
```

---

## 📚 Tích Hợp (API Integration Docs)

Hệ thống đi kèm tính năng **API Docs** ngay trên thanh Menu của phần mềm! Bạn có thể dùng API của dự án này để rẽ nhánh tích hợp với code PHP/C#/Python của hệ thống bạn. Xem chi tiết Code Example (Node/Python/cURL) ngay bên trong App.

---

## ⚖️ License & Disclaimer

### License
Dự án này được phát hành dưới giấy phép **MIT License**. Bạn có toàn quyền sử dụng, sao chép và chỉnh sửa mã nguồn. Xem chi tiết trong file [LICENSE](LICENSE).

### Disclaimer (Miễn trừ trách nhiệm)
**MBBank Panel PRO** được phát triển hoàn toàn với **mục đích giáo dục, nghiên cứu thuật toán tự động hoá và cá nhân học hỏi**. 
Dự án được cung cấp nguyên bản "AS IS", không đi kèm bất kỳ bảo hành nào.
Tác giả (**Dang Quoc Huy**) **TUYỆT ĐỐI KHÔNG CHỊU BẤT KỲ TRÁCH NHIỆM PHÁP LÝ NÀO** cho những rủi ro, thiệt hại hoặc hậu quả gây ra bởi việc lạm dụng công cụ này vào các mục đích vi phạm điều khoản dịch vụ của MB Bank (Terms of Service) hoặc vi phạm pháp luật hiện hành. Người dùng tự chịu mọi trách nhiệm về hành vi của mình khi sử dụng bộ công cụ này.

> 🌟 *Phát triển bởi Dang Quoc Huy - Phục vụ thuần tuý cho mục đích nghiên cứu công nghệ.*
