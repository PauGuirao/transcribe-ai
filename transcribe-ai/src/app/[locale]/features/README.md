# Sistema de Páginas de Features Reutilizables

Este directorio contiene el sistema de páginas dinámicas para las características/funcionalidades de Transcriu.

## Estructura

```
features/
├── features.json          # Contenido de todas las features
├── page.tsx              # Página índice con listado de features
├── README.md             # Este archivo
└── [slug]/
    ├── page.tsx          # Página dinámica con metadata y SSG
    └── ClientFeature.tsx # Componente cliente reutilizable
```

## Características del Sistema

### ✅ **Reutilizable**
- Un solo componente (`ClientFeature.tsx`) para todas las páginas de features
- Todo el contenido se gestiona desde `features.json`

### ✅ **SEO Optimizado**
- Metadata dinámica por cada feature (title, description, keywords)
- Open Graph y Twitter Cards configurados
- URLs canónicas
- Static Site Generation (SSG) para máxima velocidad

### ✅ **Escalable**
- Añadir nuevas features es tan fácil como agregar una entrada en `features.json`
- No requiere crear nuevos componentes ni páginas

## Páginas Creadas

Actualmente hay **7 páginas de features** configuradas:

1. **[/features/transcripcion-automatica](transcripcion-automatica)** - Transcripción automática con IA
2. **[/features/diarizacion-interlocutores](diarizacion-interlocutores)** - Identificación de interlocutores
3. **[/features/anotaciones-inteligentes](anotaciones-inteligentes)** - Sistema de anotaciones
4. **[/features/biblioteca-transcripciones](biblioteca-transcripciones)** - Biblioteca organizada
5. **[/features/gestion-pacientes](gestion-pacientes)** - Gestión de pacientes
6. **[/features/grupos-colaborativos](grupos-colaborativos)** - Trabajo en equipo
7. **[/features/exportar-transcripciones](exportar-transcripciones)** - Exportación múltiple

## Cómo Añadir una Nueva Feature

### 1. Edita `features.json`

Añade una nueva entrada con la siguiente estructura:

```json
{
  "tu-nueva-feature": {
    "title": "Título SEO completo | Transcriu",
    "metaDescription": "Descripción para motores de búsqueda (150-160 caracteres)",
    "keywords": ["palabra1", "palabra2", "palabra3"],
    "heroTitle": "Título principal que se muestra en la página",
    "heroDescription": "Descripción principal visible en hero",
    "icon": "🎯",
    "h2Sections": [
      {
        "title": "Título de la sección",
        "content": "Contenido descriptivo de la sección",
        "points": [
          "Punto destacado 1",
          "Punto destacado 2"
        ],
        "useCases": [
          "Caso de uso 1",
          "Caso de uso 2"
        ]
      }
    ],
    "faqs": [
      {
        "question": "¿Pregunta frecuente?",
        "answer": "Respuesta detallada"
      }
    ],
    "testimonials": [
      {
        "name": "Nombre Apellido",
        "role": "Profesión",
        "text": "Testimonio del usuario"
      }
    ],
    "relatedFeatures": [
      "feature-relacionada-1",
      "feature-relacionada-2"
    ]
  }
}
```

### 2. ¡Listo!

La página estará automáticamente disponible en:
- **URL**: `/features/tu-nueva-feature`
- **Listado**: Aparecerá en `/features`

No necesitas crear ningún componente adicional.

## Estructura del JSON

### Campos Obligatorios
- `title`: Título SEO completo
- `metaDescription`: Descripción para SEO
- `heroTitle`: Título principal de la página
- `heroDescription`: Descripción principal

### Campos Opcionales
- `icon`: Emoji que representa la feature
- `keywords`: Array de palabras clave para SEO
- `h2Sections`: Array de secciones de contenido
- `faqs`: Array de preguntas frecuentes
- `testimonials`: Array de testimonios de usuarios
- `relatedFeatures`: Array de slugs de features relacionadas

### Estructura de `h2Sections`
Cada sección puede contener:
- `title`: Título de la sección (obligatorio)
- `content`: Párrafo descriptivo
- `points`: Array de puntos destacados (con checkmarks)
- `useCases`: Array de casos de uso (con iconos especiales)

## Componentes Utilizados

El sistema reutiliza componentes globales:
- `<Navbar />` - Navegación
- `<Hero />` - Sección hero (o versión custom con icono)
- `<HowItWorks />` - Cómo funciona
- `<Features />` - Grid de características generales
- `<Pricing />` - Sección de precios
- `<Footer />` - Pie de página

## Ventajas para SEO

1. **URLs semánticas**: `/features/nombre-descriptivo`
2. **Contenido único**: Cada página tiene contenido específico y detallado
3. **Rich snippets**: FAQs estructurados para Google
4. **Internal linking**: Enlaces entre features relacionadas
5. **Performance**: SSG para carga ultrarrápida
6. **Keywords longtail**: Cada página optimizada para términos específicos

## Mejoras Futuras Sugeridas

- [ ] Añadir schema.org para FAQs
- [ ] Implementar breadcrumbs
- [ ] Añadir tabla de contenidos para páginas largas
- [ ] Implementar vídeos demostrativos
- [ ] A/B testing de CTAs
- [ ] Analytics por feature

## Mantenimiento

Para actualizar el contenido de una feature existente:
1. Edita `features.json`
2. Los cambios se reflejarán en la próxima build
3. No requiere cambios en código

## Ejemplo de Uso

```typescript
// La página se genera automáticamente desde features.json
// No necesitas tocar el código para añadir contenido nuevo

// Ejemplo de URL generada:
// /features/transcripcion-automatica

// El componente ClientFeature se encarga de todo el rendering
```

## Notas Importantes

- Todos los textos están en catalán
- Los iconos son emojis (Unicode)
- Las imágenes de testimonios son opcionales
- Los enlaces a features relacionadas se generan automáticamente
- El sistema es totalmente type-safe con TypeScript
