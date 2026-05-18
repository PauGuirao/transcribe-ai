"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CheckCircle, Users, Sparkles, ArrowRight } from "lucide-react";

interface WelcomePopupProps {
  isOpen: boolean;
  onClose: () => void;
  organizationName: string;
  userName?: string;
}

export function WelcomePopup({ isOpen, onClose, organizationName, userName }: WelcomePopupProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <DialogTitle className="text-xl font-semibold">
            Benvingut/da a {organizationName}! 🎉
          </DialogTitle>
          <DialogDescription className="text-center text-base">
            {userName ? (
              <>Hola {userName}! T'has unit correctament a l'organització <strong>{organizationName}</strong>.</>
            ) : (
              <>T'has unit correctament a l'organització <strong>{organizationName}</strong>.</>
            )}
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex items-center justify-center space-x-2 py-4">
          <div className="flex items-center space-x-2 rounded-lg bg-blue-50 px-4 py-2">
            <Users className="h-5 w-5 text-blue-600" />
            <span className="text-sm font-medium text-blue-700">
              Ara formes part de l'equip
            </span>
          </div>
        </div>

        <div className="space-y-3 rounded-lg bg-gray-50 p-4">
          <div className="flex items-center space-x-3">
            <Sparkles className="h-5 w-5 text-yellow-500" />
            <span className="text-sm text-gray-700">
              Accés complet a totes les funcionalitats de l'organització
            </span>
          </div>
          <div className="flex items-center space-x-3">
            <Users className="h-5 w-5 text-blue-500" />
            <span className="text-sm text-gray-700">
              Col·laboració amb els membres de l'equip
            </span>
          </div>
          <div className="flex items-center space-x-3">
            <ArrowRight className="h-5 w-5 text-green-500" />
            <span className="text-sm text-gray-700">
              Comença a transcriure i gestionar els teus àudios
            </span>
          </div>
        </div>

        <DialogFooter className="sm:justify-center">
          <Button onClick={onClose} className="w-full sm:w-auto">
            Perfecte, anem-hi!
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}