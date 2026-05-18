"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Circle, Highlighter, Save, Download, Trash2, FileText, Pen, Type } from "lucide-react";

interface Annotation {
  id: string;
  type: "circle" | "highlight" | "pen";
  x: number;
  y: number;
  width?: number;
  height?: number;
  radiusX?: number; // Abans era 'radius'
  radiusY?: number; // Nou radi per a l'eix Y
  color: string;
  segmentId?: string;
  text?: string;
  path?: string; // SVG path for pen drawings
}
const availableColors = [
  { id: "red", value: "#ef4444" },
  { id: "amber", value: "#f59e0b" },
  { id: "blue", value: "#3b82f6" },
  { id: "green", value: "#22c55e" },
];
interface ToolsSidePanelProps {
  selectedTool: "circle" | "highlight" | "pen";
  onToolSelect: (tool: "circle" | "highlight" | "pen") => void;
  selectedColor: string; // Nou: per saber quin color està actiu
  onColorSelect: (color: string) => void; // Nou: per canviar de color
  annotations: Annotation[];
  onClearAnnotations: () => void;
  onSaveAnnotations: () => void;
  onExportAnnotations: () => void;
  onRemoveAnnotation: (id: string) => void;
  exportToPDF: () => void;
}
export function ToolsSidePanel({
  selectedTool,
  onToolSelect,
  selectedColor,
  onColorSelect,
  annotations,
  onClearAnnotations,
  onSaveAnnotations,
  onExportAnnotations,
  onRemoveAnnotation,
  exportToPDF,
}: ToolsSidePanelProps) {
  return (
    <div className="w-80 bg-gray-50 border-l border-gray-200 flex flex-col h-full">
      <div className="p-4 space-y-4">
        {/* Eines de Dibuix */}
        <div>
          <h3 className="text-sm font-medium text-gray-500 mb-2">Eines</h3>
          <div className="grid grid-cols-3 gap-2">
            <Button
              variant={selectedTool === "circle" ? "secondary" : "outline"}
              onClick={() => onToolSelect("circle")}
              className="flex items-center justify-center gap-2"
            >
              <Circle className="h-4 w-4" />
              <span>Oval</span>
            </Button>
            <Button
              variant={selectedTool === "highlight" ? "secondary" : "outline"}
              onClick={() => onToolSelect("highlight")}
              className="flex items-center justify-center gap-2"
            >
              <Highlighter className="h-4 w-4" />
              <span>Subratllat</span>
            </Button>
            <Button
              variant={selectedTool === "pen" ? "secondary" : "outline"}
              onClick={() => onToolSelect("pen")}
              className="flex items-center justify-center gap-2"
            >
              <Pen className="h-4 w-4" />
              <span>Llapis</span>
            </Button>
          </div>
        </div>

        {/* Paleta de Colors */}
        <div>
          <h3 className="text-sm font-medium text-gray-500 mb-2">Color</h3>
          <div className="grid grid-cols-4 gap-2">
            {availableColors.map((color) => (
              <Button
                key={color.id}
                variant="outline"
                size="icon"
                onClick={() => onColorSelect(color.value)}
                className={`h-9 w-9 ${
                  selectedColor === color.value
                    ? "ring-2 ring-primary ring-offset-2"
                    : ""
                }`}
                style={{ backgroundColor: color.value }}
              />
            ))}
          </div>
        </div>

        {/* Accions Generals */}
        <div>
          <h3 className="text-sm font-medium text-gray-500 mb-2">Accions</h3>
          <div className="space-y-2">
            <Button
              variant="outline"
              size="sm"
              onClick={exportToPDF}
              className="w-full justify-start gap-2"
            >
              <FileText className="h-4 w-4" /> Exportar PDF
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onClearAnnotations}
              className="w-full justify-start gap-2 text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" /> Netejar Tot
            </Button>
          </div>
        </div>
      </div>

      <Separator />

      {/* Llista d'Anotacions */}
      <div className="p-4 pt-2 flex-1 flex flex-col min-h-0">
        <h3 className="text-lg font-semibold mb-3">
          Anotacions ({annotations.length})
        </h3>
        <div className="flex-1 overflow-y-auto pr-2">
          {annotations.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <p className="text-sm">Encara no hi ha anotacions</p>
              <p className="text-xs mt-1">
                Comença a dibuixar sobre la transcripció
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {annotations.map((annotation, index) => (
                <div
                  key={annotation.id}
                  className="flex items-center justify-between p-3 bg-white rounded-lg border"
                >
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      {annotation.type === "circle" ? (
                        <Circle
                          className="h-4 w-4"
                          style={{ color: annotation.color }}
                        />
                      ) : annotation.type === "pen" ? (
                        <Pen
                          className="h-4 w-4"
                          style={{ color: annotation.color }}
                        />
                      ) : (
                        <Highlighter
                          className="h-4 w-4"
                          style={{ color: annotation.color }}
                        />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {annotation.type === "circle" ? "Oval" : annotation.type === "pen" ? "Llapis" : "Subratllat"} #
                        {index + 1}
                        {annotation.text && (
                          <span className="ml-2 text-xs font-normal text-gray-600">
                            &quot;{annotation.text}&quot;
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onRemoveAnnotation(annotation.id)}
                    className="flex-shrink-0 h-8 w-8 p-0 text-gray-500 hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
