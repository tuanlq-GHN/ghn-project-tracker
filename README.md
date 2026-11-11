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

Dữ liệu được **lưu tự động trong trình duyệt** (localStorage) của từng máy:

- Dùng **Sao lưu** để tải file `.json`, và **Khôi phục** để nạp lại trên máy khác hoặc chia sẻ cho đồng nghiệp.
- Xóa dữ liệu duyệt web sẽ mất dữ liệu, nên hãy sao lưu định kỳ.

## Chạy

- Mở trực tiếp `index.html` bằng trình duyệt, hoặc
- Dùng GitHub Pages: *Settings → Pages → Deploy from branch → `main` / root*.

## Cấu trúc

```
index.html
assets/css/style.css   # giao diện
assets/js/seed.js      # dữ liệu khởi tạo (dự án nhận bàn giao mặt bằng 20/11)
assets/js/app.js       # logic ứng dụng
assets/img/ghn-logo.png
```
