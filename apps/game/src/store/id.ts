// crypto.randomUUID() requires a secure context (HTTPS or literally
// "localhost") and is unavailable when the dev server is reached via a
// LAN IP or forwarded hostname, so ids are generated without it.
export const createLocalId = (): string =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
