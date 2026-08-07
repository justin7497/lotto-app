import { useEffect, useState, type ReactNode } from "react";
import { useLocation } from "wouter";
import SubPageHeaderBar from "@/components/SubPageHeaderBar";
import { pageHeaderImage } from "@/data/pageHero";
import { titleForRoute } from "@/data/routeTitles";
import { useGoBack } from "@/hooks/useGoBack";
import {
  dispatchSlipHeaderAction,
  subscribeSlipHeaderState,
  type SlipHeaderState,
} from "@/utils/slipPageBridge";

const defaultSlipHeaderState: SlipHeaderState = {
  view: "empty",
  hasGames: false,
  canAddGame: true,
};

export default function SubPageHeader() {
  const [location] = useLocation();
  const pathname = location.split("?")[0];
  const search = typeof window !== "undefined" ? window.location.search : "";
  const loadNumbersBackTab =
    new URLSearchParams(search).get("tab") === "fixed" ? "fixed" : "regular";
  const goBack = useGoBack(
    pathname === "/slip/load-numbers"
      ? `/slip?tab=${loadNumbersBackTab}`
      : pathname === "/slip/load-fixed"
        ? "/slip?tab=fixed"
        : pathname === "/slip/add-fixed"
          ? "/slip?tab=fixed"
          : pathname.startsWith("/ball-draw/")
            ? "/ball-draw"
            : "/",
  );
  const [slipHeader, setSlipHeader] = useState<SlipHeaderState>(defaultSlipHeaderState);
  const [title, setTitle] = useState(() =>
    titleForRoute(location, typeof window !== "undefined" ? window.location.search : ""),
  );
  const [headerImage, setHeaderImage] = useState(() =>
    pageHeaderImage(pathname, typeof window !== "undefined" ? window.location.search : ""),
  );

  useEffect(() => {
    const refresh = () => {
      const search = window.location.search;
      setTitle(titleForRoute(location, search));
      setHeaderImage(pageHeaderImage(location, search));
    };
    refresh();
    window.addEventListener("home-theme-change", refresh);
    return () => window.removeEventListener("home-theme-change", refresh);
  }, [location]);

  useEffect(() => {
    if (pathname !== "/slip") {
      setSlipHeader(defaultSlipHeaderState);
      return;
    }
    return subscribeSlipHeaderState(setSlipHeader);
  }, [pathname]);

  let trailing: ReactNode = null;

  if (pathname === "/slip") {
    if (slipHeader.view !== "qr" && slipHeader.hasGames) {
      trailing = (
        <button
          type="button"
          onClick={() => dispatchSlipHeaderAction("open-qr")}
          className="sub-page-header__action sub-page-header__action--ghost"
        >
          QR 보기
        </button>
      );
    }
  }

  return (
    <>
      <SubPageHeaderBar
        title={title}
        image={headerImage}
        onBack={goBack}
        backAriaLabel="이전"
        trailing={trailing}
      />
    </>
  );
}
