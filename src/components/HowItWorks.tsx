'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from "@/components/ui/button";

type AnimationState = 'initial' | 'dragging' | 'dropped' | 'processing';
type TranscriptionState = 'initial' | 'processing' | 'transcribing' | 'complete';
type ExportState = 'initial' | 'clicking' | 'revealing' | 'complete';

export function HowItWorks() {
  const [animationState, setAnimationState] = useState<AnimationState>('initial');
  const [transcriptionState, setTranscriptionState] = useState<TranscriptionState>('initial');
  const [exportState, setExportState] = useState<ExportState>('initial');
  const [visibleLines, setVisibleLines] = useState(0);
  const [visibleExports, setVisibleExports] = useState(0);

  const transcriptionLines = [
    { speaker: 'Logopeda:', text: 'Avui treballarem la pronunciació de la lletra R', color: 'black' },
    { speaker: 'Pacient:', text: 'D\'acord! He estat practicant a casa.', color: 'black' },
    { speaker: 'Pacient:', text: 'D\'acord! He estat practicant a casa.', color: 'black' },
    { speaker: 'Logopeda:', text: 'Perfecte! Ara provarem amb aquestes paraules: "roda", "ratolí"', color: 'black' },
  ];

  const exportOptions = [
    { 
      name: 'Exportar com PDF', 
      icon: (
        <svg className="w-6 h-6 text-red-500" fill="currentColor" viewBox="0 0 24 24">
          <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
        </svg>
      ),
      color: 'red' 
    },
    { 
      name: 'Exportar com DOCX', 
      icon: (
        <svg className="w-6 h-6 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
          <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20M15.5,15C15.5,16.38 14.38,17.5 13,17.5H10.5V19H9V10H13A2.5,2.5 0 0,1 15.5,12.5V15M14,12.5C14,12.22 13.78,12 13.5,12H10.5V16H13.5C13.78,16 14,15.78 14,15.5V12.5Z" />
        </svg>
      ),
      color: 'blue' 
    },
    { 
      name: 'Enviar per Gmail', 
      icon: (
        <svg className="w-6 h-6 text-red-600" fill="currentColor" viewBox="0 0 24 24">
          <path d="M20,18H18V9.25L12,13L6,9.25V18H4V6H5.2L12,10.25L18.8,6H20M20,4H4C2.89,4 2,4.89 2,6V18A2,2 0 0,0 4,20H20A2,2 0 0,0 22,18V6C22,4.89 21.1,4 20,4Z" />
        </svg>
      ),
      color: 'red' 
    },
    { 
      name: 'Guardar a Drive', 
      icon: (
        <svg className="w-6 h-6 text-green-500" fill="currentColor" viewBox="0 0 24 24">
          <path d="M7.71,3.5L1.15,15L4.58,21L11.13,9.5M9.73,15L6.3,21H19.42L22.85,15M22.28,14L15.42,2H8.58L8.57,2L15.43,13.5" />
        </svg>
      ),
      color: 'green' 
    }
  ];

  useEffect(() => {
    const sequence = async () => {
      // Initial state
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Start dragging
      setAnimationState('dragging');
      await new Promise(resolve => setTimeout(resolve, 2500));
      
      // Drop the file
      setAnimationState('dropped');
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Start processing
      setAnimationState('processing');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Reset and loop
      setAnimationState('initial');
    };

    sequence();
    const interval = setInterval(sequence, 8000);
    
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const transcriptionSequence = async () => {
      // Start processing immediately
      setTranscriptionState('processing');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Start transcribing
      setTranscriptionState('transcribing');
      
      // Reveal lines one by one
      for (let i = 0; i <= transcriptionLines.length; i++) {
        setVisibleLines(i);
        await new Promise(resolve => setTimeout(resolve, 400));
      }
      
      setTranscriptionState('complete');
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Reset and loop
      setTranscriptionState('initial');
      setVisibleLines(0);
    };

    transcriptionSequence();
    const interval = setInterval(transcriptionSequence, 6000);
    
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const exportSequence = async () => {
      // Wait a bit before starting
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Start clicking animation
      setExportState('clicking');
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Start revealing exports
      setExportState('revealing');
      
      // Reveal export options one by one
      for (let i = 0; i <= exportOptions.length; i++) {
        setVisibleExports(i);
        await new Promise(resolve => setTimeout(resolve, 600));
      }
      
      setExportState('complete');
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Reset and loop
      setExportState('initial');
      setVisibleExports(0);
    };

    exportSequence();
    const interval = setInterval(exportSequence, 12000);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="py-16">
      <div className="max-w-7xl mx-auto md:px-6">
        {/* Header Section */}
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Transcriu sessions en 3 passos senzills
          </h2>
          <p className="text-lg text-gray-600 mb-8 max-w-3xl mx-auto">
            Procés ràpid i eficient per convertir les teves sessions d'àudio en transcripcions professionals llestes per compartir
          </p>
          <Button size="lg" className="bg-gray-900 hover:bg-gray-800 text-white">
            Comença ara →
          </Button>
        </div>

        {/* Steps Grid */}
        <div className="grid md:grid-cols-3 gap-8">
          {/* Step 1 - Upload Audio with Animation */}
          <div className="bg-white rounded-xl p-8 shadow-lg border border-gray-200">
            <div className="mb-6">
              <span className="text-2xl font-bold text-gray-400">01</span>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              Puja l'àudio
            </h3>
            <p className="text-gray-600 mb-6">
              Carrega els fitxers d'àudio de les teves sessions de logopèdia des de qualsevol dispositiu de forma ràpida i segura.
            </p>
            
            <div className="bg-gray-50 rounded-lg p-6 relative overflow-hidden h-[280px]">
              {/* Drop Zone */}
              <motion.div
                className={`absolute inset-0 border-2 border-dashed rounded-lg flex items-center justify-center transition-colors ${
                  animationState === 'dropped' || animationState === 'processing'
                    ? 'border-blue-400 bg-blue-50' 
                    : 'border-gray-300 bg-gray-50'
                }`}
                animate={{
                  scale: animationState === 'dropped' ? [1, 1.02, 1] : 1
                }}
                transition={{ duration: 0.3 }}
              >
                {(animationState === 'initial' || animationState === 'dragging') && (
                  <div className="text-center text-gray-500">
                    <div className="text-2xl mb-2">🎵</div>
                    <p className="text-sm">Arrossega el teu fitxer d'àudio aquí</p>
                  </div>
                )}
                
                {/* Processing State */}
                {animationState === 'processing' && (
                  <div className="text-center">
                    <motion.div
                      className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    />
                    <p className="text-sm text-blue-600">Processant àudio...</p>
                  </div>
                )}
              </motion.div>

              {/* Animated Cursor and File */}
              <AnimatePresence>
                {(animationState === 'dragging' || animationState === 'dropped') && (
                  <motion.div
                    className="absolute pointer-events-none z-10"
                    initial={{ x: -80, y: -40 }}
                    animate={{ 
                      x: animationState === 'dragging' ? 60 : 60,
                      y: animationState === 'dragging' ? 60 : 60,
                      opacity: animationState === 'dropped' ? 0 : 1
                    }}
                    exit={{ opacity: 0 }}
                    transition={{ 
                      duration: animationState === 'dragging' ? 2.5 : 0.3, 
                      ease: "easeInOut" 
                    }}
                  >
                    {/* Audio File Icon */}
                    <motion.div
                      className="bg-white border-2 border-gray-300 rounded-lg p-2 shadow-lg"
                      animate={{ rotate: [0, -2, 2, 0] }}
                      transition={{ duration: 0.6, repeat: Infinity }}
                    >
                      <div className="flex items-center space-x-2">
                        <div className="text-blue-500 text-sm">🎵</div>
                        <span className="text-xs font-medium">sessio.mp3</span>
                      </div>
                    </motion.div>
                    
                    {/* Cursor */}
                    <div className="absolute -top-2 left-2">
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 1800 1800"
                        xmlns="http://www.w3.org/2000/svg"
                        className="drop-shadow-sm"
                      >
                        <path
                          d="M3.589,44.981l722.935,1734.396c4.938,11.834,16.494,19.473,29.212,19.473c0.534,0,1.064-0.017,1.603-0.044
                          c13.345-0.671,24.826-9.645,28.703-22.431l230.227-760.125l760.101-230.213c12.784-3.871,21.767-15.354,22.437-28.699
                          c0.672-13.342-7.101-25.669-19.434-30.809L44.989,3.585C33.14-1.343,19.496,1.349,10.425,10.421
                          C1.355,19.491-1.342,33.14,3.589,44.981z"
                          fill="#000"
                          stroke="none"
                          fillRule="nonzero"
                        />
                      </svg>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Step 2 - Transcribe */}
          <div className="bg-white rounded-xl p-8 shadow-lg border border-gray-200">
            <div className="mb-6">
              <span className="text-2xl font-bold text-gray-400">02</span>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              Transcriu automàticament
            </h3>
            <p className="text-gray-600 mb-6">
              La nostra IA especialitzada en català converteix l'àudio en text amb alta precisió.
            </p>
            
            <div className="bg-gray-50 rounded-lg p-6 relative overflow-hidden h-[280px]">
              <AnimatePresence>
                {transcriptionState === 'processing' && (
                  <motion.div 
                    className="absolute inset-0 flex items-center justify-center"
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5 }}
                  >
                    <div className="text-center">
                      <motion.div
                        className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      />
                      <p className="text-sm text-blue-600">Transcrivint àudio...</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Transcription Results */}
              <AnimatePresence>
                {(transcriptionState === 'transcribing' || transcriptionState === 'complete') && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-3 text-sm h-full overflow-hidden"
                  >
                    {transcriptionLines.slice(0, visibleLines).map((line, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.2 }}
                        className="space-y-1"
                      >
                        <div className={`${
                          line.color === 'blue' ? 'text-black-600' : 'text-black-600'
                        } text-xs font-bold block`}>
                          {line.speaker}
                        </div>
                        <div>
                          <p className="text-gray-700 text-xs leading-relaxed">{line.text}</p>
                        </div>
                      </motion.div>
                    ))}

                    {visibleLines >= transcriptionLines.length && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 }}
                        className="border-t pt-2 mt-3"
                      >
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>Durada: 5:12</span>
                          <span>Precisió: 98.5%</span>
                        </div>
                      </motion.div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Step 3 - Export */}
           <div className="bg-white rounded-xl p-8 shadow-lg border border-gray-200">
             <div className="mb-6">
               <span className="text-2xl font-bold text-gray-400">03</span>
             </div>
             <h3 className="text-xl font-semibold text-gray-900 mb-4">
               Exporta i comparteix
             </h3>
             <p className="text-gray-600 mb-6">
               Descarrega la transcripció en múltiples formats o comparteix-la directament amb els teus col·legues.
             </p>
             
             <div className="bg-gray-50 rounded-lg p-6 relative overflow-hidden h-[280px]">
               <AnimatePresence>
                 {(exportState === 'initial' || exportState === 'clicking') && (
                   <motion.div 
                     className="absolute inset-0 flex items-center justify-center"
                     exit={{ opacity: 0, scale: 0.9 }}
                     transition={{ duration: 0.3 }}
                   >
                     {exportState === 'initial' && (
                       <motion.div 
                         className="text-center text-gray-500"
                         initial={{ opacity: 0, y: 10 }}
                         animate={{ opacity: 1, y: 0 }}
                         transition={{ duration: 0.5 }}
                       >
                         <motion.button 
                           className="bg-blue-600 text-white px-6 py-3 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-lg"
                           whileHover={{ scale: 1.05, boxShadow: "0 10px 25px rgba(59, 130, 246, 0.3)" }}
                           whileTap={{ scale: 0.95 }}
                         >
                           Exportar transcripció
                         </motion.button>
                       </motion.div>
                     )}
                     
                     {exportState === 'clicking' && (
                       <div className="text-center relative">
                         <motion.button 
                           className="bg-blue-600 text-white px-6 py-3 rounded-lg text-sm font-medium relative shadow-lg"
                           animate={{ 
                             scale: [1, 0.95, 1.02, 1],
                             boxShadow: [
                               "0 4px 15px rgba(59, 130, 246, 0.3)",
                               "0 2px 10px rgba(59, 130, 246, 0.5)",
                               "0 6px 20px rgba(59, 130, 246, 0.4)",
                               "0 4px 15px rgba(59, 130, 246, 0.3)"
                             ]
                           }}
                           transition={{ duration: 0.6, times: [0, 0.3, 0.7, 1] }}
                         >
                           Exportar transcripció
                         </motion.button>
                         
                         {/* Animated Cursor */}
                         <motion.div
                           className="absolute pointer-events-none z-10"
                           initial={{ x: 30, y: 30, opacity: 0 }}
                           animate={{ 
                             x: [30, 20, 20], 
                             y: [30, -10, -10], 
                             opacity: [0, 1, 1] 
                           }}
                           transition={{ 
                             duration: 0.8, 
                             times: [0, 0.5, 1],
                             ease: "easeOut"
                           }}
                         >
                           <motion.svg
                             width="20"
                             height="20"
                             viewBox="0 0 1800 1800"
                             xmlns="http://www.w3.org/2000/svg"
                             className="drop-shadow-lg"
                             animate={{ scale: [1, 0.8, 1] }}
                             transition={{ duration: 0.2, delay: 0.6 }}
                           >
                             <path
                               d="M3.589,44.981l722.935,1734.396c4.938,11.834,16.494,19.473,29.212,19.473c0.534,0,1.064-0.017,1.603-0.044
                               c13.345-0.671,24.826-9.645,28.703-22.431l230.227-760.125l760.101-230.213c12.784-3.871,21.767-15.354,22.437-28.699
                               c0.672-13.342-7.101-25.669-19.434-30.809L44.989,3.585C33.14-1.343,19.496,1.349,10.425,10.421
                               C1.355,19.491-1.342,33.14,3.589,44.981z"
                               fill="#1f2937"
                               stroke="white"
                               strokeWidth="20"
                               fillRule="nonzero"
                             />
                           </motion.svg>
                         </motion.div>
                       </div>
                     )}
                   </motion.div>
                 )}
               </AnimatePresence>

               {/* Export Options */}
               <AnimatePresence>
                 {(exportState === 'revealing' || exportState === 'complete') && (
                   <motion.div
                     initial={{ opacity: 0 }}
                     animate={{ opacity: 1 }}
                     transition={{ duration: 0.5 }}
                     className="h-full"
                   >
                     
                     <div className="grid grid-cols-2 gap-3">
                       {exportOptions.slice(0, visibleExports).map((option, index) => (
                         <motion.div
                           key={index}
                           initial={{ opacity: 0, scale: 0.8, y: 20 }}
                           animate={{ opacity: 1, scale: 1, y: 0 }}
                           transition={{ 
                             delay: index * 0.15,
                             duration: 0.4,
                             type: "spring",
                             stiffness: 200,
                             damping: 20
                           }}
                           whileHover={{ 
                             scale: 1.05, 
                             boxShadow: "0 8px 25px rgba(0,0,0,0.1)",
                             transition: { duration: 0.2 }
                           }}
                           whileTap={{ scale: 0.95 }}
                           className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 cursor-pointer hover:border-blue-300 transition-colors"
                         >
                           <div className="text-center">
                             <motion.div 
                               className="flex justify-center mb-2"
                               animate={{ rotate: [0, 10, -10, 0] }}
                               transition={{ 
                                 duration: 0.5, 
                                 delay: index * 0.15 + 0.3,
                                 ease: "easeInOut"
                               }}
                             >
                               {option.icon}
                             </motion.div>
                             <p className="text-xs font-medium text-gray-700">
                               {option.name}
                             </p>
                           </div>
                         </motion.div>
                       ))}
                     </div>

                     {visibleExports >= exportOptions.length && (
                       <motion.div
                         initial={{ opacity: 0, y: 20 }}
                         animate={{ opacity: 1, y: 0 }}
                         transition={{ delay: 0.8, duration: 0.4 }}
                         className="mt-4 pt-4 border-t border-gray-200"
                       >
                         <motion.p 
                           className="text-xs text-gray-500 text-center"
                           initial={{ opacity: 0 }}
                           animate={{ opacity: 1 }}
                           transition={{ delay: 1 }}
                         >
                           Fes clic en qualsevol opció per exportar
                         </motion.p>
                       </motion.div>
                     )}
                   </motion.div>
                 )}
               </AnimatePresence>
             </div>
           </div>
        </div>
      </div>
    </section>
  );
}