'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { User, Settings, Mic } from 'lucide-react';

export default function Navbar() {
  return (
    <div className="fixed top-0 left-0 right-0 w-full bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center z-50">
      <div className="flex items-center space-x-3">
        <Mic className="h-6 w-6 text-blue-600" />
        <h1 className="text-xl font-semibold text-gray-900">TranscribeAI</h1>
      </div>
      <div className="flex items-center space-x-2">
        <Button variant="ghost" size="sm">
          <User className="h-4 w-4" />
          Profile
        </Button>
        <Button variant="ghost" size="sm">
          <Settings className="h-4 w-4" />
          Settings
        </Button>
      </div>
    </div>
  );
}