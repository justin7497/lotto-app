import { Switch, Route, Router as WouterRouter, Redirect, useLocation } from "wouter";
import { useEffect } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import SubPageHeader from "@/components/SubPageHeader";
import SubPageMain from "@/components/SubPageMain";
import Dashboard from "@/pages/Dashboard";
import Generator from "@/pages/Generator";
import MyPicks from "@/pages/MyPicks";
import Slip from "@/pages/Slip";
import WinningNumbers from "@/pages/WinningNumbers";
import NumberStats from "@/pages/NumberStats";
import WinNotifications from "@/pages/WinNotifications";
import NotificationSettings from "@/pages/NotificationSettings";
import HomeTheme from "@/pages/HomeTheme";
import PrivacyPolicy from "@/pages/PrivacyPolicy";
import LottoKing from "@/pages/LottoKing";
import Saju from "@/pages/Saju";
import SignInPage from "@/pages/SignIn";
import SignUpPage from "@/pages/SignUp";
import CharacterPreview from "@/pages/CharacterPreview";
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

  const isHome = location === "/";

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

  return (
    <div className="app-shell senior-ui app-shell--sub">
      <SubPageHeader />
      <SubPageMain>
        <Switch>
          <Route path="/slip" component={Slip} />
          <Route path="/winning-numbers" component={WinningNumbers} />
          <Route path="/number-stats" component={NumberStats} />
          <Route path="/win-notifications" component={WinNotifications} />
          <Route path="/notification-settings" component={NotificationSettings} />
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
            <Redirect to="/my-numbers" />
          </Route>
          <Route path="/generator" component={Generator} />
          <Route path="/extracted">
            <Redirect to="/slip" />
          </Route>
          <Route path="/my-numbers" component={MyPicks} />
          <Route path="/sign-in" component={SignInPage} />
          <Route path="/sign-up" component={SignUpPage} />
          <Route path="/character-preview" component={CharacterPreview} />
          <Route>
            <Redirect to="/" />
          </Route>
        </Switch>
      </SubPageMain>
    </div>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <HashRouteSync />
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <HomeThemeProvider>
            <LottoDataProvider>
              <Router />
            </LottoDataProvider>
          </HomeThemeProvider>
        </AuthProvider>
      </QueryClientProvider>
    </WouterRouter>
  );
}

export default App;
