import { Suspense } from "react";
import AnnotateClient from "./annotate-client";

export default function AnnotatePage() {
  return (
    <Suspense fallback={<p>Carregant...</p>}>
      <AnnotateClient />
    </Suspense>
  );
}
