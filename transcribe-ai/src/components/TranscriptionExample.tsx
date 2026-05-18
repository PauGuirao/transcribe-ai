'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslations } from 'next-intl'

type AnimationState = 'initial' | 'dragging' | 'dropped' | 'processing' | 'transcribing' | 'complete'

interface TranscriptionLine {
  speaker: string;
  text: string;
}

export function TranscriptionExample() {
  const t = useTranslations('transcriptionExample');
  const [animationState, setAnimationState] = useState<AnimationState>('initial')
  const [visibleLines, setVisibleLines] = useState(0)

  const transcriptionLines = t.raw('lines') as TranscriptionLine[];

  useEffect(() => {
    const sequence = async () => {
      // Initial state
      await new Promise(resolve => setTimeout(resolve, 100))

      // Start dragging
      setAnimationState('dragging')
      await new Promise(resolve => setTimeout(resolve, 2500))

      // Drop the file
      setAnimationState('dropped')
      await new Promise(resolve => setTimeout(resolve, 300))

      // Start processing
      setAnimationState('processing')
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Start transcribing
      setAnimationState('transcribing')

      // Reveal lines one by one
      for (let i = 0; i <= transcriptionLines.length; i++) {
        setVisibleLines(i)
        await new Promise(resolve => setTimeout(resolve, 300))
      }

      setAnimationState('complete')
      await new Promise(resolve => setTimeout(resolve, 5000))

      // Reset and loop
      setAnimationState('initial')
      setVisibleLines(0)
    }

    sequence()
    const interval = setInterval(sequence, 12000)

    return () => clearInterval(interval)
  }, [transcriptionLines.length])

  return (
    <div className="w-full">
      <div className="bg-white border-2 border-gray-200 rounded-xl p-6 relative overflow-hidden h-[430px]">
        {/* Animation Container */}
        <AnimatePresence>
          {(animationState !== 'transcribing' && animationState !== 'complete') && (
            <motion.div
              className="relative h-[380px]"
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              transition={{ duration: 0.5 }}
            >
              {/* Drop Zone */}
              <motion.div
                className={`absolute inset-0 border-2 border-dashed rounded-lg flex items-center justify-center transition-colors ${animationState === 'dropped' || animationState === 'processing'
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
                    <p className="text-md">{t('dropzone')}</p>
                  </div>
                )}

                {/* Processing State */}
                {animationState === 'processing' && (
                  <div className="text-center">
                    <motion.div
                      className="w-10 h-10 border-3 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    />
                    <p className="text-md text-blue-600">{t('processing')}</p>
                  </div>
                )}
              </motion.div>

              {/* Fake Cursor */}
              <AnimatePresence>
                {(animationState === 'dragging' || animationState === 'dropped') && (
                  <motion.div
                    className="absolute pointer-events-none z-10"
                    initial={{ x: -100, y: -50 }}
                    animate={{
                      x: animationState === 'dragging' ? 150 : 150,
                      y: animationState === 'dragging' ? 100 : 100,
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
                        <div className="text-blue-500">🎵</div>
                        <span className="text-md font-medium">{t('filename')}</span>
                      </div>
                    </motion.div>

                    {/* Cursor positioned on top of the audio file */}
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
            </motion.div>
          )}
        </AnimatePresence>

        {/* Transcription Results */}
        <AnimatePresence>
          {(animationState === 'transcribing' || animationState === 'complete') && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4 text-sm"
            >
              {transcriptionLines.slice(0, visibleLines).map((line, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.2 }}
                  className="flex items-start space-x-3"
                >
                  <div className={`${line.speaker === t('speaker1') ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                    } px-2 py-1 rounded text-xs font-medium`}>
                    {line.speaker}
                  </div>
                  <div className="flex-1">
                    <p className="text-gray-700">{line.text}</p>
                  </div>
                </motion.div>
              ))}

              {visibleLines >= transcriptionLines.length && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="border-t pt-4 mt-6"
                >
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>{t('duration')}: 15:32</span>
                    <span>{t('words')}: 1,247</span>
                    <span>{t('accuracy')}: 98.5%</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">
                    {t('footer')}
                  </p>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}