export function getPasswordResetContinueUrl(): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  return `${window.location.origin}${base}/reset-password`;
}

export function getAuthActionParams(): { mode: string | null; oobCode: string | null } {
  const search = new URLSearchParams(window.location.search);
  let mode = search.get("mode");
  let oobCode = search.get("oobCode");

  const hash = window.location.hash;
  if (hash.includes("oobCode") || hash.includes("mode=")) {
    const hashParams = new URLSearchParams(hash.replace(/^#\/?/, ""));
    mode = mode || hashParams.get("mode");
    oobCode = oobCode || hashParams.get("oobCode");
  }

  return { mode, oobCode };
}
