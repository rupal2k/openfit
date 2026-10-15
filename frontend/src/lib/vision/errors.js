// Typed failures for on-device recognition (mirrors fud-ai's AiError kinds that apply locally).
export const MESSAGES = {
  NOT_INSTALLED: 'Download the model first.',
  LOW_MEMORY: 'This device doesn’t have enough memory for this model.',
  NO_STORAGE: 'Not enough free storage for the model.',
  DOWNLOAD: 'Download failed — check your connection and try again.',
  VERIFY: 'The downloaded model failed verification and was removed. Try again.',
  GPU_INIT: 'The GPU couldn’t run the model, so OPENFIT switched to CPU mode. The CPU version needs its own download.',
  IMAGE: 'That photo couldn’t be read. Try a JPEG or PNG.',
  CANCELLED: 'Cancelled.',
}
export const KINDS = Object.keys(MESSAGES)

export class VisionError extends Error {
  constructor(kind, detail = '') {
    super(MESSAGES[kind] || detail || kind)
    this.kind = KINDS.includes(kind) ? kind : 'DOWNLOAD'
    this.detail = detail
  }
}
