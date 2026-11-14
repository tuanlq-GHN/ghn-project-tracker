// Vercel Serverless Function: tải ảnh tiến độ lên Vercel Blob và xóa ảnh.
// Cần: Vercel → Storage → Blob (Public) kết nối vào dự án → tự có biến BLOB_READ_WRITE_TOKEN.
// Ảnh được nén sẵn trên trình duyệt (≤ 1600px, JPEG) trước khi gửi lên.

const { put, del } = require('@vercel/blob');

const MAX_BYTES = 3 * 1024 * 1024; // 3MB sau khi nén
const safe = (s) => String(s || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40) || 'x';

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  const pass = process.env.APP_PASSCODE;
  if (pass && req.headers['x-passcode'] !== pass) {
    return res.status(401).json({ error: 'Sai hoặc thiếu mã truy cập' });
  }
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return res.status(503).json({ error: 'Chưa kết nối kho ảnh (Vercel Blob) cho dự án' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});

    if (req.method === 'POST') {
      const buf = Buffer.from(String(body.data || ''), 'base64');
      if (!buf.length) return res.status(400).json({ error: 'Không có dữ liệu ảnh' });
      if (buf.length > MAX_BYTES) return res.status(413).json({ error: 'Ảnh quá lớn (tối đa 3MB sau khi nén)' });
      // Chỉ nhận JPEG/PNG/WebP (kiểm tra chữ ký file)
      const isJpeg = buf[0] === 0xff && buf[1] === 0xd8;
      const isPng = buf[0] === 0x89 && buf[1] === 0x50;
      const isWebp = buf.slice(8, 12).toString() === 'WEBP';
      const isPdf = buf.slice(0, 5).toString() === '%PDF-';
      if (!isJpeg && !isPng && !isWebp && !isPdf) return res.status(415).json({ error: 'Định dạng không hỗ trợ (chỉ nhận JPG, PNG, WebP, PDF)' });
      const ext = isJpeg ? 'jpg' : isPng ? 'png' : isWebp ? 'webp' : 'pdf';
      const type = isPdf ? 'application/pdf' : `image/${ext === 'jpg' ? 'jpeg' : ext}`;

      const path = `ghn-pt/${safe(body.projectId)}/${safe(body.taskId)}/${Date.now()}.${ext}`;
      const blob = await put(path, buf, {
        access: 'public',
        contentType: type,
        addRandomSuffix: true,
      });
      return res.status(200).json({ url: blob.url });
    }

    if (req.method === 'DELETE') {
      const url = String(body.url || '');
      let host = '';
      try { host = new URL(url).hostname; } catch (e) { /* bỏ qua */ }
      if (!host.endsWith('.blob.vercel-storage.com') || !url.includes('/ghn-pt/')) {
        return res.status(400).json({ error: 'Đường dẫn ảnh không hợp lệ' });
      }
      await del(url);
      return res.status(200).json({ ok: true });
    }

    res.setHeader('Allow', 'POST, DELETE');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Lỗi máy chủ: ' + e.message });
  }
};
