'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import AppLayout from '@/components/layout/AppLayout';

export default function DashboardPage() {
  return (
    <AppLayout>
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              What will you do today?
            </h2>
            <p className="text-gray-600">
              Choose an option from the sidebar to get started.
            </p>
          </div>
        </CardContent>
      </Card>
    </AppLayout>
  );
}