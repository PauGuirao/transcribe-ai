# WhatsApp Cloud API setup — Transcriu bot

End-to-end instructions for wiring the Transcriu Worker to a Meta WhatsApp Cloud API number so users can send voice notes to a single Transcriu phone number and receive the transcription back.

## How it works (TL;DR)

```
User WhatsApp ──► Transcriu phone number (Meta) ──► webhook /wa/webhook
                                                          │
                                                          ▼
                                                  Look up profiles.phone
                                                          │
                                                          ▼
                                              Download media → R2 → Queue
                                                          │
                                                          ▼
                                              Transcribe → reply with link
```

Users link their phone in **Settings → WhatsApp** (Transcriu dashboard). Whenever a number bound to a profile messages our business number, the bot transcribes and replies. Phones not bound to any profile get a "go register your phone" reply.

---

## 1. Apply the database migration

The migration adds `phone` to `profiles` and `source/wa_message_id/wa_from_phone` to `audios`, plus a helper RPC.

```bash
# Option A — Supabase SQL editor: paste the file
open apps/web/supabase-migration-whatsapp.sql

# Option B — psql against the project
psql "$SUPABASE_DB_URL" -f apps/web/supabase-migration-whatsapp.sql
```

The file is idempotent — safe to re-run.

---

## 2. Create the Meta app + WhatsApp Business asset

1. Go to https://developers.facebook.com → **My Apps** → **Create App** → choose **Business**.
2. Add the **WhatsApp** product. Meta gives you a **test phone number** immediately (free, only 5 verified recipients) — that's what we use until business verification is complete.
3. From the **WhatsApp → API Setup** page, grab:
   - **Phone number ID** (NOT the phone number itself — looks like `123456789012345`)
   - **Temporary access token** (good for 24 h — used for dev only)
   - In the same page, add your own WhatsApp number as a **test recipient** so the test number can message you back.
4. From **App settings → Basic**, copy the **App Secret**. We use this to verify `X-Hub-Signature-256` on every webhook.

For production, generate a **System User access token** with `whatsapp_business_messaging` + `whatsapp_business_management` scopes (these don't expire). See https://developers.facebook.com/docs/whatsapp/business-management-api/get-started.

---

## 3. Set Cloudflare Worker secrets

```bash
cd apps/worker

# Verify token — pick any random string; you'll also paste it into Meta below.
wrangler secret put WHATSAPP_VERIFY_TOKEN
# > paste a random 32+ char string

wrangler secret put WHATSAPP_ACCESS_TOKEN
# > paste the System User token (or temp token during dev)

wrangler secret put WHATSAPP_PHONE_NUMBER_ID
# > paste the phone number id from API Setup

wrangler secret put WHATSAPP_APP_SECRET
# > paste the App Secret from App Settings → Basic
```

`PUBLIC_SITE_URL` is already in `wrangler.toml` (`https://www.transcriu.com`). Override per-env if needed.

Deploy:

```bash
wrangler deploy
```

Note the worker URL — e.g. `https://transcribe-worker.<your-account>.workers.dev`.

---

## 4. Configure the Meta webhook

In **WhatsApp → Configuration**:

1. **Callback URL**: `https://transcribe-worker.<your-account>.workers.dev/wa/webhook`
2. **Verify token**: the same string you put in `WHATSAPP_VERIFY_TOKEN`.
3. Click **Verify and save** — Meta calls our `GET /wa/webhook` with the challenge; the worker echoes it back. If you see "Webhook verified", you're done.
4. Under **Webhook fields**, subscribe to **messages**.

That's it for inbound. Outbound (replies) uses the access token directly — no extra config.

---

## 5. Smoke-test

1. From Meta API Setup, click "Send message" → make sure your test phone receives "Hello World".
2. In Transcriu dashboard (signed in as your own user), open **Settings → WhatsApp** and enter your phone in E.164 (e.g. `+34612345678`). Save.
3. From WhatsApp on that phone, send a **voice note** to the Transcriu test number.
4. Within ~5 seconds you should see: "He rebut el teu àudio. Estic transcrivint-lo…".
5. A few seconds later: "✅ Transcripció llesta! …" with a deep link into `/library?audio=<id>`.

### Common issues

| Symptom | Likely cause |
|---|---|
| Webhook verification fails | `WHATSAPP_VERIFY_TOKEN` mismatch between Meta UI and Worker secret. |
| Worker returns 403 on POST | `X-Hub-Signature-256` failed — usually wrong `WHATSAPP_APP_SECRET`. |
| Bot replies "No reconec aquest número" | Phone in `profiles.phone` doesn't match the WA `from` digits. Make sure you saved it in E.164 (with `+`). |
| Bot ack but no completion reply | Check Workers logs (`wrangler tail`) — usually `WHATSAPP_ACCESS_TOKEN` expired (temp tokens last 24 h; use a System User token). |
| "L'àudio supera el màxim" | WA caps voice notes at 16 MB. Ask user to send a shorter clip. |

---

## 6. Going to production

The Meta test number is enough to validate the loop. To serve real users you need:

1. **Business verification** in Meta Business Suite — proof of business identity, takes 1–2 weeks.
2. A **real WhatsApp phone number** (BYO or buy through Meta) — registered to your verified WABA.
3. A **System User access token** (non-expiring) — replace the dev token in `WHATSAPP_ACCESS_TOKEN`.
4. Optionally a **display name** approval (the name users see in their WhatsApp chat).

Once verified, just `wrangler secret put` the new `WHATSAPP_PHONE_NUMBER_ID` and `WHATSAPP_ACCESS_TOKEN` and redeploy — no code changes needed.

---

## 7. Cost notes

- **Service conversations** (user-initiated, the only kind we use) are **free up to 1,000/month** as of late 2024. Beyond that ~€0.005-€0.05 each depending on country.
- **Workers AI** transcription cost is unchanged — same Whisper invocation as web uploads.
- **R2** stores the source audio + transcription JSON the same way as web uploads.

---

## File map

| File | What it does |
|---|---|
| `apps/web/supabase-migration-whatsapp.sql` | DB schema: phone on profiles, source tags on audios |
| `apps/worker/src/adapters/whatsapp.ts` | Meta Graph API client + HMAC signature verification |
| `apps/worker/src/routes/whatsapp.ts` | `/wa/webhook` — GET handshake + POST inbound message handler |
| `apps/worker/src/queue/processor.ts` | Adds `kind:'whatsapp'` job that transcribes + sends WA reply on completion |
| `apps/worker/src/index.ts` | Registers `/wa/webhook` route |
| `apps/worker/src/types.ts` | Adds `WHATSAPP_*` + `PUBLIC_SITE_URL` to `Env` |
| `apps/web/src/app/api/user/phone/route.ts` | GET/PATCH for the user's WhatsApp phone (E.164 + uniqueness) |
| `apps/web/src/components/settings/SettingsDialog.tsx` | Adds WhatsApp phone field |
