import { doc, getDoc } from "firebase/firestore";
import { db, isFirebaseConfigured } from "@/lib/firebase";
import {
  DEFAULT_ENGAGEMENT_CAMPAIGNS,
  DEFAULT_ENGAGEMENT_SETTINGS,
  type EngagementCampaign,
  type EngagementSettings,
} from "@/data/engagementCampaigns";

const DOC_PATH = "appConfig/engagementCampaigns";

let cachedCampaigns: EngagementCampaign[] | null = null;
let cachedSettings: EngagementSettings | null = null;

export function clearEngagementCampaignsCache(): void {
  cachedCampaigns = null;
  cachedSettings = null;
}

export async function loadEngagementCampaignsConfig(): Promise<{
  campaigns: EngagementCampaign[];
  settings: EngagementSettings;
  source: "default" | "remote";
}> {
  if (cachedCampaigns && cachedSettings) {
    return { campaigns: cachedCampaigns, settings: cachedSettings, source: "remote" };
  }

  if (!isFirebaseConfigured || !db) {
    return {
      campaigns: DEFAULT_ENGAGEMENT_CAMPAIGNS,
      settings: DEFAULT_ENGAGEMENT_SETTINGS,
      source: "default",
    };
  }

  try {
    const snap = await getDoc(doc(db, "appConfig", "engagementCampaigns"));
    if (!snap.exists()) {
      return {
        campaigns: DEFAULT_ENGAGEMENT_CAMPAIGNS,
        settings: DEFAULT_ENGAGEMENT_SETTINGS,
        source: "default",
      };
    }

    const data = snap.data();
    const campaigns = Array.isArray(data.campaigns)
      ? (data.campaigns as EngagementCampaign[]).filter((row) => row.enabled !== false)
      : DEFAULT_ENGAGEMENT_CAMPAIGNS;
    const rawMax = data.settings?.maxPushesPerWeek;
    const settings: EngagementSettings = {
      maxPushesPerWeek:
        typeof rawMax === "number" && Number.isFinite(rawMax)
          ? Math.min(7, Math.max(1, Math.round(rawMax)))
          : DEFAULT_ENGAGEMENT_SETTINGS.maxPushesPerWeek,
    };

    cachedCampaigns = campaigns;
    cachedSettings = settings;
    return { campaigns, settings, source: "remote" };
  } catch {
    return {
      campaigns: DEFAULT_ENGAGEMENT_CAMPAIGNS,
      settings: DEFAULT_ENGAGEMENT_SETTINGS,
      source: "default",
    };
  }
}
