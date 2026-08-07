import { useCallback, useEffect, useState } from "react";
import { useAuth, isFirebaseConfigured } from "@/context/AuthContext";
import {
  loadFavoritePicks,
  onFavoritePicksInvalidate,
  type FavoritePick,
} from "@/utils/favoriteNumbers";

export function useFavoritePicks() {
  const { isLoaded, isSignedIn, user } = useAuth();
  const [picks, setPicks] = useState<FavoritePick[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (isFirebaseConfigured && !isLoaded) return;
    setLoading(true);
    try {
      setPicks(await loadFavoritePicks());
    } finally {
      setLoading(false);
    }
  }, [isLoaded, isSignedIn, user?.uid]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => onFavoritePicksInvalidate(() => void refresh()), [refresh]);

  return { picks, setPicks, loading, refresh };
}
