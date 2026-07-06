function getErrorCode(err: unknown): string {
  if (!err || typeof err !== "object") return "";
  if ("code" in err) return String((err as { code: string }).code);
  return "";
}

function getErrorMessage(err: unknown): string {
  if (!err || typeof err !== "object") return "";
  if ("message" in err) return String((err as { message: string }).message);
  return "";
}

export function getAuthErrorMessage(err: unknown): string {
  const code = getErrorCode(err);
  const message = getErrorMessage(err);

  if (
    message.includes("CONFIGURATION_NOT_FOUND") ||
    code === "auth/configuration-not-found"
  ) {
    return "Firebase Authentication이 아직 설정되지 않았습니다. 관리자가 Firebase 콘솔에서 Authentication → 시작하기 → 이메일/비밀번호를 켜야 합니다.";
  }

  switch (code) {
    case "auth/invalid-email":
      return "올바른 이메일 주소를 입력해 주세요.";
    case "auth/user-disabled":
      return "비활성화된 계정입니다.";
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "이메일 또는 비밀번호가 올바르지 않습니다.";
    case "auth/email-already-in-use":
      return "이미 사용 중인 이메일입니다. 로그인해 보세요.";
    case "auth/weak-password":
      return "비밀번호는 6자 이상이어야 합니다.";
    case "auth/too-many-requests":
      return "시도 횟수가 많습니다. 잠시 후 다시 시도해 주세요.";
    case "auth/operation-not-allowed":
      return "이메일/비밀번호 로그인이 비활성화되어 있습니다. Firebase 콘솔 → Authentication → 이메일/비밀번호를 사용 설정해 주세요.";
    case "auth/network-request-failed":
      return "네트워크 오류가 발생했습니다.";
    case "auth/internal-error":
      if (message.includes("CONFIGURATION_NOT_FOUND")) {
        return "Firebase Authentication이 아직 설정되지 않았습니다. 관리자에게 문의해 주세요.";
      }
      return "인증 서버 설정 오류입니다. 잠시 후 다시 시도해 주세요.";
    default:
      return "인증에 실패했습니다. 다시 시도해 주세요.";
  }
}
