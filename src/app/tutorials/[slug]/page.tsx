import AppLayout from '@/components/layout/AppLayout'
import { Button } from '@/components/ui/button'
import { ArrowLeft, BookOpen, Clock, Play } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import Image from 'next/image'

const tutorials = {
  'ajuda-a-crear-una-transcripcio': {
    title: 'Com fer una transcripció',
    description: 'Aprèn pas a pas com crear la teva primera transcripció',
    duration: '5 min',
    difficulty: 'Bàsic',
    content: [
      {
        type: 'section',
        title: '1. Accedeix a la pàgina de transcripció',
        content: 'Navega fins a la secció "Transcriure" des del menú lateral de l\'aplicació o clicant el botó de Transcripció al mig de la pàgina d\'Inici',
        image: '/tutorial-images/1.webp'
      },
      {
        type: 'section',
        title: '2. Puja el teu arxiu d\'àudio',
        content: 'Fes clic al botó "Pujar arxiu" i selecciona l\'arxiu d\'àudio que vols transcriure. Els formats compatibles són MP3, WAV, M4A i altres formats d\'àudio comuns.',
        image: '/tutorial-images/2.webp'
      },
      {
        type: 'section',
        title: '3. Comença la transcripció',
        content: 'Un cop l\'audio s\'ha processat, fes clic al botó blau "Transcriure ara" per començar el procés de transcripció. Espera uns segons a que el procés es completi.',
        image: '/tutorial-images/3.webp'
      },
      {
        type: 'section',
        title: '4. Edita la transcripció',
        content: 'Un cop finalitzat el process d\'anilisis, apareixerá la transcripció realitzada al panell d\'edició. Aquest panell serveix per si el text generat té errors o si vols millorar la claredat, pots editar la transcripció utilitzant l\'editor integrat. Fes clic al segment que vols modificar i esborra o afegir text segons necessitis. El panel té un reproductor d\'audio per poder escoltar el text i una zona per poder baixar el document final.',
        image: '/tutorial-images/4.webp'
      }
    ]
  },
  'com-editar-i-baixar-una-transcripcio': {
    title: 'Com editar i baixar una transcripció',
    description: 'Aprèn a editar el text transcrit i descarregar-lo en diferents formats',
    duration: '4 min',
    difficulty: 'Bàsic',
    content: [
      {
        type: 'section',
        title: '1. Accedeix a la transcripció completada',
        content: 'Navega a la secció "Biblioteca" desde la barra lateral o menu principal per trobar les teves transcripcions completades o accedeix directament des de la pàgina de resultats d\'una transcripció.',
        image: '/tutorial-images/tutorial_2/1.png'
      },
      {
        type: 'section',
        title: '2. Obre la transcripció per editar',
        content: 'A la pàgina de biblioteca fes clic sobre la transcripció que vols modificar.',
        image: '/tutorial-images/tutorial_2/2.png'
      },
      {
        type: 'section',
        title: '3. Edita el contingut',
        content: 'A la pàgina d\'edició hi ha 4 parts. En vermell la transcripció editable. En blau el reproductor d\'audio per escoltar si la transcripció necesita modificacions. En verd, les opcions per baixar la transcripció final en PDF, Word o poder copiar-la/compartir-la. En groc el selector per asignar la transcripció a un alumne (si s\'ha creat previament)',
        image: '/tutorial-images/tutorial_2/3.png'
      },
      {
        type: 'section',
        title: '4. Guarda els canvis',
        content: 'Quan hagis d\'editat la transcripció fes clic al botó blau "Guardar" a la part superior esquerra per desar les modificacions realitzades. Sempre que quedi contingut per guardar a la part inferior sortirà un avis.',
        image: '/tutorial-images/tutorial_2/4.png'
      },
      {
        type: 'section',
        title: '5. Asignar parlants',
        content: 'Cada segment de la transcripció es pot assignar a un parlant específic. Utilitza el selector que hi ha a la part superior esquerra de cada segment per assignar el parlant corresponent. (Logepeda o Alumne)',
        image: '/tutorial-images/tutorial_2/5.png'
      },
      {
        type: 'section',
        title: '6. Afegir un nou segment',
        content: 'Si a la transcripció li falta alguna part que s\'ha identificat, pots afegir-lo fent clic a la part inferior dreta d\'un segment. Es crearà un nou segment a sota amb el temps corresponent correcte.',
        image: '/tutorial-images/tutorial_2/6.png'
      },
      {
        type: 'section',
        title: '7. Descarrega la transcripció',
        content: 'Utilitza una de les diferents opcions que hi ha a la part superior dreta del panell d\'edició per obtenir la transcripció en el format desitjat (WORD, PDF). També es pot copiar la transcripció per enganxar a un document o compartir per mail.',
        image: '/tutorial-images/tutorial_2/7.png'
      },
      {
        type: 'tip',
        title: 'Consell',
        content: 'Pots utilitzar les dreceres de teclat Ctrl+Z (Cmd+Z en Mac) per desfer els canvis realitzats a la transcripció.'
      }
    ]
  },
  'enganchar-la-transcripcio-a-un-word': {
    title: 'Enganxar la transcripció a un Word',
    description: 'Aprèn com copiar i enganxar la transcripció directament a Microsoft Word',
    duration: '3 min',
    difficulty: 'Bàsic',
    content: [
      {
        type: 'section',
        title: '1. Accedeix a la transcripció completada',
        content: 'Navega a la secció "Biblioteca" desde la barra lateral o menu principal per trobar les teves transcripcions completades o accedeix directament des de la pàgina de resultats d\'una transcripció.',
        image: '/tutorial-images/tutorial_2/1.png'
      },
      {
        type: 'section',
        title: '2. Obre la transcripció per editar',
        content: 'A la pàgina de biblioteca fes clic sobre la transcripció que vols modificar.',
        image: '/tutorial-images/tutorial_2/2.png'
      },
      {
        type: 'section',
        title: '3. Edita el contingut',
        content: 'A la pàgina d\'edició hi ha 4 parts. En vermell la transcripció editable. En blau el reproductor d\'audio per escoltar si la transcripció necesita modificacions. En verd, les opcions per baixar la transcripció final en PDF, Word o poder copiar-la/compartir-la. En groc el selector per asignar la transcripció a un alumne (si s\'ha creat previament)',
        image: '/tutorial-images/tutorial_2/3.png'
      },
      {
        type: 'section',
        title: '4. Guarda els canvis',
        content: 'Quan hagis d\'editat la transcripció fes clic al botó blau "Guardar" a la part superior esquerra per desar les modificacions realitzades. Sempre que quedi contingut per guardar a la part inferior sortirà un avis.',
        image: '/tutorial-images/tutorial_2/4.png'
      },
      {
        type: 'section',
        title: '5. Copia la transcripció',
        content: 'Utilitza el botó de copiar de les diferents opcions que hi ha a la part superior dreta del panell d\'opcions per copiar la transcripció. Un cop copiada, pots enganxar-la a un document Word o compartir-la per mail.',
        image: '/tutorial-images/tutorial_2/7.png'
      },
      {
        type: 'section',
        title: '6. Enganxa la transcripció',
        content: 'Obre Microsoft Word o Document de google i fes Ctrl+V per enganxar la transcripció. Aquí podràs editar el necesari dins del document.',
        image: '/tutorial-images/tutorial_2/8.png'
      },
    ]
  },
  'gestio-alumnes':{
    title: 'Gestió d\'alumnes i assignació de transcripcions',
    description: 'Aprèn com crear alumnes i assignar-los transcripcions per a una millor organització',
    duration: '7 min',
    difficulty: 'Intermig',
    content: [
      {
        type: 'section',
        title: '1. Accedeix a la secció d\'Alumnes',
        content: 'Navega a la secció "Alumnes" des de la barra lateral per gestionar els teus estudiants. Aquí podràs veure tots els alumnes creats i les seves transcripcions assignades.',
        image: '/tutorial-images/tutorial_3/1.png'
      },
      {
        type: 'section',
        title: '2. Crea un nou alumne',
        content: 'Fes clic al botó "Nou Alumne" per crear un nou estudiant. Hauràs de proporcionar el nom i edat de l\'alumne per completar el registre.',
        image: '/tutorial-images/tutorial_3/2.png'
      },
      {
        type: 'section',
        title: '3. Omple les dades de l\'alumne',
        content: 'Completa el formulari amb la informació de l\'alumne: nom i edat. Aquesta informació servirà per identificar i organitzar les transcripcions.',
        image: '/tutorial-images/tutorial_3/3.png'
      },
      {
        type: 'section',
        title: '4. Confirma la creació de l\'alumne',
        content: 'Revisa les dades introduïdes i fes clic a "Crear Alumne" per guardar la informació. L\'alumne apareixerà a la llista i estarà disponible per assignar transcripcions.',
        image: '/tutorial-images/tutorial_3/4.png'
      },
      {
        type: 'section',
        title: '5. Accedeix al panell d\'edició',
        content: 'Navega a la biblioteca de transcripcions i selecciona la transcripció que vols assignar a un alumne. A la part Accions clica als tres punts i seleciona la opció Editar.',
        image: '/tutorial-images/tutorial_3/5.png'
      },
      {
        type: 'section',
        title: '6. Selecciona l\'alumne per assignar',
        content: 'A l\'editor, utilitza el selector d\'alumnes (normalment situat a la part inferior) per triar l\'alumne al qual vols assignar aquesta transcripció.',
        image: '/tutorial-images/tutorial_3/6.png'
      },
      {
        type: 'section',
        title: '7. Confirma l\'assignació',
        content: 'Un cop seleccionat l\'alumne, la transcripció quedarà assignada automàticament. Podràs veure aquesta assignació tant a la biblioteca com a la secció d\'alumnes.',
        image: '/tutorial-images/tutorial_3/7.png'
      },
      {
        type: 'tip',
        title: 'Consell',
        content: 'Organitzar les transcripcions per alumnes et permet fer un seguiment més eficient del progrés de cada estudiant i generar informes personalitzats.'
      }
    ]
  },
}

interface TutorialPageProps {
  params: {
    slug: string
  }
}

export default async function TutorialPage({ params }: TutorialPageProps) {
  const { slug } = await params
  const tutorial = tutorials[slug as keyof typeof tutorials]
  
  if (!tutorial) {
    notFound()
  }

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto px-4">
        {/* Back Button */}
        <div className="mt-8">
          <Link href="/tutorials">
            <Button variant="ghost" className="mb-6">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Tornar als tutorials
            </Button>
          </Link>
        </div>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{tutorial.title}</h1>
              <p className="text-gray-600 mt-1">{tutorial.description}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-6 text-sm text-gray-500">
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {tutorial.duration}
            </div>
            <div className="flex items-center gap-1">
              <Play className="h-4 w-4" />
              {tutorial.difficulty}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-8">
          {tutorial.content.map((section, index) => (
            <div key={index} className={section.type === 'tip' ? 'p-4 rounded-lg border-l-4 border-blue-400 bg-blue-50' : ''}>
              <h3 className={`text-lg font-semibold mb-3 ${
                section.type === 'tip' ? 'text-blue-800' : 'text-gray-900'
              }`}>
                {section.title}
              </h3>
              <p className={`leading-relaxed mb-4 ${
                section.type === 'tip' ? 'text-blue-700' : 'text-gray-700'
              }`}>
                {section.content}
              </p>
              {section.image && (
                <div className="mt-4 flex justify-left">
                  <div className="relative w-full max-w-2xl">
                    <Image
                      src={section.image}
                      alt={`Illustration for ${section.title}`}
                      width={700}
                      height={600}
                      className="rounded-xs border border-gray-300 shadow-sm"
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Navigation */}
        <div className="mt-12 mb-8 flex justify-between">
          <Link href="/tutorials">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Tornar als tutorials
            </Button>
          </Link>
        </div>
      </div>
    </AppLayout>
  )
}

export async function generateStaticParams() {
  return Object.keys(tutorials).map((slug) => ({
    slug,
  }))
}