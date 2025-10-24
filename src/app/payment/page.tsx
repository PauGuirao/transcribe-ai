'use client'

import { useState } from 'react'
import { PricingCard, type PricingPlan } from '@/components/PricingCard'

type PlanKey = 'free' | 'paid' | 'group'

const plans: PricingPlan[] = [
  {
    key: 'paid',
    name: 'Pro',
    price: '7€',
    description: "Transcripcions il·limitades per a professionals.",
    features: [
      "Transcripcions il·limitades",
      "Models avançats amb diarització",
      "Exportacions il·limitades (PDF, DOCX, TXT)",
      "Editor col·laboratiu avançat",
      "Suport prioritari",
    ],
    highlighted: true,
  },
  {
    key: 'group',
    name: 'Grupal',
    price: 'Personalitzat',
    description: "Solucions escalables per a equips",
    features: [
      "Usuaris il·limitats per a l'equip",
      "Gestió centralitzada d'usuaris i permisos",
      "Suport dedicat",
      "Descomptes per volum",
    ],
    highlighted: false,
  },
]

export default function PaymentPage() {
  const [loadingPlan, setLoadingPlan] = useState<PlanKey | null>(null)

  const handleSelectPlan = async (plan: PlanKey, users?: number) => {
    try {
      setLoadingPlan(plan)
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, users }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data?.error || 'No s\'ha pogut iniciar el checkout')
      }

      const { url } = await response.json()
      if (url) {
        window.location.href = url
      }
    } catch (error) {
      console.error('Stripe checkout error:', error)
      alert('Hi ha hagut un problema en redirigir a Stripe. Torna-ho a provar.')
      setLoadingPlan(null)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-secondary/40 via-background to-background py-16">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-6 text-center">
        <div className="space-y-4">
          <p className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
            Plans flexibles
          </p>
          <h1 className="text-4xl font-bold tracking-tight text-balance sm:text-5xl">
            Preus simples i transparents
          </h1>

          <p className="mx-auto max-w-3xl text-lg text-muted-foreground">
            Comença amb minuts gratuïts i escala quan el teu equip ho necessiti. Els nostres plans inclouen processament segur i eines col·laboratives per accelerar la documentació de les teves sessions.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 justify-items-center max-w-3xl mx-auto">
          {plans.map((plan) => (
            <PricingCard
              key={plan.key}
              plan={plan}
              authLoading={false}
              loading={loadingPlan === (plan.key === 'group' ? 'group' : plan.key)}
              onPrimaryAction={(opts) => handleSelectPlan(plan.key === 'group' ? 'group' : (plan.key as PlanKey), opts?.users)}
              onContactClick={() => { /* not used in payment */ }}
              orgCallsPrimaryAction={plan.key === 'group'}
            />
          ))}
        </div>
      </div>
    </div>
  )
}