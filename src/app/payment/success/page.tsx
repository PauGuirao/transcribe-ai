import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { CheckCircle2 } from 'lucide-react'

export default function PaymentSuccessPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary/30 px-6">
      <div className="max-w-lg rounded-3xl border border-border/60 bg-background p-10 text-center shadow-xl">
        <CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-primary" />
        <h1 className="text-3xl font-semibold">¡Pago completado!</h1>
        <p className="mt-3 text-muted-foreground">
          Ya puedes disfrutar de todas las ventajas de TranscribeAI Pro. Si no ves cambios inmediatos,
          actualiza la página en unos segundos.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Button asChild>
            <Link href="/dashboard">Ir al dashboard</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/payment">Ver planes</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
