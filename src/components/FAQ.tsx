'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronDown, ChevronUp } from 'lucide-react';

export function FAQ() {
    const t = useTranslations('faq');
    const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

    const questions = t.raw('questions') as Array<{ question: string; answer: string }>;

    return (
        <section className="py-20 bg-gray-50">
            <div className="max-w-4xl mx-auto px-6">
                {/* Header */}
                <div className="text-center mb-12">
                    <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                        {t('title')}
                    </h2>
                    <p className="text-xl text-gray-600">
                        {t('subtitle')}
                    </p>
                </div>

                {/* FAQ Items */}
                <div className="space-y-4">
                    {questions.map((faq, index) => (
                        <div
                            key={index}
                            className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow"
                        >
                            <button
                                onClick={() => setExpandedIndex(expandedIndex === index ? null : index)}
                                className="w-full px-6 py-5 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
                            >
                                <span className="font-semibold text-gray-900 pr-4 text-base md:text-lg">
                                    {faq.question}
                                </span>
                                <div
                                    className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors ${expandedIndex === index ? 'bg-blue-100' : 'bg-gray-100'
                                        }`}
                                >
                                    {expandedIndex === index ? (
                                        <ChevronUp className="h-5 w-5 text-blue-600" />
                                    ) : (
                                        <ChevronDown className="h-5 w-5 text-gray-600" />
                                    )}
                                </div>
                            </button>
                            {expandedIndex === index && (
                                <div className="px-6 pb-5 text-gray-700 leading-relaxed bg-gray-50 border-t border-gray-100">
                                    <p className="pt-4">{faq.answer}</p>
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {/* CTA at the bottom */}
                <div className="mt-12 text-center">
                    <p className="text-gray-600 mb-4">
                        No trobes la resposta que busques?
                    </p>
                    <button
                        onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })}
                        className="text-blue-600 hover:text-blue-700 font-semibold hover:underline"
                    >
                        Contacta amb nosaltres →
                    </button>
                </div>
            </div>
        </section>
    );
}
