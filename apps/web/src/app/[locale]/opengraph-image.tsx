import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Transcriu — AI audio-to-text transcription';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

type LocaleCode = 'es' | 'ca' | 'en';

const copy: Record<LocaleCode, { tag: string; title: string; sub: string }> = {
  es: {
    tag: 'Transcripción con IA',
    title: 'Transcribe audio a texto con IA',
    sub: '98% de precisión en español y catalán · Prueba gratis sin tarjeta',
  },
  ca: {
    tag: 'Transcripció amb IA',
    title: 'Transcriu àudio a text amb IA',
    sub: '98% de precisió en català i castellà · Prova gratis sense targeta',
  },
  en: {
    tag: 'AI transcription',
    title: 'Transcribe audio to text with AI',
    sub: '98% accuracy in Spanish, Catalan & English · Free trial, no card',
  },
};

export default async function Image({
  params,
}: {
  params: { locale: string };
}) {
  const locale: LocaleCode =
    params.locale === 'ca' || params.locale === 'en' ? params.locale : 'es';
  const { tag, title, sub } = copy[locale];

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 80,
          background:
            'linear-gradient(135deg, #ffffff 0%, #f5f3ff 50%, #eef2ff 100%)',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background:
                'linear-gradient(135deg, #6366f1 0%, #a855f7 50%, #ec4899 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: 32,
              fontWeight: 700,
            }}
          >
            T
          </div>
          <div
            style={{
              fontSize: 32,
              fontWeight: 600,
              color: '#171717',
              letterSpacing: '-0.02em',
            }}
          >
            transcriu
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div
            style={{
              display: 'flex',
              alignSelf: 'flex-start',
              alignItems: 'center',
              gap: 10,
              padding: '8px 16px',
              border: '1px solid #e5e7eb',
              borderRadius: 999,
              background: 'white',
              fontSize: 22,
              color: '#404040',
            }}
          >
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: 999,
                background: '#6366f1',
              }}
            />
            {tag}
          </div>
          <div
            style={{
              fontSize: 84,
              lineHeight: 1.05,
              fontWeight: 600,
              color: '#0a0a0a',
              letterSpacing: '-0.04em',
              maxWidth: 980,
            }}
          >
            {title}
          </div>
          <div
            style={{
              fontSize: 30,
              lineHeight: 1.3,
              color: '#525252',
              maxWidth: 980,
            }}
          >
            {sub}
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: 22,
            color: '#737373',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: '#171717', fontWeight: 600 }}>transcriu.com</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ color: '#eab308' }}>★</span>
            <span>4.9 · 200+ professionals</span>
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
