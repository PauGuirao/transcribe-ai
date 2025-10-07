import AppLayout from '@/components/layout/AppLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { BookOpen, Users, Settings, Play, Clock, ChevronRight, Edit, FileText } from 'lucide-react'
import Link from 'next/link'

  const tutorials = [
    {
      id: 'ajuda-a-crear-una-transcripcio',
      title: 'Fer una transcripció',
      description: 'Aprèn pas a pas com crear la teva primera transcripció',
      icon: Play,
      duration: '5 min',
      difficulty: 'Bàsic'
    },
    {
      id: 'com-editar-i-baixar-una-transcripcio',
      title: 'Com editar i baixar una transcripció',
      description: 'Aprèn a editar el text transcrit i descarregar-lo en diferents formats',
      icon: Edit,
      duration: '4 min',
      difficulty: 'Bàsic'
    },
    {
      id: 'copiar-la-transcripcio-a-un-word',
      title: 'Enganxar la transcripció a un Word',
      description: 'Aprèn com copiar i enganxar la transcripció directament a Microsoft Word',
      icon: FileText,
      duration: '3 min',
      difficulty: 'Bàsic'
    },
    {
      id: 'gestio-alumnes',
      title: 'Gestió d\'alumnes',
      description: 'Com gestionar i organitzar els teus alumnes',
      icon: Users,
      duration: '7 min',
      difficulty: 'Intermig'
    }
  ]

export default function TutorialsPage() {
  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="text-center">
          <h2 className="mt-20 text-2xl font-bold text-gray-900">Tutorials</h2>
          <p className="mt-2 text-gray-600">Aprèn a utilitzar totes les funcionalitats de la plataforma</p>
        </div>

        {/* Tutorials List */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-5">
          {tutorials.map((tutorial) => {
            const IconComponent = tutorial.icon
            return (
              <Link key={tutorial.id} href={`/tutorials/${tutorial.id}`}>
                <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer group">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <IconComponent className="h-8 w-8 text-blue-600" />
                      <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
                    </div>
                    <CardTitle className="text-lg group-hover:text-blue-600 transition-colors">
                      {tutorial.title}
                    </CardTitle>
                    <CardDescription>
                      {tutorial.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {tutorial.duration}
                      </div>
                      <div className="flex items-center gap-1">
                        <Play className="h-4 w-4" />
                        {tutorial.difficulty}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      </div>
    </AppLayout>
  )
}