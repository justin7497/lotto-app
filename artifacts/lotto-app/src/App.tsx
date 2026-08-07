import { Switch, Route, Router as WouterRouter, Redirect, useLocation } from "wouter";
import { useEffect } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import SubPageHeader from "@/components/SubPageHeader";
import SubPageMain from "@/components/SubPageMain";
import Dashboard from "@/pages/Dashboard";
import Generator from "@/pages/Generator";
import MyNumbers from "@/pages/MyNumbers";
import MyPicks from "@/pages/MyPicks";
import MyWish from "@/pages/MyWish";
import Slip from "@/pages/Slip";
import SlipLoadNumbers from "@/pages/SlipLoadNumbers";
import SlipLoadFixed from "@/pages/SlipLoadFixed";
import WinningNumbers from "@/pages/WinningNumbers";
import NumberStats from "@/pages/NumberStats";
import WinNotifications from "@/pages/WinNotifications";
import NotificationSettings from "@/pages/NotificationSettings";
import HomeTheme from "@/pages/HomeTheme";
import PrivacyPolicy from "@/pages/PrivacyPolicy";
import LottoKing from "@/pages/LottoKing";
import Saju from "@/pages/Saju";
import SignInPage from "@/pages/SignIn";
import ResetPasswordPage from "@/pages/ResetPassword";
import SignUpPage from "@/pages/SignUp";
import Admin from "@/pages/Admin";
import AdminDesktop from "@/pages/AdminDesktop";
import DrawModesHub from "@/pages/DrawModesHub";
import BallDrawMachine from "@/pages/draw/BallDrawMachine";
import DrawRoulette from "@/pages/draw/DrawRoulette";
import DrawLuckyBox from "@/pages/draw/DrawLuckyBox";
import DrawPlinko from "@/pages/draw/DrawPlinko";
import CharacterPreview from "@/pages/CharacterPreview";
import NetPrizeCalculator from "@/pages/NetPrizeCalculator";
import AppUpdateTest from "@/pages/AppUpdateTest";
import AppUpdatePrompt from "@/components/AppUpdatePrompt";
import EngagementPushBootstrap from "@/components/EngagementPushBootstrap";
import { AUTH_UI_VISIBLE } from "@/config/authUi";
import { isFirebaseConfigured } from "@/lib/firebase";
import { touchDeviceActivity } from "@/utils/deviceEngagement";
import { getOrCreateDeviceId } from "@/utils/deviceId";
import { AuthProvider } from "@/context/AuthContext";
import { HomeThemeProvider } from "@/context/HomeThemeContext";
import { LottoDataProvider } from "@/context/LottoDataContext";
import { queryClient } from "@/lib/queryClient";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

/** `#/winning-numbers` 형태로 들어온 주소를 pathname 라우팅으로 맞춥니다 */
function HashRouteSync() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    const hash = window.location.hash;
    if (!hash.startsWith("#/")) return;

    const path = hash.slice(1);
    if (!path || path === "/") return;

    setLocation(path);
    const nextUrl = `${basePath}${path}`.replace(/\/{2,}/g, "/") || "/";
    window.history.replaceState(null, "", nextUrl);
  }, [setLocation]);

  return null;
}

function Router() {
  const [location] = useLocation();
  const pathname = location.split("?")[0];

  if (pathname === "/admin/desktop") {
    return (
      <Switch>
        <Route path="/admin/desktop" component={AdminDesktop} />
      </Switch>
    );
  }

  const isHome = pathname === "/";
  const isAuthPage =
    pathname === "/sign-in" || pathname === "/sign-up" || pathname === "/reset-password";

  if (isHome) {
    return (
      <div className="app-shell senior-ui app-shell--mania">
        <main className="app-main app-main--mania-home">
          <Switch>
            <Route path="/" component={Dashboard} />
          </Switch>
        </main>
      </div>
    );
  }

  if (isAuthPage) {
    if (!AUTH_UI_VISIBLE) {
      return (
        <Switch>
          <Route path="/sign-in">
            <Redirect to="/" />
          </Route>
          <Route path="/reset-password">
            <Redirect to="/" />
          </Route>
          <Route path="/sign-up">
            <Redirect to="/" />
          </Route>
        </Switch>
      );
    }
    return (
      <Switch>
        <Route path="/sign-in" component={SignInPage} />
        <Route path="/reset-password" component={ResetPasswordPage} />
        <Route path="/sign-up" component={SignUpPage} />
      </Switch>
    );
  }

  return (
    <div className="app-shell senior-ui app-shell--sub">
      <SubPageHeader />
      <SubPageMain>
        <Switch>
          <Route path="/slip/load-numbers" component={SlipLoadNumbers} />
          <Route path="/slip/load-fixed" component={SlipLoadFixed} />
          <Route path="/slip/add-fixed" component={MyPicks} />
          <Route path="/slip" component={Slip} />
          <Route path="/my-wish" component={MyWish} />
          <Route path="/winning-numbers" component={WinningNumbers} />
          <Route path="/number-stats" component={NumberStats} />
          <Route path="/win-notifications" component={WinNotifications} />
          <Route path="/notification-settings" component={NotificationSettings} />
          <Route path="/dev/update-test" component={AppUpdateTest} />
          <Route path="/net-prize" component={NetPrizeCalculator} />
          <Route path="/home-theme" component={HomeTheme} />
          <Route path="/privacy" component={PrivacyPolicy} />
          <Route path="/analysis">
            <Redirect to="/" />
          </Route>
          <Route path="/backtest">
            <Redirect to="/" />
          </Route>
          <Route path="/lottoking" component={LottoKing} />
          <Route path="/saju" component={Saju} />
          <Route path="/fixed">
            <Redirect to="/slip/add-fixed" />
          </Route>
          <Route path="/generator" component={Generator} />
          <Route path="/ball-draw/machine" component={BallDrawMachine} />
          <Route path="/ball-draw/roulette" component={DrawRoulette} />
          <Route path="/ball-draw/box" component={DrawLuckyBox} />
          <Route path="/ball-draw/plinko" component={DrawPlinko} />
          <Route path="/ball-draw" component={DrawModesHub} />
          <Route path="/extracted">
            <Redirect to="/slip" />
          </Route>
          <Route path="/saved-numbers" component={MyNumbers} />
          <Route path="/my-numbers">
            <Redirect to="/slip/add-fixed" />
          </Route>
          <Route path="/character-preview" component={CharacterPreview} />
          <Route path="/admin" component={Admin} />
          <Route>
            <Redirect to="/" />
          </Route>
        </Switch>
      </SubPageMain>
    </div>
  );
}

function DeviceActivityTracker() {
  useEffect(() => {
    if (!isFirebaseConfigured) return;
    const deviceId = getOrCreateDeviceId();
    void touchDeviceActivity(deviceId);
    const onVisible = () => {
      if (document.visibilityState === "visible") void touchDeviceActivity(deviceId);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  return null;
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <HashRouteSync />
      <AppFrame />
    </WouterRouter>
  );
}

function AppFrame() {
  const [location] = useLocation();
  const isAdminDesktop = location.split("?")[0] === "/admin/desktop";

  const inner = (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <HomeThemeProvider>
          <LottoDataProvider>
            <Router />
            <DeviceActivityTracker />
            <EngagementPushBootstrap />
            {!isAdminDesktop ? <AppUpdatePrompt /> : null}
          </LottoDataProvider>
        </HomeThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );

  if (isAdminDesktop) {
    return <div className="admin-desktop-root">{inner}</div>;
  }

  return (
    <div className="app-viewport">
      <div id="app-frame" className="app-frame">
        {inner}
      </div>
    </div>
  );
}

export default App;
