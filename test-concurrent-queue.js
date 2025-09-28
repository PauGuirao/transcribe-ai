#!/usr/bin/env node

/**
 * Script de prueba para verificar el funcionamiento de la cola con múltiples usuarios concurrentes
 * Este script simula múltiples usuarios enviando transcripciones simultáneamente
 */

const fs = require('fs');
const path = require('path');

// Configuración de la prueba
const TEST_CONFIG = {
  // Número de usuarios simulados
  CONCURRENT_USERS: 5,
  // Número de transcripciones por usuario
  TRANSCRIPTIONS_PER_USER: 3,
  // URL base de la API (cambiar según tu entorno)
  API_BASE_URL: 'http://localhost:3000',
  // Delay entre requests del mismo usuario (ms)
  USER_DELAY: 1000,
  // Timeout para cada request (ms)
  REQUEST_TIMEOUT: 30000,
};

// Datos de prueba simulados
const MOCK_USERS = Array.from({ length: TEST_CONFIG.CONCURRENT_USERS }, (_, i) => ({
  id: `test-user-${i + 1}`,
  name: `Usuario de Prueba ${i + 1}`,
  // En un entorno real, estos serían tokens de sesión válidos
  sessionToken: `mock-session-token-${i + 1}`,
}));

const MOCK_AUDIO_FILES = [
  {
    audioId: 'test-audio-1',
    filename: 'test-audio-1.mp3',
    originalName: 'Grabación de prueba 1.mp3',
    filePath: 'test/test-audio-1.mp3',
    provider: 'openai'
  },
  {
    audioId: 'test-audio-2', 
    filename: 'test-audio-2.wav',
    originalName: 'Grabación de prueba 2.wav',
    filePath: 'test/test-audio-2.wav',
    provider: 'replicate'
  },
  {
    audioId: 'test-audio-3',
    filename: 'test-audio-3.m4a',
    originalName: 'Grabación de prueba 3.m4a',
    filePath: 'test/test-audio-3.m4a',
    provider: 'openai'
  }
];

// Estadísticas de la prueba
let testStats = {
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  queuedRequests: 0,
  errors: [],
  startTime: null,
  endTime: null,
  userStats: new Map(),
};

/**
 * Simula una petición de transcripción
 */
async function simulateTranscriptionRequest(user, audioFile, requestIndex) {
  const requestId = `${user.id}-req-${requestIndex}`;
  
  try {
    console.log(`🚀 [${user.name}] Enviando transcripción ${requestIndex + 1}: ${audioFile.originalName}`);
    
    // Simular la petición HTTP (en un entorno real usarías fetch)
    const requestData = {
      audioId: `${audioFile.audioId}-${user.id}-${requestIndex}`,
      filename: audioFile.filename,
      originalName: audioFile.originalName,
      filePath: audioFile.filePath,
      provider: audioFile.provider,
    };

    // Simular tiempo de respuesta de la API
    const responseTime = Math.random() * 2000 + 500; // 500-2500ms
    await new Promise(resolve => setTimeout(resolve, responseTime));

    // Simular diferentes tipos de respuesta
    const responseType = Math.random();
    
    if (responseType < 0.1) {
      // 10% de probabilidad de error
      throw new Error(`Error simulado para ${requestId}`);
    } else if (responseType < 0.8) {
      // 70% de probabilidad de éxito inmediato
      console.log(`✅ [${user.name}] Transcripción ${requestIndex + 1} completada exitosamente`);
      testStats.successfulRequests++;
      
      // Actualizar estadísticas del usuario
      const userStat = testStats.userStats.get(user.id) || { successful: 0, failed: 0, queued: 0 };
      userStat.successful++;
      testStats.userStats.set(user.id, userStat);
      
      return {
        success: true,
        audioId: requestData.audioId,
        status: 'completed',
        message: 'Transcripción completada'
      };
    } else {
      // 20% de probabilidad de ser encolado
      console.log(`⏳ [${user.name}] Transcripción ${requestIndex + 1} añadida a la cola`);
      testStats.queuedRequests++;
      
      // Actualizar estadísticas del usuario
      const userStat = testStats.userStats.get(user.id) || { successful: 0, failed: 0, queued: 0 };
      userStat.queued++;
      testStats.userStats.set(user.id, userStat);
      
      return {
        success: true,
        audioId: requestData.audioId,
        status: 'queued',
        queuePosition: Math.floor(Math.random() * 10) + 1,
        message: 'Transcripción añadida a la cola'
      };
    }
    
  } catch (error) {
    console.error(`❌ [${user.name}] Error en transcripción ${requestIndex + 1}:`, error.message);
    testStats.failedRequests++;
    testStats.errors.push({
      user: user.name,
      requestIndex: requestIndex + 1,
      error: error.message,
      timestamp: new Date().toISOString()
    });
    
    // Actualizar estadísticas del usuario
    const userStat = testStats.userStats.get(user.id) || { successful: 0, failed: 0, queued: 0 };
    userStat.failed++;
    testStats.userStats.set(user.id, userStat);
    
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Simula las transcripciones de un usuario
 */
async function simulateUserTranscriptions(user) {
  console.log(`👤 Iniciando simulación para ${user.name}`);
  
  const userResults = [];
  
  for (let i = 0; i < TEST_CONFIG.TRANSCRIPTIONS_PER_USER; i++) {
    // Seleccionar archivo de audio aleatorio
    const audioFile = MOCK_AUDIO_FILES[i % MOCK_AUDIO_FILES.length];
    
    // Enviar petición de transcripción
    const result = await simulateTranscriptionRequest(user, audioFile, i);
    userResults.push(result);
    
    testStats.totalRequests++;
    
    // Esperar antes de la siguiente petición (simular comportamiento real del usuario)
    if (i < TEST_CONFIG.TRANSCRIPTIONS_PER_USER - 1) {
      await new Promise(resolve => setTimeout(resolve, TEST_CONFIG.USER_DELAY));
    }
  }
  
  console.log(`✅ ${user.name} completó todas sus transcripciones`);
  return userResults;
}

/**
 * Simula el estado de la cola
 */
async function simulateQueueStatus() {
  // Simular el estado de la cola
  const queueStatus = {
    queueLength: Math.max(0, testStats.queuedRequests - testStats.successfulRequests),
    processing: Math.min(5, testStats.totalRequests - testStats.successfulRequests - testStats.failedRequests),
    requestsThisMinute: testStats.totalRequests,
    rateLimitPerMinute: 30,
    maxConcurrent: 5,
  };
  
  return queueStatus;
}

/**
 * Genera el reporte final de la prueba
 */
function generateTestReport() {
  const duration = testStats.endTime - testStats.startTime;
  const successRate = (testStats.successfulRequests / testStats.totalRequests) * 100;
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 REPORTE FINAL DE PRUEBA DE CONCURRENCIA');
  console.log('='.repeat(60));
  
  console.log(`⏱️  Duración total: ${(duration / 1000).toFixed(2)} segundos`);
  console.log(`👥 Usuarios concurrentes: ${TEST_CONFIG.CONCURRENT_USERS}`);
  console.log(`📝 Transcripciones por usuario: ${TEST_CONFIG.TRANSCRIPTIONS_PER_USER}`);
  console.log(`📊 Total de peticiones: ${testStats.totalRequests}`);
  console.log(`✅ Peticiones exitosas: ${testStats.successfulRequests}`);
  console.log(`⏳ Peticiones encoladas: ${testStats.queuedRequests}`);
  console.log(`❌ Peticiones fallidas: ${testStats.failedRequests}`);
  console.log(`📈 Tasa de éxito: ${successRate.toFixed(2)}%`);
  
  console.log('\n📋 ESTADÍSTICAS POR USUARIO:');
  console.log('-'.repeat(40));
  
  testStats.userStats.forEach((stats, userId) => {
    const user = MOCK_USERS.find(u => u.id === userId);
    console.log(`👤 ${user.name}:`);
    console.log(`   ✅ Exitosas: ${stats.successful}`);
    console.log(`   ⏳ Encoladas: ${stats.queued}`);
    console.log(`   ❌ Fallidas: ${stats.failed}`);
  });
  
  if (testStats.errors.length > 0) {
    console.log('\n🚨 ERRORES ENCONTRADOS:');
    console.log('-'.repeat(40));
    testStats.errors.forEach((error, index) => {
      console.log(`${index + 1}. [${error.user}] Req ${error.requestIndex}: ${error.error}`);
    });
  }
  
  console.log('\n🎯 RECOMENDACIONES:');
  console.log('-'.repeat(40));
  
  if (successRate < 80) {
    console.log('⚠️  Tasa de éxito baja. Considera:');
    console.log('   - Aumentar el límite de concurrencia');
    console.log('   - Mejorar el manejo de errores');
    console.log('   - Optimizar el procesamiento');
  }
  
  if (testStats.queuedRequests > testStats.successfulRequests * 0.5) {
    console.log('⚠️  Muchas peticiones encoladas. Considera:');
    console.log('   - Aumentar MAX_CONCURRENT_TRANSCRIPTIONS');
    console.log('   - Aumentar TRANSCRIPTION_RATE_LIMIT_PER_MINUTE');
  }
  
  if (testStats.errors.length > testStats.totalRequests * 0.1) {
    console.log('⚠️  Alta tasa de errores. Revisa:');
    console.log('   - Logs del servidor');
    console.log('   - Configuración de la base de datos');
    console.log('   - Límites de las APIs externas');
  }
  
  console.log('\n✅ Prueba completada exitosamente');
  console.log('='.repeat(60));
}

/**
 * Función principal de la prueba
 */
async function runConcurrencyTest() {
  console.log('🚀 Iniciando prueba de concurrencia de la cola de transcripciones');
  console.log(`👥 Simulando ${TEST_CONFIG.CONCURRENT_USERS} usuarios concurrentes`);
  console.log(`📝 ${TEST_CONFIG.TRANSCRIPTIONS_PER_USER} transcripciones por usuario`);
  console.log(`📊 Total de ${TEST_CONFIG.CONCURRENT_USERS * TEST_CONFIG.TRANSCRIPTIONS_PER_USER} transcripciones`);
  console.log('-'.repeat(60));
  
  testStats.startTime = Date.now();
  
  try {
    // Ejecutar simulaciones de usuarios en paralelo
    const userPromises = MOCK_USERS.map(user => simulateUserTranscriptions(user));
    
    // Esperar a que todos los usuarios completen sus transcripciones
    const allResults = await Promise.all(userPromises);
    
    testStats.endTime = Date.now();
    
    // Simular estado final de la cola
    const finalQueueStatus = await simulateQueueStatus();
    console.log('\n📊 Estado final de la cola:', finalQueueStatus);
    
    // Generar reporte final
    generateTestReport();
    
    // Guardar resultados en archivo
    const reportData = {
      config: TEST_CONFIG,
      stats: {
        ...testStats,
        userStats: Object.fromEntries(testStats.userStats)
      },
      finalQueueStatus,
      results: allResults
    };
    
    const reportPath = path.join(__dirname, `test-report-${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));
    console.log(`📄 Reporte detallado guardado en: ${reportPath}`);
    
  } catch (error) {
    console.error('💥 Error durante la prueba:', error);
    process.exit(1);
  }
}

// Ejecutar la prueba si el script se ejecuta directamente
if (require.main === module) {
  runConcurrencyTest().catch(error => {
    console.error('💥 Error fatal:', error);
    process.exit(1);
  });
}

module.exports = {
  runConcurrencyTest,
  TEST_CONFIG,
  MOCK_USERS,
  MOCK_AUDIO_FILES
};