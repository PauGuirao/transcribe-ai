'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Pricing } from '@/components/Pricing'
import { useAuth } from '@/contexts/AuthContext'
import { type PlanId, type BillingPeriod, PLANS } from '@/config/pricing'
import { Loader2 } from 'lucide-react'

export default function PaymentPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [loading, setLoading] = useState(false)
  const [autoRedirect, setAutoRedirect] = useState(false)

  // Get plan from URL params
  const planFromUrl = searchParams.get('plan') as PlanId | null
  const periodFromUrl = (searchParams.get('period') as BillingPeriod) || 'monthly'
  const usersFromUrl = searchParams.get('users')

  // Auto-redirect to Stripe if plan is pre-selected
  useEffect(() => {
    if (planFromUrl && planFromUrl !== 'free' && user && !autoRedirect) {
      setAutoRedirect(true)
      const users = usersFromUrl ? parseInt(usersFromUrl) : undefined
      handlePlanSelect(planFromUrl, periodFromUrl, users)
    }
  }, [planFromUrl, periodFromUrl, usersFromUrl, user, autoRedirect])

  const handlePlanSelect = async (planId: PlanId, period: BillingPeriod, users?: number) => {
    // Free plan - go to dashboard
    if (planId === 'free') {
      router.push('/dashboard')
      return
    }

    // Validate plan exists
    const plan = PLANS[planId]
    if (!plan) {
      alert('Pla no vàlid')
      return
    }

    // Validate user count for team plans
    if (plan.perUser && users) {
      if (users < plan.users.min || users > plan.users.max) {
        alert(`El nombre d'usuaris ha de ser entre ${plan.users.min} i ${plan.users.max}`)
        return
      }
    }

    try {
      setLoading(true)
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: planId,
          period,
          users: users || (plan.perUser ? plan.users.min : 1),
        }),
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
      setLoading(false)
      setAutoRedirect(false)
    }
  }

  // Show loading while auto-redirecting
  if (autoRedirect && planFromUrl) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-secondary/40 via-background to-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-lg text-gray-600">Redirigint a Stripe...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-secondary/40 via-background to-background py-16">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-12 px-6 text-center">
        <div className="space-y-4">
          <p className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
            Plans flexibles
          </p>
          <h1 className="text-4xl font-bold tracking-tight text-balance sm:text-5xl">
            Preus simples i transparents
          </h1>
          <p className="mx-auto max-w-3xl text-lg text-muted-foreground">
            Comença gratis i escala quan ho necessitis. Sense sorpreses, sense trucades.
          </p>
        </div>

        <Pricing
          authLoading={authLoading}
          loading={loading}
          onPrimaryAction={handlePlanSelect}
        />
      </div>
    </div>
  )
}
