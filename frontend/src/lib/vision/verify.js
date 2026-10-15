// Size + SHA-256 check for one downloaded model file (fud-ai LocalModelManager.downloadVerified):
// cheap size check first, hash only when the size is right.
import { VisionError } from './errors.js'

export const toHex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('')

export async function verifyBuffer(buf, spec, digest = (alg, data) => crypto.subtle.digest(alg, data)) {
  if (buf.byteLength !== spec.bytes) throw new VisionError('VERIFY', `size ${spec.path}`)
  if (toHex(await digest('SHA-256', buf)) !== spec.sha256) throw new VisionError('VERIFY', `sha256 ${spec.path}`)
}
