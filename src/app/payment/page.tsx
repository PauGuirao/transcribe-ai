'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Check } from 'lucide-react'

type PlanKey = 'basic' | 'pro' | 'premium'

const plans: Array<{
  key: PlanKey
  name: string
  price: string
  originalPrice: string
  description: string
  features: string[]
  highlighted?: boolean
}> = [
  {
    key: 'basic',
    name: 'Bàsic',
    price: '5€',
    originalPrice: '9€',
    description: 'Ideal per descobrir Transcriu en el teu dia a dia.',
    features: [
      '30 transcripcions al mes',
      'Models base d\'IA optimitzats per a català i espanyol',
      'Editor col·laboratiu',
      'Suport estàndard',
    ],
    highlighted: false,
  },
  {
    key: 'pro',
    name: 'Pro',
    price: '9€',
    originalPrice: '19€',
    description: 'Perfecte per a equips que treballen amb múltiples entrevistes.',
    features: [
      '120 transcripcions al mes',
      'Models avançats amb diarització',
      'Exportacions il·limitades (PDF, DOCX, TXT)',
      'Suport prioritari en menys de 2h',
    ],
    highlighted: true,
  },
  {
    key: 'premium',
    name: 'Premium',
    price: '19€',
    originalPrice: '29€',
    description: 'Per a organitzacions que necessiten velocitat i control.',
    features: [
      '300 transcripcions al mes',
      'Models personalitzats i glossaris propis',
      'Integracions amb Slack, Notion i Drive',
      'Customer Success dedicat',
    ],
    highlighted: false,
  },
]

export default function PaymentPage() {
  const [loadingPlan, setLoadingPlan] = useState<PlanKey | null>(null)

  const handleSelectPlan = async (plan: PlanKey) => {
    try {
      setLoadingPlan(plan)
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
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

        <div className="grid gap-6 md:grid-cols-3">
          {plans.map((plan) => (
            <Card
              key={plan.name}
              className={plan.highlighted ? 'border-primary shadow-xl shadow-primary/20' : ''}
            >
              <CardHeader className="space-y-1">
                <CardTitle className="flex items-center justify-between text-left text-2xl font-semibold">
                  {plan.name}
                  {plan.highlighted && (
                    <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
                      Popular
                    </span>
                  )}
                </CardTitle>
                <div className="flex items-baseline gap-2 text-left">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="text-sm text-muted-foreground line-through">{plan.originalPrice}</span>
                  <span className="text-sm text-muted-foreground">/ mes</span>
                </div>
                <p className="text-left text-sm text-muted-foreground">{plan.description}</p>
              </CardHeader>
              <CardContent className="space-y-6">
                <ul className="space-y-3 text-left text-sm">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 text-primary" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  size="lg"
                  className="w-full rounded-xl"
                  disabled={loadingPlan !== null && loadingPlan !== plan.key}
                  onClick={() => handleSelectPlan(plan.key)}
                >
                  {loadingPlan === plan.key ? 'Redirigint...' : 'Començar'}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}