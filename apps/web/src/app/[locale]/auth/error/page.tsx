import { Suspense } from "react";
import AuthErrorDisplay from "./error-display";

export default function AuthErrorPage() {
  return (
    <Suspense fallback={<p>Cargando...</p>}>
      <AuthErrorDisplay />
    </Suspense>
  );
}
