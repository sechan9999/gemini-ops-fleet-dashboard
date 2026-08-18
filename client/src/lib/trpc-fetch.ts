const TRANSIENT_RETRY_LIMIT = 2;
const RETRY_DELAYS_MS = [80, 180];

const wait = (milliseconds: number) => new Promise(resolve => setTimeout(resolve, milliseconds));

const shouldRetryResponse = (response: Response) => {
  const contentType = response.headers.get("content-type") ?? "";
  return response.status >= 500 || contentType.includes("text/html");
};

export async function fetchTrpcWithRetry(input: RequestInfo | URL, init?: RequestInit) {
  let response: Response | undefined;
  for (let attempt = 0; attempt <= TRANSIENT_RETRY_LIMIT; attempt += 1) {
    response = await globalThis.fetch(input, init);
    if (!shouldRetryResponse(response) || attempt === TRANSIENT_RETRY_LIMIT) return response;
    await wait(RETRY_DELAYS_MS[attempt] ?? RETRY_DELAYS_MS.at(-1)!);
  }
  return response!;
}
