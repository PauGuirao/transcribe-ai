'use client';

import { Quote } from "lucide-react";
import { useTranslations } from 'next-intl';

interface Testimonial {
    name: string;
    role: string;
    text: string;
    image?: string;
}

interface TestimonialsProps {
    testimonials?: Testimonial[];
}

export function Testimonials({ testimonials }: TestimonialsProps) {
    const t = useTranslations('testimonials');

    // Use translations if no custom testimonials provided
    const items = testimonials || (t.raw('items') as Testimonial[]);

    return (
        <section className="my-20">
            <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                    {t('title')}
                </h2>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                    {t('subtitle')}
                </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {items.map((testimonial, idx) => (
                    <div
                        key={idx}
                        className="bg-white rounded-xl p-6 shadow-md border border-gray-200 hover:shadow-lg transition-shadow duration-300 flex flex-col"
                    >
                        {/* Quote Icon */}
                        <div className="mb-4">
                            <Quote className="h-8 w-8 text-blue-500 opacity-50" />
                        </div>

                        {/* Testimonial Text */}
                        <p className="text-gray-700 leading-relaxed mb-6 flex-grow italic">
                            "{testimonial.text}"
                        </p>

                        {/* Author Info */}
                        <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
                            {/* Avatar */}
                            <div className="flex-shrink-0">
                                {testimonial.image ? (
                                    <img
                                        src={testimonial.image}
                                        alt={testimonial.name}
                                        className="h-12 w-12 rounded-full object-cover"
                                    />
                                ) : (
                                    <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold text-lg">
                                        {testimonial.name.charAt(0)}
                                    </div>
                                )}
                            </div>

                            {/* Name and Role */}
                            <div className="flex-grow min-w-0">
                                <p className="font-semibold text-gray-900 truncate">
                                    {testimonial.name}
                                </p>
                                <p className="text-sm text-gray-600 truncate">
                                    {testimonial.role}
                                </p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Optional: Trust Badge */}
            <div className="mt-12 text-center">
                <p className="text-sm text-gray-500">
                    {t('trustBadge')}
                </p>
            </div>
        </section>
    );
}
