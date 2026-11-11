# GHN Project Tracker

Trang web theo dõi tiến độ dự án Kho, giao diện theo tông màu GHN. Đây là trang tĩnh (HTML/CSS/JS thuần), không cần server hay cơ sở dữ liệu.

## Tính năng

- **Nhiều dự án**: danh sách dự án sắp xếp theo ngày bắt đầu (cũ → mới hoặc ngược lại), tìm kiếm, nhân bản dự án làm mẫu.
- **Tổng quan**: tiến độ %, việc quá hạn, việc chưa có PIC, mốc quan trọng, lịch sử cập nhật.
- **Checklist công việc**: thêm/sửa/xóa, nhóm theo hạng mục, PIC, ngày bắt đầu, hạn chót, ưu tiên, trạng thái; lọc và tìm kiếm; xuất Excel (CSV).
- **Layout zone & Cổng**: sơ đồ 12 zone, bấm vào zone để cập nhật trạng thái lắp Tele. Zone đã lắp được khóa, cấm nhà thầu vào. Quản lý cổng ra/vào (cổng 2 & 3).
- **Đào tạo**: xe nâng điện, quy trình PDA: ngày học, số tiếng, học viên, giảng viên/PIC.
- **Nhà thầu**: các đầu mục cần hỏi/xác nhận và phản hồi của nhà thầu.
- **Nhân sự & PIC**: danh sách người phụ trách, gán PIC nhanh cho việc chưa có người.
- **Timeline (Gantt)**: biểu đồ thời gian theo hạng mục, có vạch "Hôm nay".
- Giao diện sáng/tối, dùng được trên điện thoại, in hoặc lưu PDF.

## Lưu trữ dữ liệu

| Cách chạy | Dữ liệu |
|---|---|
| **Vercel + Upstash Redis** | Lưu trên máy chủ, **mọi người dùng chung**. Thay đổi của người khác tự hiện sau khoảng 15 giây. Nếu hai người sửa cùng lúc, hệ thống tự gộp theo từng dự án. |
| GitHub Pages / mở file trực tiếp | Lưu trong trình duyệt của từng máy. Chia sẻ bằng **Sao lưu / Khôi phục** (file `.json`). |

## Triển khai lên Vercel (dữ liệu dùng chung)

1. Vào <https://vercel.com>, đăng nhập bằng **Continue with GitHub**.
2. Chọn **Add New… → Project**, chọn repo `ghn-project-tracker`, rồi bấm **Import**.
3. Ở *Framework Preset* chọn **Other** và giữ nguyên các mục khác. Bấm **Deploy**.
4. Trong dự án vừa tạo, mở tab **Storage**, chọn **Create Database → Upstash for Redis (Marketplace)**. Chọn gói **Free**, đặt tên, rồi **Connect** vào dự án `ghn-project-tracker`. Vercel sẽ tự thêm biến `KV_REST_API_URL` và `KV_REST_API_TOKEN`.
5. *(Nên làm)* Vào **Settings → Environment Variables** và thêm `APP_PASSCODE` = mã truy cập chung của nhóm. Khi có mã này, ai không biết mã sẽ không xem hay sửa được.
6. Vào **Deployments**, bấm **⋯** ở bản mới nhất rồi chọn **Redeploy** để áp dụng biến môi trường.
7. Mở link dạng `https://ghn-project-tracker.vercel.app`. Lần mở đầu tiên, dữ liệu trên trình duyệt đó sẽ được đưa lên làm bản chung.

Sau này mỗi lần push code lên nhánh `main`, Vercel tự triển khai lại.

## Chạy khác

- Mở trực tiếp `index.html` bằng trình duyệt, hoặc
- Dùng GitHub Pages: *Settings → Pages → Deploy from branch → `main` / root*.

## Cấu trúc

```
index.html
api/data.js            # API lưu dữ liệu chung (Vercel Function + Upstash Redis)
assets/css/style.css   # giao diện
assets/js/seed.js      # dữ liệu khởi tạo (dự án nhận bàn giao mặt bằng 20/11)
assets/js/app.js       # logic ứng dụng
assets/img/ghn-logo.png
```
