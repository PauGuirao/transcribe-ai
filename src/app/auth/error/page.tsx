'use client';

import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';
import Link from 'next/link';

const errorMessages: Record<string, string> = {
  Configuration: 'Hay un problema con la configuración del servidor.',
  AccessDenied: 'No tienes permisos para acceder a esta aplicación.',
  Verification: 'El token ha expirado o ya ha sido usado.',
  Default: 'Ha ocurrido un error durante la autenticación.',
};

export default function AuthError() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');
  
  const errorMessage = error && errorMessages[error] 
    ? errorMessages[error] 
    : errorMessages.Default;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md border-destructive">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <AlertCircle className="h-12 w-12 text-destructive" />
          </div>
          <CardTitle className="text-2xl font-bold text-destructive">
            Error de Autenticación
          </CardTitle>
          <CardDescription className="text-destructive/80">
            {errorMessage}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button asChild className="w-full" size="lg">
            <Link href="/auth/signin">
              Intentar de nuevo
            </Link>
          </Button>
          <Button asChild variant="outline" className="w-full">
            <Link href="/">
              Volver al inicio
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}