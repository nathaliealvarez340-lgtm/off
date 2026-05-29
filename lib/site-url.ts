export const PRODUCTION_SITE_URL = "https://off.maiabusiness.com";

export function getSiteUrl() {
  const configuredUrl = process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL;

  if (configuredUrl && !configuredUrl.includes("localhost")) {
    return configuredUrl.replace(/\/$/, "");
  }

  return PRODUCTION_SITE_URL;
}
