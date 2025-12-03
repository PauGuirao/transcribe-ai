'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function Terms() {
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
              Termes i Condicions de Servei
            </h1>
            <p className="text-lg text-muted-foreground" suppressHydrationWarning>
              Última actualització: {new Date().toLocaleDateString()}
            </p>
          </div>

          <div className="prose prose-gray max-w-none space-y-8">
            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">1. Acceptació dels Termes</h2>
              <p className="text-muted-foreground leading-relaxed">
                En accedir i utilitzar Transcriu (&ldquo;el Servei&rdquo;), acceptes estar vinculat per aquests 
                Termes i Condicions de Servei (&ldquo;Termes&rdquo;). Si no estàs d&apos;acord amb qualsevol part 
                d&apos;aquests termes, no pots utilitzar el nostre servei.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">2. Descripció del Servei</h2>
              <p className="text-muted-foreground leading-relaxed">
                Transcriu és una plataforma de transcripció d&apos;àudio dissenyada específicament per a 
                logopedes i professionals de la salut. El servei permet:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>Transcripció automàtica d&apos;arxius d&apos;àudio</li>
                <li>Edició i revisió de transcripcions</li>
                <li>Exportació en diversos formats</li>
                <li>Gestió segura de dades de pacients</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">3. Comptes d&apos;Usuari</h2>
              <p className="text-muted-foreground leading-relaxed">
                Per utilitzar certes funcions del servei, has de crear un compte. Ets responsable de:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>Mantenir la confidencialitat de les teves credencials</li>
                <li>Totes les activitats que es produeixin sota el teu compte</li>
                <li>Notificar-nos immediatament de qualsevol ús no autoritzat</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">4. Ús Acceptable</h2>
              <p className="text-muted-foreground leading-relaxed">
                En utilitzar el nostre servei, acceptes no:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>Utilitzar el servei per a activitats il·legals o no autoritzades</li>
                <li>Interferir amb el funcionament del servei</li>
                <li>Intentar accedir a comptes d&apos;altres usuaris</li>
                <li>Transmetre virus, malware o codi maliciós</li>
                <li>Violar drets de propietat intel·lectual</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">5. Contingut i Propietat Intel·lectual</h2>
              <p className="text-muted-foreground leading-relaxed">
                Mantens la propietat de tot el contingut que puges al servei. No obstant això, ens 
                concedeix una llicència limitada per processar i transcriure els teus arxius d&apos;àudio 
                amb l&apos;única finalitat de proporcionar el servei.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                El servei i tot el programari, text, imatges i altres materials són propietat de 
                Transcriu o dels seus llicenciadors i estan protegits per les lleis de propietat 
                intel·lectual.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">6. Privacitat i Confidencialitat</h2>
              <p className="text-muted-foreground leading-relaxed">
                La teva privacitat és important per a nosaltres. El nostre tractament de les teves 
                dades personals es regeix per la nostra Política de Privacitat, que forma part 
                integral d&apos;aquests Termes.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                Ens comprometem a mantenir la confidencialitat de totes les dades de pacients i 
                informació sensible processada a través del nostre servei, complint amb les 
                regulacions de protecció de dades aplicables.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">7. Plans de Pagament</h2>
              <p className="text-muted-foreground leading-relaxed">
                Oferim diferents plans de subscripció amb diverses funcionalitats. Els preus i 
                termes de pagament es detallen a la nostra pàgina de preus.
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>Els pagaments es processen de forma segura a través de proveïdors de pagament de tercers</li>
                <li>Les subscripcions es renoven automàticament llevat que es cancel·lin</li>
                <li>Els reemborsaments es gestionen segons la nostra política de reemborsament</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">8. Disponibilitat del Servei</h2>
              <p className="text-muted-foreground leading-relaxed">
                Ens esforcem per mantenir el servei disponible 24/7, però no podem garantir un temps 
                d&apos;activitat del 100%. El servei pot estar temporalment no disponible per manteniment, 
                actualitzacions o circumstàncies imprevistes.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">9. Limitació de Responsabilitat</h2>
              <p className="text-muted-foreground leading-relaxed">
                En la màxima mesura permesa per la llei, Transcriu no serà responsable de:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>Danys indirectes, incidentals o conseqüents</li>
                <li>Pèrdua de beneficis, dades o ús</li>
                <li>Interrupcions del servei</li>
                <li>Errors en les transcripcions</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">10. Terminació</h2>
              <p className="text-muted-foreground leading-relaxed">
                Pots cancel·lar el teu compte en qualsevol moment. Ens reservem el dret de suspendre 
                o terminar comptes que violin aquests Termes o per altres motius legítims.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                En cas de terminació, les teves dades seran eliminades segons la nostra política 
                de retenció de dades.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">11. Modificacions dels Termes</h2>
              <p className="text-muted-foreground leading-relaxed">
                Ens reservem el dret de modificar aquests Termes en qualsevol moment. Les 
                modificacions entraran en vigor immediatament després de la seva publicació al 
                nostre lloc web.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                L&apos;ús continuat del servei després de les modificacions constitueix l&apos;acceptació 
                dels nous Termes.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">12. Llei Aplicable</h2>
              <p className="text-muted-foreground leading-relaxed">
                Aquests Termes es regeixen per les lleis de Catalunya i Espanya. Qualsevol disputa 
                es resoldrà als tribunals competents de Barcelona.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">13. Contacte</h2>
              <p className="text-muted-foreground leading-relaxed">
                Si tens preguntes sobre aquests Termes i Condicions, pots contactar-nos a:
              </p>
              <div className="bg-muted p-4 rounded-lg">
                <p className="font-medium">Transcriu</p>
                <p className="text-muted-foreground">Email: legal@transcriu.com</p>
                <p className="text-muted-foreground">Adreça: Barcelona, Catalunya, Espanya</p>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">14. Disposicions Generals</h2>
              <p className="text-muted-foreground leading-relaxed">
                Si qualsevol disposició d&apos;aquests Termes es considera invàlida o inaplicable, 
                la resta de disposicions continuaran en plena força i efecte.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                Aquests Termes constitueixen l&apos;acord complet entre tu i Transcriu respecte a 
                l&apos;ús del servei.
              </p>
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