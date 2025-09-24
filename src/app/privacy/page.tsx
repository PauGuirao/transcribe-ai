'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function Privacy() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-secondary/40">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur border-b">
        <div className="mx-auto flex w-full max-w-4xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center space-x-2">
            <img src="/logo3.png" alt="TranscribeAI Logo" className="h-10" />
            <h1 className="text-2xl font-semibold text-gray-900">transcriu</h1>
          </Link>
          <Button variant="ghost" asChild>
            <Link href="/" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Tornar a l&apos;inici
            </Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-12">
        <div className="space-y-8">
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold tracking-tight">
              Política de Privacitat
            </h1>
            <p className="text-lg text-muted-foreground" suppressHydrationWarning>
              Última actualització: {new Date().toLocaleDateString('ca-ES')}
            </p>
          </div>

          <div className="prose prose-gray max-w-none space-y-8">
            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">1. Introducció</h2>
              <p className="text-muted-foreground leading-relaxed">
                Aquesta Política de Privacitat descriu com Transcriu recull, utilitza i protegeix 
                la teva informació personal quan utilitzes el nostre servei de transcripció d&apos;àudio.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">2. Informació que Recollim</h2>
              <div className="space-y-3">
                <h3 className="text-lg font-medium">2.1 Informació Personal</h3>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                  <li>Nom i adreça de correu electrònic</li>
                  <li>Informació de facturació i pagament</li>
                  <li>Informació professional (especialitat, lloc de treball)</li>
                  <li>Preferències d&apos;usuari i configuració del compte</li>
                </ul>
                
                <h3 className="text-lg font-medium">2.2 Contingut d&apos;Àudio</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Processem els arxius d&apos;àudio que puges per proporcionar el servei de transcripció. 
                  Aquest contingut pot incloure informació sensible de pacients.
                </p>
                
                <h3 className="text-lg font-medium">2.3 Dades Tècniques</h3>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                  <li>Adreça IP i informació del dispositiu</li>
                  <li>Tipus de navegador i sistema operatiu</li>
                  <li>Dades d&apos;ús i patrons de navegació</li>
                  <li>Registres del servidor i mètriques de rendiment</li>
                </ul>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">3. Com Utilitzem la Teva Informació</h2>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>Proporcionar i millorar el servei de transcripció</li>
                <li>Processar pagaments i gestionar la teva subscripció</li>
                <li>Comunicar-nos amb tu sobre el servei</li>
                <li>Complir amb obligacions legals i regulatòries</li>
                <li>Detectar i prevenir frau o ús indegut</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">4. Compartir Dades</h2>
              <p className="text-muted-foreground leading-relaxed">
                No venem, lloguem o compartim la teva informació personal amb tercers, excepte en 
                les següents circumstàncies:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>Amb el teu consentiment explícit</li>
                <li>Per complir amb requeriments legals</li>
                <li>Per protegir els nostres drets o seguretat</li>
                <li>Amb proveïdors de serveis que ens ajuden a operar la plataforma</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">5. Seguretat de les Dades</h2>
              <p className="text-muted-foreground leading-relaxed">
                Implementem mesures de seguretat tècniques i organitzatives per protegir la teva 
                informació:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>Xifratge de dades en trànsit i en repòs</li>
                <li>Accés restringit basat en rols</li>
                <li>Monitorització contínua de seguretat</li>
                <li>Còpies de seguretat regulars i segures</li>
                <li>Compliment amb estàndards de la indústria</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">6. Retenció de Dades</h2>
              <p className="text-muted-foreground leading-relaxed">
                Conservem la teva informació personal només el temps necessari per als fins descrits 
                en aquesta política:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>Dades del compte: mentre mantinguis el compte actiu</li>
                <li>Arxius d&apos;àudio: segons les teves preferències de retenció</li>
                <li>Dades de facturació: segons requeriments fiscals i legals</li>
                <li>Registres tècnics: màxim 12 mesos</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">7. Els Teus Drets</h2>
              <p className="text-muted-foreground leading-relaxed">
                Tens els següents drets respecte a les teves dades personals:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>Accés: sol·licitar còpia de les teves dades</li>
                <li>Rectificació: corregir dades inexactes</li>
                <li>Supressió: sol·licitar l&apos;eliminació de les teves dades</li>
                <li>Portabilitat: rebre les teves dades en format estructurat</li>
                <li>Oposició: oposar-te al tractament de les teves dades</li>
                <li>Limitació: restringir el tractament en certes circumstàncies</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">8. Cookies i Tecnologies Similars</h2>
              <p className="text-muted-foreground leading-relaxed">
                Utilitzem cookies i tecnologies similars per millorar la teva experiència:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>Cookies essencials per al funcionament del servei</li>
                <li>Cookies d&apos;anàlisi per entendre l&apos;ús de la plataforma</li>
                <li>Cookies de preferències per recordar la teva configuració</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">9. Transferències Internacionals</h2>
              <p className="text-muted-foreground leading-relaxed">
                Les teves dades poden ser processades en servidors ubicats fora del teu país. 
                Garantim que aquestes transferències compleixen amb les regulacions de protecció 
                de dades aplicables.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">10. Canvis en aquesta Política</h2>
              <p className="text-muted-foreground leading-relaxed">
                Podem actualitzar aquesta política ocasionalment. Et notificarem els canvis 
                significatius per correu electrònic o mitjançant un avís a la plataforma.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">11. Contacte</h2>
              <p className="text-muted-foreground leading-relaxed">
                Si tens preguntes sobre aquesta Política de Privacitat o vols exercir els teus 
                drets, pots contactar-nos a:
              </p>
              <div className="bg-muted p-4 rounded-lg">
                <p className="font-medium">Transcriu - Responsable de Protecció de Dades</p>
                <p className="text-muted-foreground">Email: privacy@transcriu.com</p>
                <p className="text-muted-foreground">Adreça: Barcelona, Catalunya, Espanya</p>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">12. Base Legal</h2>
              <p className="text-muted-foreground leading-relaxed">
                El tractament de les teves dades es basa en:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>Execució del contracte de servei</li>
                <li>Consentiment per a finalitats específiques</li>
                <li>Interès legítim per millorar el servei</li>
                <li>Compliment d&apos;obligacions legals</li>
              </ul>
            </section>
          </div>
        </div>
      </main>

      <footer className="border-t bg-background/50 backdrop-blur">
        <div className="mx-auto max-w-4xl px-6 py-8">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <div className="flex items-center space-x-2">
              <img src="/logo3.png" alt="TranscribeAI Logo" className="h-8" />
              <span className="text-lg font-semibold">transcriu</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <Link href="/privacy" className="hover:text-foreground">
                Privacitat
              </Link>
              <Link href="/terms" className="hover:text-foreground">
                Termes
              </Link>
              <Link href="/" className="hover:text-foreground">
                Contacte
              </Link>
            </div>
          </div>
          <div className="mt-4 text-center text-sm text-muted-foreground">
            <p>&copy; 2024 Transcriu. Tots els drets reservats.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}