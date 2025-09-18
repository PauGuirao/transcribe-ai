import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { XCircle } from 'lucide-react'

export default function PaymentCancelledPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary/20 px-6">
      <div className="max-w-lg rounded-3xl border border-border/60 bg-background p-10 text-center shadow">
        <XCircle className="mx-auto mb-4 h-12 w-12 text-destructive" />
        <h1 className="text-3xl font-semibold">Pago cancelado</h1>
        <p className="mt-3 text-muted-foreground">
          No se realizó ningún cargo. Puedes volver a intentar cuando quieras seleccionar un plan.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Button asChild>
            <Link href="/payment">Elegir otro plan</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/dashboard">Volver al dashboard</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
