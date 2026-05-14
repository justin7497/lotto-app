import { AlertCircle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md mx-4 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex mb-4 gap-2">
          <AlertCircle className="h-8 w-8 text-red-500" />
          <h1 className="text-2xl font-bold text-gray-900">404 페이지 없음</h1>
        </div>
        <p className="mt-4 text-sm text-gray-600">
          요청한 페이지를 찾을 수 없습니다.
        </p>
      </div>
    </div>
  );
}
