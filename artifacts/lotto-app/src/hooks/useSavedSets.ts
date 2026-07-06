import { useCallback, useEffect, useState } from "react";
import { useAuth, isFirebaseConfigured } from "@/context/AuthContext";
import {
  loadSavedSets,
  onSavedSetsInvalidate,
  type SavedSet,
} from "@/utils/savedNumbers";

export function useSavedSets() {
  const { isLoaded, isSignedIn, user } = useAuth();
  const [sets, setSets] = useState<SavedSet[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (isFirebaseConfigured && !isLoaded) return;
    setLoading(true);
    try {
      setSets(await loadSavedSets());
    } finally {
      setLoading(false);
    }
  }, [isLoaded, isSignedIn, user?.uid]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => onSavedSetsInvalidate(() => void refresh()), [refresh]);

  return { sets, setSets, loading, refresh };
}
