import { Component, Suspense, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  APIProvider,
  Map,
  Marker,
  useMap,
} from "@vis.gl/react-google-maps";
import type { LottoWinStore } from "@/data/types";
import { hasGoogleMapsApiKey } from "@/utils/googleMap";
import { storeHasCoords, toMappedStores } from "@/utils/storeGeocode";

const KOREA_CENTER = { lat: 36.38, lng: 127.88 };
const DEFAULT_ZOOM = 7;
const SELECTED_ZOOM = 16;

function markerIcon(selected: boolean): google.maps.Symbol | undefined {
  if (typeof google === "undefined" || !google.maps?.SymbolPath) return undefined;
  return {
    path: google.maps.SymbolPath.CIRCLE,
    scale: selected ? 10 : 8,
    fillColor: selected ? "#f97316" : "#127a6e",
    fillOpacity: 1,
    strokeColor: "#ffffff",
    strokeWeight: 2,
  };
}

function storeMatchKey(store: Pick<LottoWinStore, "name" | "address">): string {
  return `${store.name}::${store.address}`;
}

class MapErrorBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error("[WinningStoreMap]", error);
  }

  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

function MapResize({ enabled }: { enabled: boolean }) {
  const map = useMap();

  useEffect(() => {
    if (!map || !enabled) return;

    const trigger = () => {
      if (typeof google !== "undefined") {
        google.maps.event.trigger(map, "resize");
      }
    };

    trigger();
    const t1 = window.setTimeout(trigger, 80);
    const t2 = window.setTimeout(trigger, 320);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [map, enabled]);

  return null;
}

function MapCamera({
  selected,
  markerStores,
  fitAllSignal,
  focusSelectedSignal,
}: {
  selected: LottoWinStore | null;
  markerStores: LottoWinStore[];
  fitAllSignal: number;
  focusSelectedSignal: number;
}) {
  const map = useMap();

  useEffect(() => {
    if (!map || !selected || !storeHasCoords(selected)) return;
    map.panTo({ lat: selected.lat, lng: selected.lng });
    map.setZoom(SELECTED_ZOOM);
  }, [map, selected, focusSelectedSignal]);

  useEffect(() => {
    if (!map || fitAllSignal === 0 || typeof google === "undefined") return;
    const coords = markerStores.filter(storeHasCoords);
    if (coords.length === 0) return;
    const bounds = new google.maps.LatLngBounds();
    for (const store of coords) {
      bounds.extend({ lat: store.lat, lng: store.lng });
    }
    map.fitBounds(bounds, 48);
  }, [map, fitAllSignal, markerStores]);

  return null;
}

function WinningStoreMapInner({
  markerStores,
  selected,
  variant = "fullscreen",
}: {
  markerStores: LottoWinStore[];
  selected: LottoWinStore | null;
  variant?: "preview" | "fullscreen";
}) {
  const mapped = useMemo(() => toMappedStores(markerStores), [markerStores]);
  const selectedKey = selected ? storeMatchKey(selected) : null;
  const selectedMapped = selected && storeHasCoords(selected) ? selected : null;
  const selectedInMarkers = selectedMapped
    ? mapped.some((store) => storeMatchKey(store) === selectedKey)
    : false;
  const isPreview = variant === "preview";
  const [fitAllSignal, setFitAllSignal] = useState(0);
  const [focusSelectedSignal, setFocusSelectedSignal] = useState(0);

  useEffect(() => {
    if (isPreview || selectedMapped) return;
    setFitAllSignal((n) => n + 1);
  }, [isPreview, markerStores, selectedMapped]);

  useEffect(() => {
    if (!selectedMapped) return;
    setFocusSelectedSignal((n) => n + 1);
  }, [selectedMapped, selectedKey]);

  return (
    <div className={`win-store-map${isPreview ? " win-store-map--preview" : " win-store-map--fullscreen"}`}>
      {selectedMapped ? (
        <div className="win-store-map__info-bar">
          <p className="win-store-map__info-name">{selectedMapped.name}</p>
          <p className="win-store-map__info-addr">{selectedMapped.address}</p>
        </div>
      ) : null}
      <Map
        className="win-store-map__canvas"
        defaultCenter={KOREA_CENTER}
        defaultZoom={DEFAULT_ZOOM}
        gestureHandling={isPreview ? "none" : "greedy"}
        disableDefaultUI
        zoomControl={!isPreview}
        clickableIcons={false}
        mapTypeControl={false}
        streetViewControl={false}
        fullscreenControl={false}
      >
        <MapResize enabled={!isPreview} />
        <MapCamera
          selected={selectedMapped}
          markerStores={markerStores}
          fitAllSignal={fitAllSignal}
          focusSelectedSignal={focusSelectedSignal}
        />
        {mapped.map((store, idx) => (
          <Marker
            key={`${storeMatchKey(store)}-${idx}`}
            position={{ lat: store.lat, lng: store.lng }}
            icon={markerIcon(storeMatchKey(store) === selectedKey)}
            zIndex={storeMatchKey(store) === selectedKey ? 2 : 1}
          />
        ))}
        {selectedMapped && !selectedInMarkers ? (
          <Marker
            position={{ lat: selectedMapped.lat, lng: selectedMapped.lng }}
            icon={markerIcon(true)}
            zIndex={3}
          />
        ) : null}
      </Map>
      {isPreview ? (
        <div className="win-store-map__preview-hint" aria-hidden>
          탭하여 전체화면
        </div>
      ) : (
        <button
          type="button"
          className="win-store-map__fit"
          onClick={(event) => {
            event.stopPropagation();
            setFitAllSignal((n) => n + 1);
          }}
        >
          모아보기
        </button>
      )}
    </div>
  );
}

export default function WinningStoreMap({
  markerStores,
  selected,
  variant = "fullscreen",
}: {
  markerStores: LottoWinStore[];
  selected: LottoWinStore | null;
  variant?: "preview" | "fullscreen";
}) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;
  const mappedCount = useMemo(
    () => markerStores.filter(storeHasCoords).length,
    [markerStores],
  );

  if (!hasGoogleMapsApiKey()) {
    return (
      <div className="win-store-map win-store-map--placeholder">
        <p>지도를 표시하려면 Google Maps API 키가 필요합니다.</p>
      </div>
    );
  }

  if (mappedCount === 0) {
    return (
      <div className="win-store-map win-store-map--placeholder">
        <p>이번 회차 판매점 위치 정보를 준비 중입니다.</p>
      </div>
    );
  }

  const fallback = (
    <div className="win-store-map win-store-map--placeholder">
      <p>지도를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.</p>
    </div>
  );

  return (
    <MapErrorBoundary fallback={fallback}>
      <APIProvider apiKey={apiKey!} language="ko" region="KR">
        <Suspense
          fallback={
            <div className="win-store-map win-store-map--placeholder">
              <p>지도 불러오는 중…</p>
            </div>
          }
        >
          <WinningStoreMapInner
            markerStores={markerStores}
            selected={selected}
            variant={variant}
          />
        </Suspense>
      </APIProvider>
    </MapErrorBoundary>
  );
}
