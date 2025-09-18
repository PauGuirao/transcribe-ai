import { Suspense } from "react";
import TranscribeClient from "./transcribe-client";

export default function TranscribePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <TranscribeClient />
    </Suspense>
  );
}
