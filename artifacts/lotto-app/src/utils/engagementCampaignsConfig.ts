import { doc, getDoc } from "firebase/firestore";
import { db, isFirebaseConfigured } from "@/lib/firebase";
import {
  DEFAULT_ENGAGEMENT_CAMPAIGNS,
  type EngagementCampaign,
} from "@/data/engagementCampaigns";

const DOC_PATH = "appConfig/engagementCampaigns";

let cachedCampaigns: EngagementCampaign[] | null = null;

export function clearEngagementCampaignsCache(): void {
  cachedCampaigns = null;
}

export async function loadEngagementCampaignsConfig(): Promise<{
  campaigns: EngagementCampaign[];
  source: "default" | "remote";
}> {
  if (cachedCampaigns) {
    return { campaigns: cachedCampaigns, source: "remote" };
  }

  if (!isFirebaseConfigured || !db) {
    return {
      campaigns: DEFAULT_ENGAGEMENT_CAMPAIGNS,
      source: "default",
    };
  }

  try {
    const snap = await getDoc(doc(db, "appConfig", "engagementCampaigns"));
    if (!snap.exists()) {
      return {
        campaigns: DEFAULT_ENGAGEMENT_CAMPAIGNS,
        source: "default",
      };
    }

    const data = snap.data();
    const campaigns = Array.isArray(data.campaigns)
      ? (data.campaigns as EngagementCampaign[]).filter((row) => row.enabled !== false)
      : DEFAULT_ENGAGEMENT_CAMPAIGNS;

    cachedCampaigns = campaigns;
    return { campaigns, source: "remote" };
  } catch {
    return {
      campaigns: DEFAULT_ENGAGEMENT_CAMPAIGNS,
      source: "default",
    };
  }
}
