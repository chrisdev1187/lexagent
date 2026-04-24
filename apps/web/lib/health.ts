const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

let warmed = false;

export function warmRender(): void {
  if (!API_URL || warmed) return;
  warmed = true;
  fetch(`${API_URL}/health`, { method: "GET" }).catch(() => {});
}
