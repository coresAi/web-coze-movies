// 服务端：从请求中解析或生成 device_id
import { randomUUID, createHash } from 'crypto';

const DEVICE_COOKIE = 'media_device_id';
const DEVICE_HEADER = 'x-device-id';

export function getOrCreateDeviceId(request: Request): { deviceId: string; setCookie?: string } {
  // 优先从 header 取（前端 localStorage 优先）
  const headerId = request.headers.get(DEVICE_HEADER);
  if (headerId && /^[a-zA-Z0-9_-]{6,64}$/.test(headerId)) {
    return { deviceId: headerId };
  }

  // 从 cookie 取
  const cookieHeader = request.headers.get('cookie') || '';
  const match = cookieHeader.match(new RegExp(`${DEVICE_COOKIE}=([^;]+)`));
  if (match && /^[a-zA-Z0-9_-]{6,64}$/.test(match[1])) {
    return { deviceId: match[1] };
  }

  // 生成新的
  const newId = randomUUID();
  const setCookie = `${DEVICE_COOKIE}=${newId}; Path=/; Max-Age=${60 * 60 * 24 * 365}; SameSite=Lax; HttpOnly`;
  return { deviceId: newId, setCookie };
}
