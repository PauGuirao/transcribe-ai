'use client';

export function Features() {
  return (
    <section className="py-16 bg-gray-20">
      <div className="max-w-6xl mx-auto px-2 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Funcionalitats avançades per a l'educació
          </h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Descobreix una varietat de funcions avançades. Il·limitades i gratuïtes per a individuals.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 gap-8">
          {/* Transcription Library Card */}
          <div className="bg-white rounded-lg p-8 shadow-lg border border-gray-200">
            <div className="mb-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Biblioteca de transcripcions
              </h3>
              <p className="text-gray-600 mb-6">
                Organitza i gestiona totes les teves transcripcions en un sol lloc. Cerca, filtra i accedeix ràpidament al contingut que necessites per a les teves classes.
              </p>
            </div>
            
            {/* Mock Library Interface */}
            <div className="bg-gray-50 rounded-lg p-4 border">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-gray-600">Biblioteca</span>
                </div>
                <div className="text-xs text-gray-400">24 transcripcions</div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center space-x-3 p-2 bg-white rounded">
                  <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center">
                    <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900">Classe de matemàtiques</div>
                    <div className="text-xs text-gray-500">15 min • Avui</div>
                  </div>
                </div>
                <div className="flex items-center space-x-3 p-2 bg-white rounded">
                  <div className="w-8 h-8 bg-green-100 rounded flex items-center justify-center">
                    <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900">Història contemporània</div>
                    <div className="text-xs text-gray-500">32 min • Ahir</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Students Creation Card */}
          <div className="bg-white rounded-lg p-8 shadow-lg border border-gray-200">
            <div className="mb-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Gestió d'alumnes
              </h3>
              <p className="text-gray-600 mb-6">
                Crea perfils d'alumnes, assigna transcripcions personalitzades i fes un seguiment del seu progrés acadèmic de manera eficient.
              </p>
            </div>

            {/* Mock Students Interface */}
            <div className="bg-gray-50 rounded-lg p-4 border">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-900">Alumnes actius</span>
                <span className="text-xs text-gray-400">28 estudiants</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center space-x-2 p-2 bg-blue-50 rounded">
                  <div className="w-6 h-6 bg-blue-200 rounded-full flex items-center justify-center">
                    <span className="text-xs font-medium text-blue-800">AM</span>
                  </div>
                  <span className="text-xs text-gray-700">Anna Martí</span>
                </div>
                <div className="flex items-center space-x-2 p-2 bg-green-50 rounded">
                  <div className="w-6 h-6 bg-green-200 rounded-full flex items-center justify-center">
                    <span className="text-xs font-medium text-green-800">JG</span>
                  </div>
                  <span className="text-xs text-gray-700">Joan Garcia</span>
                </div>
                <div className="flex items-center space-x-2 p-2 bg-purple-50 rounded">
                  <div className="w-6 h-6 bg-purple-200 rounded-full flex items-center justify-center">
                    <span className="text-xs font-medium text-purple-800">ML</span>
                  </div>
                  <span className="text-xs text-gray-700">Maria López</span>
                </div>
                <div className="flex items-center space-x-2 p-2 bg-orange-50 rounded">
                  <div className="w-6 h-6 bg-orange-200 rounded-full flex items-center justify-center">
                    <span className="text-xs font-medium text-orange-800">PS</span>
                  </div>
                  <span className="text-xs text-gray-700">Pere Soler</span>
                </div>
              </div>
            </div>
          </div>

          {/* Groups Card */}
          <div className="bg-white rounded-lg p-8 shadow-lg border border-gray-200">
            <div className="mb-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Organització en grups
              </h3>
              <p className="text-gray-600 mb-6">
                Crea grups de treball, assigna projectes col·laboratius i facilita la comunicació entre els membres del grup.
              </p>
            </div>

            {/* Mock Groups Interface */}
            <div className="bg-gray-50 rounded-lg p-4 border">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-900">Grups actius</span>
                <span className="text-xs text-gray-400">6 grups</span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2 bg-blue-50 rounded">
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 bg-blue-500 rounded flex items-center justify-center">
                      <span className="text-xs font-bold text-white">A</span>
                    </div>
                    <span className="text-sm text-gray-900">Grup A - Ciències</span>
                  </div>
                  <span className="text-xs text-gray-500">8 membres</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-green-50 rounded">
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 bg-green-500 rounded flex items-center justify-center">
                      <span className="text-xs font-bold text-white">B</span>
                    </div>
                    <span className="text-sm text-gray-900">Grup B - Humanitats</span>
                  </div>
                  <span className="text-xs text-gray-500">7 membres</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-purple-50 rounded">
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 bg-purple-500 rounded flex items-center justify-center">
                      <span className="text-xs font-bold text-white">C</span>
                    </div>
                    <span className="text-sm text-gray-900">Grup C - Tecnologia</span>
                  </div>
                  <span className="text-xs text-gray-500">6 membres</span>
                </div>
              </div>
            </div>
          </div>

          {/* Annotations Card */}
          <div className="bg-white rounded-lg p-8 shadow-lg border border-gray-200">
            <div className="mb-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Anotacions intel·ligents
              </h3>
              <p className="text-gray-600 mb-6">
                Afegeix notes, comentaris i marques temporals a les transcripcions. Crea material d'estudi personalitzat i destaca els punts clau.
              </p>
            </div>

            {/* Mock Annotations Interface */}
            <div className="bg-gray-50 rounded-lg p-4 border">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-900">Anotacions recents</span>
                <span className="text-xs text-gray-400">12 notes</span>
              </div>
              <div className="space-y-2">
                <div className="p-2 bg-yellow-50 border-l-2 border-yellow-400 rounded-r">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-yellow-800">Concepte important</span>
                    <span className="text-xs text-gray-500">03:45</span>
                  </div>
                  <p className="text-xs text-gray-600">Explicació sobre la fotosíntesi...</p>
                </div>
                <div className="p-2 bg-blue-50 border-l-2 border-blue-400 rounded-r">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-blue-800">Pregunta d'examen</span>
                    <span className="text-xs text-gray-500">07:22</span>
                  </div>
                  <p className="text-xs text-gray-600">Revisar aquest tema per l'examen...</p>
                </div>
                <div className="p-2 bg-green-50 border-l-2 border-green-400 rounded-r">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-green-800">Tasca pendent</span>
                    <span className="text-xs text-gray-500">12:10</span>
                  </div>
                  <p className="text-xs text-gray-600">Investigar més sobre aquest tema...</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}