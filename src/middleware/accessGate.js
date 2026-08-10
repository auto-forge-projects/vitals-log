// NFR-3 hafifletmesi (DL-07-001): kapasite URL. Router'dan ONCE calisir, /health muaf.
// Karsilastirma sabit-uzunluklu timingSafeEqual ile yapilir (oracle sizdirmasin).
import crypto from 'node:crypto';

function timingSafeStartsWith(pathname, prefix) {
  const candidate = pathname.slice(0, prefix.length);
  const a = Buffer.from(candidate, 'utf8');
  const b = Buffer.from(prefix, 'utf8');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function checkAccess({ pathname, mountPrefix }) {
  if (pathname === '/health') return { allowed: true, remainder: '/health' };
  if (!mountPrefix) return { allowed: true, remainder: pathname };
  if (!timingSafeStartsWith(pathname, mountPrefix)) return { allowed: false, remainder: null };
  const rest = pathname.slice(mountPrefix.length);
  return { allowed: true, remainder: rest === '' ? '/' : rest };
}

// SEC-2 fail-closed: production'da MOUNT_PREFIX yoksa/kisaysa sunucu BASLAMAZ.
export function assertProductionPrefix({ nodeEnv, mountPrefix }) {
  if (nodeEnv === 'production' && (!mountPrefix || mountPrefix.length < 22)) {
    throw new Error(
      'MOUNT_PREFIX eksik/kisa (>=22 karakter gerekli). Fail-closed: production baslamiyor. ' +
      "Uret: node -e \"console.log('/v/' + require('crypto').randomBytes(24).toString('base64url'))\""
    );
  }
}
