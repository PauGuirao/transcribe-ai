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
    name: 'Básico',
    price: '€9',
    originalPrice: '€19',
    description: 'Ideal para descubrir Transcriu en tu día a día.',
    features: [
      '30 transcripciones al mes',
      'Modelos base de IA optimizados para español',
      'Editor colaborativo',
      'Soporte estándar',
    ],
    highlighted: false,
  },
  {
    key: 'pro',
    name: 'Pro',
    price: '€29',
    originalPrice: '€49',
    description: 'Perfecto para equipos que trabajan con múltiples entrevistas.',
    features: [
      '120 transcripciones al mes',
      'Modelos avanzados con diarización',
      'Exportaciones ilimitadas (PDF, DOCX, TXT)',
      'Soporte prioritario en menos de 2h',
    ],
    highlighted: true,
  },
  {
    key: 'premium',
    name: 'Premium',
    price: '€59',
    originalPrice: '€99',
    description: 'Para organizaciones que necesitan velocidad y control.',
    features: [
      '300 transcripciones al mes',
      'Modelos personalizados y glosarios propios',
      'Integraciones con Slack, Notion y Drive',
      'Customer Success dedicado',
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
        throw new Error(data?.error || 'No se pudo iniciar el checkout')
      }

      const { url } = await response.json()
      if (url) {
        window.location.href = url
      }
    } catch (error) {
      console.error('Stripe checkout error:', error)
      alert('Ocurrió un problema al redirigir a Stripe. Inténtalo nuevamente.')
      setLoadingPlan(null)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-secondary/40 via-background to-background py-16">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-6 text-center">
        <div className="space-y-4">
          <p className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
            Planes flexibles
          </p>
          <h1 className="text-4xl font-bold tracking-tight text-balance sm:text-5xl">
            Precios simples y transparentes
          </h1>
          <p className="mx-auto max-w-3xl text-lg text-muted-foreground">
            Comienza con minutos gratuitos y escala cuando tu equipo lo necesite. Nuestros planes incluyen procesamiento seguro y herramientas colaborativas para acelerar la documentación de tus reuniones.
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
                  {loadingPlan === plan.key ? 'Redirigiendo...' : 'Comenzar'}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
