import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import Navigation from "@/components/Navigation";
import Dashboard from "@/pages/Dashboard";
import Analysis from "@/pages/Analysis";
import Generator from "@/pages/Generator";
import ExtractedNumbers from "@/pages/MyNumbers";
import MyPicks from "@/pages/MyPicks";
import Backtest from "@/pages/Backtest";
import LottoKing from "@/pages/LottoKing";
import Saju from "@/pages/Saju";
import SignInPage from "@/pages/SignIn";
import SignUpPage from "@/pages/SignUp";
import { AuthProvider } from "@/context/AuthContext";
import { LottoDataProvider } from "@/context/LottoDataContext";
import { queryClient } from "@/lib/queryClient";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function Router() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <main className="senior-readable overflow-x-hidden">
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/analysis" component={Analysis} />
          <Route path="/backtest" component={Backtest} />
          <Route path="/lottoking" component={LottoKing} />
          <Route path="/saju" component={Saju} />
          <Route path="/generator" component={Generator} />
          <Route path="/extracted" component={ExtractedNumbers} />
          <Route path="/my-numbers" component={MyPicks} />
          <Route path="/sign-in" component={SignInPage} />
          <Route path="/sign-up" component={SignUpPage} />
          <Route>
            <Redirect to="/" />
          </Route>
        </Switch>
      </main>
    </div>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <LottoDataProvider>
            <Router />
          </LottoDataProvider>
        </AuthProvider>
      </QueryClientProvider>
    </WouterRouter>
  );
}

export default App;
