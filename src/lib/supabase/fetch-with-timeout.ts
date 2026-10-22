const SUPABASE_TIMEOUT_MS = 10_000;

export function fetchWithSupabaseTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
) {
  const timeoutSignal = AbortSignal.timeout(SUPABASE_TIMEOUT_MS);
  const signal = init.signal
    ? AbortSignal.any([init.signal, timeoutSignal])
    : timeoutSignal;

  return fetch(input, { ...init, signal });
}
