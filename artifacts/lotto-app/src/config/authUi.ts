/** false면 로그인·회원가입 UI를 숨깁니다. Firebase Auth·클라우드 동기화 코드는 그대로 둡니다. */
export const AUTH_UI_VISIBLE = false;

const HIDDEN_AUTH_PATHS = new Set(["/sign-in", "/sign-up", "/reset-password"]);

export function isAuthRouteHidden(pathname: string): boolean {
  return !AUTH_UI_VISIBLE && HIDDEN_AUTH_PATHS.has(pathname.split("?")[0]);
}
