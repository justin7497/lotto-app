import { Link } from "wouter";
import PageCard from "@/components/PageCard";
import { useGoBack } from "@/hooks/useGoBack";

const SECTIONS = [
  {
    title: "1. 수집하는 개인정보",
    body: [
      "회원가입 시: 이메일 주소, 비밀번호(암호화 저장)",
      "서비스 이용 시: 저장한 로또 번호, 내번호, 슬립지 초안(기기 내), 알림 설정, 푸시 알림 토큰(FCM)",
      "자동 수집: 서비스 이용 기록, 기기 정보(푸시 토큰 등록 시 브라우저 정보 일부)",
    ],
  },
  {
    title: "2. 개인정보 이용 목적",
    body: [
      "회원 식별 및 로그인",
      "저장 번호의 기기 간 백업·복원",
      "추첨 결과 당첨 알림(이메일·푸시)",
      "서비스 운영 및 오류 개선",
    ],
  },
  {
    title: "3. 보관 및 파기",
    body: [
      "로그인하지 않은 경우: 대부분의 데이터는 이용자 기기(localStorage)에만 저장됩니다.",
      "로그인한 경우: Firebase(구글) 클라우드에 백업됩니다.",
      "회원 탈퇴 시: 계정·저장 번호·알림 설정·푸시 토큰 등 연동 데이터를 삭제합니다.",
      "법령에 따른 보관이 필요한 경우 해당 기간 동안만 보관합니다.",
    ],
  },
  {
    title: "4. 제3자 제공 및 처리 위탁",
    body: [
      "Firebase Authentication, Cloud Firestore, Firebase Cloud Messaging(Google LLC) — 인증·데이터 저장·푸시 알림",
      "동행복권 공개 API — 당첨번호·판매점 등 공개 당첨 정보 조회(개인정보 미전송)",
      "위탁 업체는 계약에 따라 개인정보를 안전하게 처리합니다.",
    ],
  },
  {
    title: "5. 이용자 권리",
    body: [
      "언제든 로그아웃할 수 있습니다.",
      "홈 설정 또는 알림 설정에서 회원 탈퇴를 요청할 수 있습니다.",
      "탈퇴 후에도 기기에 남은 슬립지 초안 등은 브라우저 설정에서 직접 삭제할 수 있습니다.",
    ],
  },
  {
    title: "6. 문의",
    body: [
      "개인정보 관련 문의: contact@heartlinktoday.com",
      "시행일: 2026년 7월 22일",
    ],
  },
] as const;

export default function PrivacyPolicy() {
  const goBack = useGoBack();

  return (
    <div className="page-content max-w-2xl mx-auto">
      <PageCard className="space-y-6">
        <p className="text-base text-gray-500 leading-relaxed">
          소원로또(이하 「서비스」)는 이용자의 개인정보를 중요하게 생각하며, 관련 법령을
          준수합니다.
        </p>

        {SECTIONS.map((section) => (
          <section key={section.title}>
            <h2 className="text-lg font-bold text-gray-900 mb-2">{section.title}</h2>
            <ul className="space-y-2">
              {section.body.map((line) => (
                <li key={line} className="text-base text-gray-700 leading-relaxed pl-1">
                  ·{" "}
                  {line.includes("contact@heartlinktoday.com") ? (
                    <>
                      개인정보 관련 문의:{" "}
                      <a
                        href="mailto:contact@heartlinktoday.com"
                        className="text-link-brand"
                      >
                        contact@heartlinktoday.com
                      </a>
                    </>
                  ) : (
                    line
                  )}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </PageCard>

      <p className="text-center">
        <button type="button" onClick={goBack} className="text-base text-link-brand">
          이전
        </button>
      </p>
    </div>
  );
}
