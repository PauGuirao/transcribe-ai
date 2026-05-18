export function uuidv4(): string {
  const r = new Uint8Array(16);
  crypto.getRandomValues(r);
  r[6] = (r[6] & 0x0f) | 0x40;
  r[8] = (r[8] & 0x3f) | 0x80;
  const h = [...r].map(b => b.toString(16).padStart(2,'0')).join('');
  return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;
}

export function randomId(len = 8) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const r = new Uint8Array(len); crypto.getRandomValues(r);
  return [...r].map(v => chars[v % chars.length]).join('');
}
