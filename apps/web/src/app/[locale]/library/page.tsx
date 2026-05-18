import { redirect } from 'next/navigation';

// /library is the legacy URL — /transcriptions is the new canonical route.
// Kept as a redirect so existing links, bookmarks, and any stale sidebar
// references continue to work.
export default async function LegacyLibraryRedirect({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect(`/${locale}/transcriptions`);
}
