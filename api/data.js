// Vercel Serverless Function: lưu dữ liệu dùng chung cho mọi người.
// Lưu trữ: Upstash Redis (thêm qua Vercel → Storage → Upstash for Redis).
// Biến môi trường:
//   KV_REST_API_URL / KV_REST_API_TOKEN   (tự thêm khi kết nối Upstash trên Vercel)
//   hoặc UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN
//   APP_PASSCODE (tuỳ chọn): mã truy cập chung; nếu đặt, phải nhập mã mới xem/sửa được.

const DATA_KEY = 'ghn-pt:data';
const REV_KEY = 'ghn-pt:rev';

// Ghi có kiểm tra phiên bản (tránh ghi đè khi 2 người sửa cùng lúc)
const SAVE_SCRIPT = `
local cur = redis.call('GET', KEYS[2]) or '0'
if cur ~= ARGV[1] then return {0, cur} end
local n = tonumber(cur) + 1
redis.call('SET', KEYS[1], ARGV[2])
redis.call('SET', KEYS[2], tostring(n))
return {1, tostring(n)}`;

function redisConfig() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url: url.replace(/\/$/, ''), token } : null;
}

async function redis(cfg, command) {
  const r = await fetch(cfg.url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${cfg.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(command),
  });
  const j = await r.json();
  if (!r.ok || j.error) throw new Error(j.error || `Redis HTTP ${r.status}`);
  return j.result;
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  const pass = process.env.APP_PASSCODE;
  if (pass && req.headers['x-passcode'] !== pass) {
    return res.status(401).json({ error: 'Sai hoặc thiếu mã truy cập' });
  }

  const cfg = redisConfig();
  if (!cfg) return res.status(503).json({ error: 'Chưa kết nối kho dữ liệu (Upstash Redis) cho dự án Vercel' });

  try {
    if (req.method === 'GET') {
      const [data, rev] = await Promise.all([redis(cfg, ['GET', DATA_KEY]), redis(cfg, ['GET', REV_KEY])]);
      return res.status(200).json({ rev: Number(rev || 0), data: data ? JSON.parse(data) : null });
    }

    if (req.method === 'PUT') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      if (!body || !body.data || !Array.isArray(body.data.projects)) {
        return res.status(400).json({ error: 'Dữ liệu không hợp lệ' });
      }
      const payload = JSON.stringify(body.data);
      if (payload.length > 900000) return res.status(413).json({ error: 'Dữ liệu quá lớn' });

      const [ok, rev] = await redis(cfg, ['EVAL', SAVE_SCRIPT, '2', DATA_KEY, REV_KEY, String(Number(body.baseRev) || 0), payload]);
      if (ok === 1) return res.status(200).json({ rev: Number(rev) });

      // Có người khác vừa lưu: trả về bản mới nhất để trình duyệt gộp lại
      const latest = await redis(cfg, ['GET', DATA_KEY]);
      return res.status(409).json({ rev: Number(rev), data: latest ? JSON.parse(latest) : null });
    }

    res.setHeader('Allow', 'GET, PUT');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Lỗi máy chủ: ' + e.message });
  }
};
