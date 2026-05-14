import { useEffect, useRef } from "react";
import { Switch, Route, Router as WouterRouter, useLocation, Redirect } from "wouter";
import { ClerkProvider, SignIn, SignUp, Show, useClerk } from "@clerk/react";
import { koKR } from "@clerk/localizations";
import { shadcn } from "@clerk/themes";
import { QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import Navigation from "@/components/Navigation";
import Dashboard from "@/pages/Dashboard";
import Analysis from "@/pages/Analysis";
import Generator from "@/pages/Generator";
import MyNumbers from "@/pages/MyNumbers";
import Backtest from "@/pages/Backtest";
import { LottoDataProvider } from "@/context/LottoDataContext";
import { queryClient } from "@/lib/queryClient";

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string;
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL || undefined;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
const isClerkEnabled = Boolean(clerkPubKey);

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: "#f59e0b",
    colorForeground: "#111827",
    colorMutedForeground: "#6b7280",
    colorDanger: "#ef4444",
    colorBackground: "#ffffff",
    colorInput: "#f9fafb",
    colorInputForeground: "#111827",
    colorNeutral: "#e5e7eb",
    fontFamily: "inherit",
    borderRadius: "1rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "bg-white/95 rounded-[1.75rem] w-[460px] max-w-full overflow-hidden shadow-2xl shadow-amber-200/40 border border-amber-200 backdrop-blur",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none px-8 py-7",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "text-gray-950 font-extrabold tracking-tight",
    headerSubtitle: "text-gray-500 font-medium",
    socialButtonsBlockButtonText: "text-gray-700",
    socialButtonsBlockButton: "border border-amber-100 bg-white hover:bg-amber-50 h-11 rounded-xl shadow-sm transition-all",
    formFieldLabel: "text-gray-700 font-semibold",
    footerActionLink: "text-amber-600 hover:text-amber-700 font-medium",
    footerActionText: "text-gray-500",
    dividerText: "text-gray-400",
    identityPreviewEditButton: "text-amber-600",
    formFieldSuccessText: "text-green-600",
    alertText: "text-gray-700",
    logoBox: "flex justify-center",
    logoImage: "h-12 w-auto drop-shadow-sm",
    formButtonPrimary: "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white h-11 rounded-xl font-bold shadow-lg shadow-amber-200 transition-all",
    formFieldInput: "border border-amber-100 bg-amber-50/40 text-gray-900 rounded-xl h-11 focus:border-amber-400 focus:ring-amber-200",
    footerAction: "bg-amber-50/70 rounded-xl",
    dividerLine: "bg-gray-200",
    alert: "border-amber-200 bg-amber-50",
    otpCodeFieldInput: "border-gray-300",
    formFieldRow: "space-y-2",
    main: "gap-5",
  },
};

function SignInPage() {
  return (
    <div className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-gradient-to-br from-amber-50 via-orange-50 to-white px-4 py-10">
      <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-amber-200/40 blur-3xl" />
      <div className="absolute -bottom-28 -right-20 h-80 w-80 rounded-full bg-orange-200/40 blur-3xl" />
      <div className="relative w-full">
        <SignIn
          routing="path"
          path={`${basePath}/sign-in`}
          signUpUrl={`${basePath}/sign-up`}
          appearance={clerkAppearance}
        />
      </div>
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-gradient-to-br from-amber-50 via-orange-50 to-white px-4 py-10">
      <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-amber-200/40 blur-3xl" />
      <div className="absolute -bottom-28 -right-20 h-80 w-80 rounded-full bg-orange-200/40 blur-3xl" />
      <div className="relative w-full">
        <div className="mx-auto mb-4 max-w-[460px] rounded-2xl border border-amber-200 bg-white/80 px-5 py-4 text-center shadow-lg shadow-amber-100/50 backdrop-blur">
          <p className="text-sm font-bold text-gray-900">이메일 인증 후 가입이 완료됩니다</p>
          <p className="mt-1 text-xs text-gray-500">
            입력한 이메일로 전송되는 인증 코드를 확인해 주세요.
          </p>
        </div>
        <SignUp
          routing="path"
          path={`${basePath}/sign-up`}
          signInUrl={`${basePath}/sign-in`}
          appearance={clerkAppearance}
        />
      </div>
    </div>
  );
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const qc = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (prevUserIdRef.current !== undefined && prevUserIdRef.current !== userId) {
        qc.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, qc]);

  return null;
}

function Router() {
  const GeneratorRoute = isClerkEnabled ? (
    <>
      <Show when="signed-in">
        <Generator />
      </Show>
      <Show when="signed-out">
        <Redirect to="/sign-in" />
      </Show>
    </>
  ) : (
    <Generator />
  );
  const MyNumbersRoute = isClerkEnabled ? (
    <>
      <Show when="signed-in">
        <MyNumbers />
      </Show>
      <Show when="signed-out">
        <Redirect to="/sign-in" />
      </Show>
    </>
  ) : (
    <MyNumbers />
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <main>
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/analysis" component={Analysis} />
          <Route path="/generator">
            {GeneratorRoute}
          </Route>
          <Route path="/my-numbers">
            {MyNumbersRoute}
          </Route>
          <Route path="/backtest" component={Backtest} />
          <Route path="/sign-in/*?" component={SignInPage} />
          <Route path="/sign-up/*?" component={SignUpPage} />
          <Route>
            <div className="flex items-center justify-center min-h-[60vh]">
              <p className="text-gray-400 text-sm">페이지를 찾을 수 없습니다</p>
            </div>
          </Route>
        </Switch>
      </main>
    </div>
  );
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  if (!isClerkEnabled) {
    return (
      <QueryClientProvider client={queryClient}>
        <LottoDataProvider>
          <Router />
        </LottoDataProvider>
      </QueryClientProvider>
    );
  }

  return (
    <ClerkProvider
      publishableKey={clerkPubKey!}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={{
        ...koKR,
        signIn: {
          start: {
            title: "로그인",
            subtitle: "로또 분석을 계속하려면 로그인하세요",
            actionText: "계정이 없으신가요?",
            actionLink: "회원가입",
          },
        },
        signUp: {
          start: {
            title: "회원가입",
            subtitle: "계정을 만들어 번호를 저장하세요",
            actionText: "이미 계정이 있으신가요?",
            actionLink: "로그인",
          },
        },
        socialButtonsBlockButton: "{{provider|titleize}}로 계속하기",
        dividerText: "또는",
        formFieldLabel__emailAddress: "이메일 주소",
        formFieldInputPlaceholder__emailAddress: "이메일 주소를 입력하세요",
        formButtonPrimary: "계속하기",
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <LottoDataProvider>
          <Router />
        </LottoDataProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <ClerkProviderWithRoutes />
    </WouterRouter>
  );
}

export default App;
