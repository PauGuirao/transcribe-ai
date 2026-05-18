import { NextResponse } from "next/server";
import jsPDF from "jspdf";
import { Document, Packer, Paragraph, TextRun } from "docx";

import type { TranscriptionSegment, Speaker } from "@/types";

import { getAuth, jsonError } from "@/lib/api-helpers"
import { getAudioById } from "@/lib/data/audio"
import { getTranscriptionById } from "@/lib/data/transcription"
import type { TranscriptionJsonData } from "@/lib/data/transcription"

export async function POST(request: Request) {
  try {
    console.log("[EXPORT] Starting export request");
    const { transcriptionId, audioId, format, filename } = await request.json();
    const targetAudioId = audioId ?? transcriptionId
    console.log("[EXPORT] Request params:", {
      transcriptionId,
      audioId,
      targetAudioId,
      format,
      filename,
    });

    if (!targetAudioId || !format) {
      console.log("[EXPORT] Missing required parameters:", {
        targetAudioId,
        format,
      })
      return jsonError("Transcription (audio) ID and format are required", { status: 400 })
    }

    if (!["pdf", "txt", "docx"].includes(format)) {
      return jsonError('Invalid format. Use "pdf", "txt", or "docx"', { status: 400 })
    }

    // Auth
    const { supabase, user, error: userError } = await getAuth()
    if (userError || !user) {
      console.log("[EXPORT] Authentication failed:", userError?.message || "No user")
      return jsonError("Authentication required. Please sign in.", { status: 401 })
    }
    console.log("[EXPORT] User authenticated:", user.id)

    // Fetch audio by targetAudioId to verify ownership and status
    console.log("[EXPORT] Fetching audio file info for ID:", targetAudioId)
    const { data: audioFile, error: audioError } = await getAudioById(supabase, user.id, targetAudioId)

    if (audioError || !audioFile) {
      console.log("[EXPORT] Audio file not found:", audioError?.message || "No data")
      return jsonError("Audio file not found", { status: 404 })
    }

    // Verify the audio file belongs to the authenticated user (redundant but explicit)
    if (audioFile.user_id !== user.id) {
      return jsonError("Access denied", { status: 403 })
    }

    // Check if transcription is completed
    console.log("[EXPORT] Checking transcription status:", audioFile.status)
    if (audioFile.status !== "completed") {
      console.log("[EXPORT] Transcription not completed, status:", audioFile.status)
      return jsonError("Transcription not completed yet", { status: 400 })
    }

    // Resolve transcription JSON path from DB and download from Cloudflare Worker R2
    console.log("[EXPORT] Resolving transcription JSON path via DB")
    const { data: transcriptionRow, error: trError } = await getTranscriptionById(supabase, user.id, targetAudioId)
    if (trError) {
      console.warn("[EXPORT] Warning getting transcription row:", trError?.message || trError)
    }

    // Cloudflare Worker URL and auth token
    const workerUrl = process.env.NEXT_PUBLIC_CLOUDFLARE_WORKER_URL || 'https://transcribe-worker.guiraocastells.workers.dev';
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      return jsonError('Authentication token not available', { status: 401 });
    }

    // Build Worker download URL for transcription JSON
    // Use the resolveLatestTranscriptionPath helper to get the most recent file
    const { resolveLatestTranscriptionPath } = await import("@/helpers/resolveLatestTranscriptionPath");
    const latestJsonPath = await resolveLatestTranscriptionPath(supabase, user.id, audioFile.id);
    const fname = latestJsonPath.split('/').pop()!;
    const workerDownloadUrl = `${workerUrl}/download/transcriptions/${user.id}/${audioFile.id}/${fname}`;

    console.log("[EXPORT] Fetching transcription JSON from worker:", workerDownloadUrl)
    const workerResponse = await fetch(workerDownloadUrl, {
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
      },
    });

    if (!workerResponse.ok) {
      console.error('Worker download error:', workerResponse.status, workerResponse.statusText);
      return jsonError('Transcription file not found', { status: workerResponse.status === 404 ? 404 : 500 });
    }

    // Parse the JSON transcription data
    let transcriptionData: TranscriptionJsonData
    try {
      const jsonText = await workerResponse.text()
      console.log("[EXPORT] Parsing JSON data, size:", jsonText.length, "characters")
      transcriptionData = JSON.parse(jsonText) as TranscriptionJsonData
      console.log("[EXPORT] Transcription data parsed:", {
        hasText: !!transcriptionData.text,
        hasSegments: !!transcriptionData.segments,
        segmentCount: transcriptionData.segments?.length || 0,
      })
    } catch (parseError: unknown) {
      console.log("[EXPORT] Failed to parse JSON:", parseError)
      return jsonError("Invalid transcription file format", { status: 500 })
    }
    const text = transcriptionData.text || ""
    const segments = transcriptionData.segments || null
    const speakers = transcriptionData.speakers || []
    const audioName = audioFile.custom_name || audioFile.filename || `audio_${targetAudioId}`
    const exportFilename = filename || audioName.replace(/\.[^/.]+$/, "")

    // Format date without time (MM/DD/YYYY format)
    const currentDate = new Date()
    const formattedDate = `${(currentDate.getMonth() + 1).toString().padStart(2, "0")}/${currentDate
      .getDate()
      .toString()
      .padStart(2, "0")}/${currentDate.getFullYear()}`

    if (format === "txt") {
      console.log("[EXPORT] Generating TXT file")
      let txtContent = `${audioName}\n${formattedDate}\n\n${"=".repeat(50)}\n\n`

      if (segments && segments.length > 0 && speakers.length > 0) {
        for (let i = 0; i < segments.length; i++) {
          const segment = segments[i]
          const speaker = speakers.find((s) => s.id === segment.speakerId)
          const speakerName = speaker ? speaker.name : "Unknown Speaker"
          const segmentIndex = i + 1
          txtContent += `${segmentIndex}. ${speakerName}: ${segment.text.trim()}\n`
        }
      } else {
        txtContent += text
      }

      console.log("[EXPORT] TXT file generated successfully, size:", txtContent.length, "characters")
      return new NextResponse(txtContent, {
        headers: {
          "Content-Type": "text/plain",
          "Content-Disposition": `attachment; filename="${exportFilename}.txt"`,
        },
      })
    } else if (format === "docx") {
      console.log("[EXPORT] Generating DOCX file")
      const children: Paragraph[] = []
      children.push(
        new Paragraph({
          children: [new TextRun({ text: audioName, bold: true, size: 32 })],
          spacing: { after: 400 },
        })
      )
      children.push(
        new Paragraph({
          children: [new TextRun({ text: formattedDate, size: 20 })],
          spacing: { after: 600 },
        })
      )
      children.push(
        new Paragraph({
          children: [new TextRun({ text: "=".repeat(50), size: 20 })],
          spacing: { after: 400 },
        })
      )

      if (segments && segments.length > 0 && speakers.length > 0) {
        for (let i = 0; i < segments.length; i++) {
          const segment = segments[i]
          const speaker = speakers.find((s) => s.id === segment.speakerId)
          const speakerName = speaker ? speaker.name : "Unknown Speaker"
          const segmentIndex = i + 1
          children.push(
            new Paragraph({
              children: [
                new TextRun({ text: `${segmentIndex}. ${speakerName}: `, bold: true, size: 22 }),
                new TextRun({ text: segment.text.trim(), size: 22 }),
              ],
              spacing: { after: 300 },
            })
          )
        }
      } else {
        children.push(new Paragraph({ children: [new TextRun({ text, size: 22 })] }))
      }

      const doc = new Document({ sections: [{ properties: {}, children }] })
      console.log("[EXPORT] Converting DOCX to buffer")
      const docxBuffer = await Packer.toBuffer(doc)
      console.log("[EXPORT] DOCX generated successfully, size:", docxBuffer.length, "bytes")

      return new NextResponse(new Blob([Buffer.from(docxBuffer)]), {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "Content-Disposition": `attachment; filename="${exportFilename}.docx"`,
        },
      })
    } else {
      console.log("[EXPORT] Generating PDF file")
      const pdf = new jsPDF()
      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      const margin = 20
      const maxWidth = pageWidth - 2 * margin
      const lineHeight = 5
      let yPosition = margin

      pdf.setFontSize(16)
      pdf.setFont("helvetica", "bold")
      pdf.text(audioName, margin, yPosition)
      yPosition += lineHeight * 2

      pdf.setFontSize(10)
      pdf.setFont("helvetica", "normal")
      pdf.text(formattedDate, margin, yPosition)
      yPosition += lineHeight * 2

      pdf.line(margin, yPosition, pageWidth - margin, yPosition)
      yPosition += lineHeight * 2

      pdf.setFontSize(11)

      if (segments && segments.length > 0) {
        console.log("[EXPORT] Adding segments to PDF, count:", segments.length)
        for (let i = 0; i < segments.length; i++) {
          const segment = segments[i]
          if (yPosition > pageHeight - margin - 30) {
            pdf.addPage()
            yPosition = margin
          }
          const speaker = speakers.find((s) => s.id === segment.speakerId)
          const speakerName = speaker ? speaker.name : "Unknown Speaker"
          const segmentIndex = i + 1

          pdf.setFont("helvetica", "bold")
          pdf.setFontSize(11)
          const speakerText = `${segmentIndex}. ${speakerName}: `
          pdf.text(speakerText, margin, yPosition)
          const speakerWidth = pdf.getTextWidth(speakerText)

          pdf.setFont("helvetica", "normal")
          const availableWidth = maxWidth - speakerWidth
          const segmentTextLines = pdf.splitTextToSize(segment.text.trim(), availableWidth)

          if (segmentTextLines.length > 0) {
            pdf.text(segmentTextLines[0], margin + speakerWidth, yPosition)
            yPosition += lineHeight
          }

          for (let j = 1; j < segmentTextLines.length; j++) {
            if (yPosition > pageHeight - margin) {
              pdf.addPage()
              yPosition = margin
            }
            pdf.text(segmentTextLines[j], margin, yPosition)
            yPosition += lineHeight
          }

          yPosition += lineHeight
        }
        console.log("[EXPORT] Segments added to PDF successfully")
      } else {
        const textLines = pdf.splitTextToSize(text, maxWidth)
        for (let i = 0; i < textLines.length; i++) {
          if (yPosition > pageHeight - margin) {
            pdf.addPage()
            yPosition = margin
          }
          pdf.text(textLines[i], margin, yPosition)
          yPosition += lineHeight
        }
      }

      console.log("[EXPORT] Converting PDF to buffer")
      const pdfBuffer = Buffer.from(pdf.output("arraybuffer"))
      console.log("[EXPORT] PDF generated successfully, size:", pdfBuffer.length, "bytes")

      return new NextResponse(pdfBuffer, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${exportFilename}.pdf"`,
        },
      })
    }
  } catch (error) {
    console.error("[EXPORT] Export error:", error)
    console.error("[EXPORT] Error stack:", error instanceof Error ? error.stack : "No stack trace")
    return jsonError("Failed to export file", { status: 500 })
  }
}
