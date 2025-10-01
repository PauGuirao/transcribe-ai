'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, XCircle, Building2, Users, Crown } from 'lucide-react';

interface GroupInvitationData {
  email: string;
  organization_name: string;
  amount_paid: number;
  currency: string;
  payment_status: string;
  expires_at: string;
  is_used: boolean;
}

export default function GroupInvitePage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [invitation, setInvitation] = useState<GroupInvitationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);

  const token = params.token as string;

  // Validate invitation token
  useEffect(() => {
    const validateInvitation = async () => {
      if (!token) {
        setError('Token d\'invitació no vàlid');
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/group-invite/validate/${token}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Error validant la invitació');
        }

        setInvitation(data.invitation);
      } catch (err) {
        console.error('Error validating invitation:', err);
        setError(err instanceof Error ? err.message : 'Error validant la invitació');
      } finally {
        setLoading(false);
      }
    };

    validateInvitation();
  }, [token]);

  // Handle joining the organization
  const handleJoinOrganization = async () => {
    if (!user) {
      // Set cookie with group invitation token
      document.cookie = `group_invite_token=${token}; path=/; max-age=3600; SameSite=Lax`;
      router.push('/auth/signin?group_invite=true');
      return;
    }

    if (!invitation) return;

    // Check if user email matches invitation email
    if (user.email !== invitation.email) {
      setError(`Aquesta invitació és per a ${invitation.email}. Si us plau, inicieu sessió amb el correu correcte.`);
      return;
    }

    setJoining(true);
    setError(null);

    try {
      const response = await fetch('/api/group-invite/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error unint-se a l\'organització');
      }

      // Redirect to organization setup
      router.push('/organization?group_setup=true');
    } catch (err) {
      console.error('Error joining organization:', err);
      setError(err instanceof Error ? err.message : 'Error unint-se a l\'organització');
    } finally {
      setJoining(false);
    }
  };

  // Show loading state
  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex items-center justify-center p-8">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
              <p className="text-gray-600 dark:text-gray-400">Validant invitació...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <CardTitle className="text-red-700 dark:text-red-400">Error d'Invitació</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
            <Button 
              onClick={() => router.push('/')}
              variant="outline"
            >
              Tornar a l'inici
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show invitation expired or used
  if (invitation && (invitation.is_used || new Date(invitation.expires_at) < new Date())) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-orange-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <XCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
            <CardTitle className="text-yellow-700 dark:text-yellow-400">
              {invitation.is_used ? 'Invitació ja utilitzada' : 'Invitació caducada'}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {invitation.is_used 
                ? 'Aquesta invitació ja ha estat utilitzada per crear una organització.'
                : 'Aquesta invitació ha caducat. Si us plau, contacteu amb el suport per obtenir una nova invitació.'
              }
            </p>
            <Button 
              onClick={() => router.push('/')}
              variant="outline"
            >
              Tornar a l'inici
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show login required
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Building2 className="w-12 h-12 text-blue-600 mx-auto mb-4" />
            <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">
              Invitació de Grup
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">
                {invitation?.organization_name}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Heu estat convidat a unir-vos a aquesta organització amb un pla de grup.
              </p>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Si us plau, inicieu sessió amb <strong>{invitation?.email}</strong> per continuar.
            </p>
            <Button 
              onClick={handleJoinOrganization}
              className="w-full"
            >
              Iniciar Sessió
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show main invitation interface
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-green-100 dark:bg-green-900/30 p-3 rounded-full">
              <Building2 className="w-8 h-8 text-green-600" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">
            🎉 Benvingut al Pla de Grup!
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center mb-6">
            <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2">
              {invitation?.organization_name}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Esteu a punt d'unir-vos a aquesta organització amb un pla de grup premium.
            </p>
            
            {/* Payment confirmation */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
              <CheckCircle className="w-6 h-6 text-blue-600 mx-auto mb-2" />
              <p className="text-sm text-blue-700 dark:text-blue-400 font-medium">
                Pagament Confirmat
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-500">
                {new Intl.NumberFormat('ca-ES', {
                  style: 'currency',
                  currency: invitation?.currency?.toUpperCase() || 'EUR',
                }).format((invitation?.amount_paid || 0) / 100)}
              </p>
            </div>

            {/* Plan features */}
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-6">
              <Crown className="w-6 h-6 text-green-600 mx-auto mb-3" />
              <h4 className="font-semibold text-green-800 dark:text-green-300 mb-3">
                Funcions del Pla de Grup
              </h4>
              <div className="text-left space-y-2 text-sm text-green-700 dark:text-green-400">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  <span>Fins a 40 membres en la vostra organització</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  <span>Transcripcions il·limitades per a tot l'equip</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  <span>Gestió centralitzada de projectes</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  <span>Suport prioritari per a empreses</span>
                </div>
              </div>
            </div>

            {/* Email verification notice */}
            {user.email !== invitation?.email && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6">
                <p className="text-sm text-yellow-700 dark:text-yellow-400">
                  ⚠️ Aquesta invitació és per a <strong>{invitation?.email}</strong>. 
                  Actualment heu iniciat sessió com <strong>{user.email}</strong>.
                </p>
              </div>
            )}
          </div>

          <Button
            onClick={handleJoinOrganization}
            disabled={joining || user.email !== invitation?.email}
            className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
            size="lg"
          >
            {joining ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Unint-se a l'organització...
              </>
            ) : (
              <>
                <Building2 className="w-5 h-5 mr-2" />
                Unir-se a {invitation?.organization_name}
              </>
            )}
          </Button>

          <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-4">
            En fer clic, creareu la vostra organització i sereu redirigit al tauler de configuració.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}