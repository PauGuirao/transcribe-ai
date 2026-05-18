'use client';

import { useTranslations } from 'next-intl';

export function Features() {
  const t = useTranslations('features');
  return (
    <section className="py-16 bg-gray-20">
      <div className="max-w-6xl mx-auto px-2 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            {t('title')}
          </h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            {t('description')}
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 gap-8">
          {/* Transcription Library Card */}
          <div className="bg-white rounded-lg p-8 shadow-lg border border-gray-200">
            <div className="mb-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                {t('library.title')}
              </h3>
              <p className="text-gray-600 mb-6">
                {t('library.description')}
              </p>
            </div>

            {/* Mock Library Interface */}
            <div className="bg-gray-50 rounded-lg p-4 border">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-gray-600">{t('library.label')}</span>
                </div>
                <div className="text-xs text-gray-400">24 {t('library.count')}</div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center space-x-3 p-2 bg-white rounded">
                  <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center">
                    <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
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
                      <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
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
                {t('students.title')}
              </h3>
              <p className="text-gray-600 mb-6">
                {t('students.description')}
              </p>
            </div>

            {/* Mock Students Interface */}
            <div className="bg-gray-50 rounded-lg p-4 border">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-900">{t('students.activeStudents')}</span>
                <span className="text-xs text-gray-400">28 {t('students.count')}</span>
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
                {t('groups.title')}
              </h3>
              <p className="text-gray-600 mb-6">
                {t('groups.description')}
              </p>
            </div>

            {/* Mock Groups Interface */}
            <div className="bg-gray-50 rounded-lg p-4 border">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-900">{t('groups.activeGroups')}</span>
                <span className="text-xs text-gray-400">6 {t('groups.count')}</span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2 bg-blue-50 rounded">
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 bg-blue-500 rounded flex items-center justify-center">
                      <span className="text-xs font-bold text-white">A</span>
                    </div>
                    <span className="text-sm text-gray-900">Grup A - Ciències</span>
                  </div>
                  <span className="text-xs text-gray-500">8 {t('groups.members')}</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-green-50 rounded">
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 bg-green-500 rounded flex items-center justify-center">
                      <span className="text-xs font-bold text-white">B</span>
                    </div>
                    <span className="text-sm text-gray-900">Grup B - Humanitats</span>
                  </div>
                  <span className="text-xs text-gray-500">7 {t('groups.members')}</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-purple-50 rounded">
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 bg-purple-500 rounded flex items-center justify-center">
                      <span className="text-xs font-bold text-white">C</span>
                    </div>
                    <span className="text-sm text-gray-900">Grup C - Tecnologia</span>
                  </div>
                  <span className="text-xs text-gray-500">6 {t('groups.members')}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Annotations Card */}
          <div className="bg-white rounded-lg p-8 shadow-lg border border-gray-200">
            <div className="mb-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                {t('annotations.title')}
              </h3>
              <p className="text-gray-600 mb-6">
                {t('annotations.description')}
              </p>
            </div>

            {/* Mock Annotations Interface */}
            <div className="bg-gray-50 rounded-lg p-4 border">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-900">{t('annotations.recentAnnotations')}</span>
                <span className="text-xs text-gray-400">12 {t('annotations.count')}</span>
              </div>
              <div className="space-y-2">
                <div className="p-2 bg-yellow-50 border-l-2 border-yellow-400 rounded-r">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-yellow-800">{t('annotations.importantConcept')}</span>
                    <span className="text-xs text-gray-500">03:45</span>
                  </div>
                  <p className="text-xs text-gray-600">Explicació sobre la fotosíntesi...</p>
                </div>
                <div className="p-2 bg-blue-50 border-l-2 border-blue-400 rounded-r">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-blue-800">{t('annotations.examQuestion')}</span>
                    <span className="text-xs text-gray-500">07:22</span>
                  </div>
                  <p className="text-xs text-gray-600">Revisar aquest tema per l'examen...</p>
                </div>
                <div className="p-2 bg-green-50 border-l-2 border-green-400 rounded-r">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-green-800">{t('annotations.pendingTask')}</span>
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