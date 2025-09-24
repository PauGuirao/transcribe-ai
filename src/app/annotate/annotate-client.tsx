"use client";

import React, { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import AppLayout from "@/components/layout/AppLayout";

import { Input } from "@/components/ui/input";
import { ToolsSidePanel } from "@/components/annotation/ToolsSidePanel";
import { AudioUploadResult } from "@/components/audio-upload/AudioUpload";
import type { Transcription, TranscriptionSegment, Speaker } from "@/types";

import html2canvas from "html2canvas-pro";
import jsPDF from "jspdf";


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
export default function AnnotateClient() {
  const searchParams = useSearchParams();
  const [selectedAudioId, setSelectedAudioId] = useState<string | undefined>();
  const [transcription, setTranscription] = useState<Transcription | null>(
    null
  );
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [selectedColor, setSelectedColor] = useState<string>("#ef4444");
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [selectedTool, setSelectedTool] = useState<"circle" | "highlight" | "pen">("circle");
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [currentPos, setCurrentPos] = useState({ x: 0, y: 0 });
  const [showTextInput, setShowTextInput] = useState(false);
  const [pendingAnnotation, setPendingAnnotation] = useState<Annotation | null>(
    null
  );
  const [annotationText, setAnnotationText] = useState("");
  const [penPath, setPenPath] = useState<string>("");
  const [isPenDrawing, setIsPenDrawing] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const audioId = searchParams.get("audioId");
    if (audioId) {
      setSelectedAudioId(audioId);
      fetchTranscription(audioId);
    }
  }, [searchParams]);

  const handleAudioSelect = (audioId: string) => {
    setSelectedAudioId(audioId);
    fetchTranscription(audioId);
  };

  const handleUploadComplete = (result: AudioUploadResult) => {
    setSelectedAudioId(result.audioId);
    fetchTranscription(result.audioId);
  };

  const fetchTranscription = async (audioId: string) => {
    try {
      const response = await fetch(`/api/audio/${audioId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.audio) {
          setTranscription(data.audio.transcription);
          setSpeakers(data.audio.transcription?.speakers || []);
        }
      }
    } catch (error) {
      console.error("Error fetching transcription:", error);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (selectedTool === "pen") {
      setIsPenDrawing(true);
      setPenPath(`M ${x} ${y}`);
    } else {
      setIsDrawing(true);
      setStartPos({ x, y });
      setCurrentPos({ x, y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (selectedTool === "pen" && isPenDrawing) {
      setPenPath(prev => `${prev} L ${x} ${y}`);
    } else if (isDrawing) {
      setCurrentPos({ x, y });
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (!canvasRef.current) return;

    if (selectedTool === "pen" && isPenDrawing) {
      const rect = canvasRef.current.getBoundingClientRect();
      const endX = e.clientX - rect.left;
      const endY = e.clientY - rect.top;

      const newAnnotation: Annotation = {
        id: Date.now().toString(),
        type: "pen",
        x: endX,
        y: endY,
        color: selectedColor,
        path: penPath,
      };

      setAnnotations((prev) => [...prev, newAnnotation]);
      setIsPenDrawing(false);
      setPenPath("");
    } else if (isDrawing) {
      const rect = canvasRef.current.getBoundingClientRect();
      const endX = e.clientX - rect.left;
      const endY = e.clientY - rect.top;

      const newAnnotation: Annotation = {
        id: Date.now().toString(),
        type: selectedTool,
        x: (startPos.x + endX) / 2, // El centre X
        y: (startPos.y + endY) / 2, // El centre Y
        color: selectedColor,
      };

      if (selectedTool === "circle") {
        // Calcula el radi per a cada eix
        newAnnotation.radiusX = Math.abs(endX - startPos.x) / 2;
        newAnnotation.radiusY = Math.abs(endY - startPos.y) / 2;

        // Mostra l'input de text per a les anotacions de cercle/oval
        setPendingAnnotation(newAnnotation);
        setShowTextInput(true);
        setAnnotationText("");
      } else {
        // La lògica del rectangle no canvia, però ajustem les coordenades
        newAnnotation.x = Math.min(startPos.x, endX);
        newAnnotation.y = Math.min(startPos.y, endY);
        newAnnotation.width = Math.abs(endX - startPos.x);
        newAnnotation.height = Math.abs(endY - startPos.y);
        setAnnotations((prev) => [...prev, newAnnotation]);
      }

      setIsDrawing(false);
    }
  };

  const handleTextConfirm = () => {
    if (pendingAnnotation) {
      const annotationWithText = {
        ...pendingAnnotation,
        text: annotationText.trim() || undefined,
      };
      setAnnotations((prev) => [...prev, annotationWithText]);
      setPendingAnnotation(null);
      setShowTextInput(false);
      setAnnotationText("");
    }
  };

  const handleTextCancel = () => {
    setPendingAnnotation(null);
    setShowTextInput(false);
    setAnnotationText("");
  };

  const clearAnnotations = () => {
    setAnnotations([]);
  };

  const saveAnnotations = () => {
    // TODO: Implement save functionality
    console.log("Saving annotations:", annotations);
  };

  const exportAnnotations = () => {
    // TODO: Implement export functionality
    const dataStr = JSON.stringify(annotations, null, 2);
    const dataUri =
      "data:application/json;charset=utf-8," + encodeURIComponent(dataStr);

    const exportFileDefaultName = `annotations-${selectedAudioId}.json`;

    const linkElement = document.createElement("a");
    linkElement.setAttribute("href", dataUri);
    linkElement.setAttribute("download", exportFileDefaultName);
    linkElement.click();
  };

  const removeAnnotation = (id: string) => {
    setAnnotations((prev) => prev.filter((a) => a.id !== id));
  };

  const getPreviewAnnotation = () => {
    if (!isDrawing) return null;

    const previewAnnotation: Annotation = {
      id: "preview",
      type: selectedTool,
      x: (startPos.x + currentPos.x) / 2,
      y: (startPos.y + currentPos.y) / 2,
      color: selectedColor,
    };

    if (selectedTool === "circle") {
      previewAnnotation.radiusX = Math.abs(currentPos.x - startPos.x) / 2;
      previewAnnotation.radiusY = Math.abs(currentPos.y - startPos.y) / 2;
    } else {
      // La lògica del rectangle no canvia, però ajustem les coordenades
      previewAnnotation.x = Math.min(startPos.x, currentPos.x);
      previewAnnotation.y = Math.min(startPos.y, currentPos.y);
      previewAnnotation.width = Math.abs(currentPos.x - startPos.x);
      previewAnnotation.height = Math.abs(currentPos.y - startPos.y);
    }

    return previewAnnotation;
  };

  const exportToPDF = async () => {
    const node = canvasRef.current;
    if (!node) {
      console.error('Canvas ref is null');
      return;
    }

    try {
      console.log('Starting PDF export...');
      console.log('Node dimensions:', {
        scrollWidth: node.scrollWidth,
        scrollHeight: node.scrollHeight,
        clientWidth: node.clientWidth,
        clientHeight: node.clientHeight
      });

      // Make sure we render the full scrollable height (not just the viewport)
      const canvas = await html2canvas(node, {
        scale: 2,                    // Increased scale for better quality
        backgroundColor: "#ffffff",
        useCORS: true,
        allowTaint: true,
        width: node.scrollWidth,
        height: node.scrollHeight,
        scrollX: 0,
        scrollY: 0,
        foreignObjectRendering: false, // Disable to avoid issues
        logging: true, // Enable logging for debugging
      });

      console.log('Canvas created:', {
        width: canvas.width,
        height: canvas.height
      });

      if (canvas.width === 0 || canvas.height === 0) {
        throw new Error('Canvas has zero dimensions');
      }

      const imgData = canvas.toDataURL("image/png", 0.95); // Higher quality PNG
      console.log('Image data length:', imgData.length);

      if (imgData.length < 100) {
        throw new Error('Image data is too small, likely empty');
      }

      // A4 portrait
      const pdf = new jsPDF({ unit: "pt", format: "a4", orientation: "p" });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();

      // Add horizontal padding (40pt on each side = 80pt total)
      const horizontalPadding = 40;
      const availableWidth = pageW - (horizontalPadding * 2);
      
      // Fit width with padding; compute full image height in PDF units
      const imgW = availableWidth;
      const imgH = (canvas.height * imgW) / canvas.width;

      console.log('PDF dimensions:', { pageW, pageH, imgW, imgH });

      // If the content is taller than one page, we "slide" the big image upward
      let yOffset = 0;
      while (yOffset < imgH) {
        // Draw the same tall image each page, shifted up by yOffset and with horizontal padding
        pdf.addImage(imgData, "PNG", horizontalPadding, -yOffset, imgW, imgH, undefined, "SLOW");
        yOffset += pageH;
        if (yOffset < imgH) pdf.addPage();
      }

      pdf.save(`annotations-${selectedAudioId ?? "export"}.pdf`);
      console.log('PDF saved successfully');
    } catch (error) {
       console.error('Error generating PDF:', error);
       alert(`Error al generar el PDF: ${(error as Error).message || 'Unknown error'}`);
     }
   };

  if (!transcription) {
    return (
      <AppLayout
        onAudioSelect={handleAudioSelect}
        onUploadComplete={handleUploadComplete}
      >
        <div className="flex h-full">
          <div className="flex-1 p-6 flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Mode anotació
              </h2>
              <p className="text-gray-600">
                Selecciona una transcripció desde la teva biblioteca para
                començar a anotar.
              </p>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      selectedAudioId={selectedAudioId}
      onAudioSelect={handleAudioSelect}
      onUploadComplete={handleUploadComplete}
    >
      <div className="flex h-full">
        <div className="flex-1 overflow-auto">
          {/* Transcription with Annotation Canvas */}
          <div className="p-6">
            <h2 className="text-2xl p-2 font-bold text-gray-900 mb-4">
              Anotacions
            </h2>
            <div
              ref={canvasRef}
              className="relative p-2 cursor-crosshair select-none min-h-screen"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
            >
              {/* Transcription Content */}
              <div className="relative z-10 pointer-events-none">
                {transcription.segments && transcription.segments.length > 0 ? (
                  <div className="space-y-1">
                    {transcription.segments.map(
                      (segment: TranscriptionSegment, index: number) => {
                        const speaker = speakers.find(
                          (s) => s.id === segment.speakerId
                        );
                        return (
                          <div key={index} className="mb-4">
                            <p className="text-gray-800 leading-relaxed">
                              <span className="font-medium">{index + 1}.</span>
                              <span className="font-semibold">
                                {speaker?.name || "Unknown Speaker"}:
                              </span>
                              {segment.text}
                            </p>
                          </div>
                        );
                      }
                    )}
                  </div>
                ) : (
                  <div className="text-gray-800 leading-relaxed">
                    {transcription.originalText || transcription.editedText}
                  </div>
                )}
              </div>

              {/* Annotations Overlay */}
              <div className="absolute inset-0 pointer-events-none">
                {/* Annotations */}
                {annotations.map((annotation) => (
                  <div key={annotation.id}>
                    {annotation.type === "circle" ? (
                      <>
                        <div
                          className="absolute border-2 rounded-full"
                          style={{
                            left: annotation.x - (annotation.radiusX || 0),
                            top: annotation.y - (annotation.radiusY || 0),
                            width: (annotation.radiusX || 0) * 2,
                            height: (annotation.radiusY || 0) * 2,
                            borderColor: annotation.color,
                            backgroundColor: `${annotation.color}20`,
                          }}
                        />
                        {annotation.text && (
                          <>
                            {/* Connecting line */}
                            <div
                              className="absolute pointer-events-none"
                              style={{
                                left:
                                  annotation.x +
                                  (annotation.radiusX || 0) * 0.7,
                                top:
                                  annotation.y -
                                  (annotation.radiusY || 0) * 0.7,
                                width: (annotation.radiusX || 0) * 0.5,
                                height: "1px",
                                backgroundColor: annotation.color,
                                transform: "rotate(-20deg)",
                                transformOrigin: "left center",
                              }}
                            />
                            {/* Text label */}
                            <div
                              className="absolute bg-white px-1 py-0 text-md font-medium rounded pointer-events-none"
                              style={{
                                left: annotation.x + (annotation.radiusX || 0),
                                top:
                                  annotation.y - (annotation.radiusY || 0) - 12,
                                color: annotation.color,
                              }}
                            >
                              {annotation.text}
                            </div>
                          </>
                        )}
                      </>
                    ) : annotation.type === "pen" ? (
                      <svg
                        className="absolute inset-0 pointer-events-none"
                        style={{
                          width: "100%",
                          height: "100%",
                        }}
                      >
                        <path
                          d={annotation.path}
                          stroke={annotation.color}
                          strokeWidth="2"
                          fill="none"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    ) : (
                      <div
                        className="absolute"
                        style={{
                          left: annotation.x,
                          top: annotation.y,
                          width: annotation.width,
                          height: annotation.height,
                          backgroundColor: `${annotation.color}40`,
                          border: `2px solid ${annotation.color}`,
                        }}
                      />
                    )}
                  </div>
                ))}

                {/* Preview annotation while drawing */}
                {(() => {
                  const preview = getPreviewAnnotation();
                  if (!preview) return null;

                  return (
                    <div key="preview">
                      {preview.type === "circle" ? (
                        <div
                          className="absolute border-2 rounded-full opacity-70"
                          style={{
                            left: preview.x - (preview.radiusX || 0),
                            top: preview.y - (preview.radiusY || 0),
                            width: (preview.radiusX || 0) * 2,
                            height: (preview.radiusY || 0) * 2,
                            borderColor: preview.color,
                            backgroundColor: `${preview.color}20`,
                            borderStyle: "dashed",
                          }}
                        />
                      ) : (
                        <div
                          className="absolute opacity-70"
                          style={{
                            left: preview.x,
                            top: preview.y,
                            width: preview.width,
                            height: preview.height,
                            backgroundColor: `${preview.color}40`,
                            border: `2px dashed ${preview.color}`,
                          }}
                        />
                      )}
                    </div>
                  );
                })()}

                {/* Live pen drawing preview */}
                {isPenDrawing && penPath && (
                  <svg
                    className="absolute inset-0 pointer-events-none opacity-70"
                    style={{
                      width: "100%",
                      height: "100%",
                    }}
                  >
                    <path
                      d={penPath}
                      stroke={selectedColor}
                      strokeWidth="2"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeDasharray="5,5"
                    />
                  </svg>
                )}

                {/* Pending Annotation with Text Input */}
                {showTextInput && pendingAnnotation && (
                  <>
                    {/* Show the circle only for circle annotations */}
                    {pendingAnnotation.type === "circle" && (
                      <div
                        className="absolute border-2 rounded-full opacity-70"
                        style={{
                          left:
                            pendingAnnotation.x -
                            (pendingAnnotation.radiusX || 0),
                          top:
                            pendingAnnotation.y -
                            (pendingAnnotation.radiusY || 0),
                          width: (pendingAnnotation.radiusX || 0) * 2,
                          height: (pendingAnnotation.radiusY || 0) * 2,
                          borderColor: pendingAnnotation.color,
                          backgroundColor: `${pendingAnnotation.color}20`,
                        }}
                      />
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        <ToolsSidePanel
          selectedTool={selectedTool}
          onToolSelect={setSelectedTool}
          selectedColor={selectedColor} // Passa el color actiu
          onColorSelect={setSelectedColor} // Passa la funció per canviar-lo
          annotations={annotations}
          onClearAnnotations={clearAnnotations}
          onSaveAnnotations={saveAnnotations}
          onExportAnnotations={exportAnnotations}
          onRemoveAnnotation={removeAnnotation}
          exportToPDF={exportToPDF}
        />
      </div>
    </AppLayout>
  );
}
