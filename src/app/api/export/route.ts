import { NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import jsPDF from "jspdf";
import { Document, Packer, Paragraph, TextRun } from "docx";
import { resolveLatestTranscriptionPath } from "@/helpers/resolveLatestTranscriptionPath";

import type { TranscriptionSegment, Speaker } from "@/types";

interface TranscriptionData {
  text: string;
  segments?: TranscriptionSegment[];
  speakers?: Speaker[];
}

export async function POST(request: Request) {
  try {
    console.log("[EXPORT] Starting export request");
    const { transcriptionId, format, filename } = await request.json();
    console.log("[EXPORT] Request params:", {
      transcriptionId,
      format,
      filename,
    });

    if (!transcriptionId || !format) {
      console.log("[EXPORT] Missing required parameters:", {
        transcriptionId,
        format,
      });
      return NextResponse.json(
        { success: false, error: "Transcription ID and format are required" },
        { status: 400 }
      );
    }

    if (!["pdf", "txt", "docx"].includes(format)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid format. Use "pdf", "txt", or "docx"',
        },
        { status: 400 }
      );
    }

    // Create Supabase client
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            cookieStore.set({ name, value, ...options });
          },
          remove(name: string, options: CookieOptions) {
            cookieStore.set({ name, value: "", ...options });
          },
        },
      }
    );

    // Check authentication
    console.log("[EXPORT] Checking authentication");
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      console.log(
        "[EXPORT] Authentication failed:",
        userError?.message || "No user"
      );
      return NextResponse.json(
        { success: false, error: "Authentication required. Please sign in." },
        { status: 401 }
      );
    }
    console.log("[EXPORT] User authenticated:", user.id);

    // Fetch the audio file to verify ownership and get metadata
    console.log("[EXPORT] Fetching audio file info for ID:", transcriptionId);
    const { data: audioFile, error: audioError } = await supabase
      .from("audios")
      .select("id, filename, custom_name, user_id, status")
      .eq("id", transcriptionId)
      .single();

    if (audioError || !audioFile) {
      console.log(
        "[EXPORT] Audio file not found:",
        audioError?.message || "No data"
      );
      return NextResponse.json(
        { success: false, error: "Audio file not found" },
        { status: 404 }
      );
    }
    console.log("[EXPORT] Audio file found:", {
      filename: audioFile.filename,
      status: audioFile.status,
    });

    // Verify the audio file belongs to the authenticated user
    if (audioFile.user_id !== user.id) {
      return NextResponse.json(
        { success: false, error: "Access denied" },
        { status: 403 }
      );
    }

    // Check if transcription is completed
    console.log("[EXPORT] Checking transcription status:", audioFile.status);
    if (audioFile.status !== "completed") {
      console.log(
        "[EXPORT] Transcription not completed, status:",
        audioFile.status
      );
      return NextResponse.json(
        { success: false, error: "Transcription not completed yet" },
        { status: 400 }
      );
    }

    // Download transcription JSON from Supabase Storage using versioned path
    console.log("[EXPORT] Resolving transcription file path for audioId:", audioFile.id);
    const jsonFileName = await resolveLatestTranscriptionPath(
      supabase,
      user.id,
      audioFile.id
    );
    console.log("[EXPORT] Downloading transcription JSON:", jsonFileName);
    const { data: jsonData, error: downloadError } = await supabase.storage
      .from("transcriptions")
      .download(jsonFileName);

    if (downloadError || !jsonData) {
      console.log(
        "[EXPORT] Failed to download JSON file:",
        downloadError?.message || "No data"
      );
      console.log("[EXPORT] Attempted file path:", jsonFileName);
      console.log("[EXPORT] User ID:", user.id);
      console.log("[EXPORT] Audio ID:", audioFile.id);
      return NextResponse.json(
        { success: false, error: "Transcription file not found" },
        { status: 404 }
      );
    }
    console.log("[EXPORT] JSON file downloaded successfully");

    // Parse the JSON transcription data
    let transcriptionData: TranscriptionData;
    try {
      const jsonText = await jsonData.text();
      console.log(
        "[EXPORT] Parsing JSON data, size:",
        jsonText.length,
        "characters"
      );
      transcriptionData = JSON.parse(jsonText) as TranscriptionData;
      console.log("[EXPORT] Transcription data parsed:", {
        hasText: !!transcriptionData.text,
        hasSegments: !!transcriptionData.segments,
        segmentCount: transcriptionData.segments?.length || 0,
      });
    } catch (parseError: unknown) {
      console.log("[EXPORT] Failed to parse JSON:", parseError);
      return NextResponse.json(
        { success: false, error: "Invalid transcription file format" },
        { status: 500 }
      );
    }
    const text = transcriptionData.text || "";
    const segments = transcriptionData.segments || null;
    const speakers = transcriptionData.speakers || [];
    const audioName =
      audioFile.custom_name || audioFile.filename || `audio_${transcriptionId}`;
    const exportFilename = filename || audioName.replace(/\.[^/.]+$/, "");

    // Format date without time (MM/DD/YYYY format)
    const currentDate = new Date();
    const formattedDate = `${(currentDate.getMonth() + 1)
      .toString()
      .padStart(2, "0")}/${currentDate
      .getDate()
      .toString()
      .padStart(2, "0")}/${currentDate.getFullYear()}`;

    if (format === "txt") {
      console.log("[EXPORT] Generating TXT file");
      // Generate TXT file with speaker names if available
      let txtContent =
        `${audioName}\n` + `${formattedDate}\n` + `\n${"=".repeat(50)}\n\n`;

      if (segments && segments.length > 0 && speakers.length > 0) {
        // Generate TXT with segments and speaker names (without timestamps)
        for (let i = 0; i < segments.length; i++) {
          const segment = segments[i];
          const speaker = speakers.find(
            (s: Speaker) => s.id === segment.speakerId
          );
          const speakerName = speaker ? speaker.name : "Unknown Speaker";
          const segmentIndex = i + 1;

          txtContent += `${segmentIndex}. ${speakerName}: ${segment.text.trim()}\n`;
        }
      } else {
        txtContent += text;
      }

      console.log(
        "[EXPORT] TXT file generated successfully, size:",
        txtContent.length,
        "characters"
      );
      return new NextResponse(txtContent, {
        headers: {
          "Content-Type": "text/plain",
          "Content-Disposition": `attachment; filename="${exportFilename}.txt"`,
        },
      });
    } else if (format === "docx") {
      console.log("[EXPORT] Generating DOCX file");

      // Create document sections
      const children: Paragraph[] = [];

      // Add title
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: audioName,
              bold: true,
              size: 32, // 16pt
            }),
          ],
          spacing: { after: 400 },
        })
      );

      // Add date
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: formattedDate,
              size: 20, // 10pt
            }),
          ],
          spacing: { after: 600 },
        })
      );

      // Add separator
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: "=".repeat(50),
              size: 20,
            }),
          ],
          spacing: { after: 400 },
        })
      );

      if (segments && segments.length > 0 && speakers.length > 0) {
        // Generate DOCX with segments and speaker names (without timestamps)
        for (let i = 0; i < segments.length; i++) {
          const segment = segments[i];
          const speaker = speakers.find(
            (s: Speaker) => s.id === segment.speakerId
          );
          const speakerName = speaker ? speaker.name : "Unknown Speaker";
          const segmentIndex = i + 1;

          // Add segment with speaker name and text
          children.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: `${segmentIndex}. ${speakerName}: `,
                  bold: true,
                  size: 22, // 11pt
                }),
                new TextRun({
                  text: segment.text.trim(),
                  size: 22, // 11pt
                }),
              ],
              spacing: { after: 300 },
            })
          );
        }
      } else {
        // Fallback to plain text if no segments available
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: text,
                size: 22, // 11pt
              }),
            ],
          })
        );
      }

      // Create the document
      const doc = new Document({
        sections: [
          {
            properties: {},
            children: children,
          },
        ],
      });

      console.log("[EXPORT] Converting DOCX to buffer");
      const docxBuffer = await Packer.toBuffer(doc);
      console.log(
        "[EXPORT] DOCX generated successfully, size:",
        docxBuffer.length,
        "bytes"
      );

      return new NextResponse(new Blob([Buffer.from(docxBuffer)]), {
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "Content-Disposition": `attachment; filename="${exportFilename}.docx"`,
        },
      });
    } else {
      console.log("[EXPORT] Generating PDF file");
      // Generate PDF file
      const pdf = new jsPDF();
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;
      const maxWidth = pageWidth - 2 * margin;
      const lineHeight = 5;
      let yPosition = margin;

      // Add title
      pdf.setFontSize(16);
      pdf.setFont("helvetica", "bold");
      pdf.text(audioName, margin, yPosition);
      yPosition += lineHeight * 2;

      // Add date
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      pdf.text(formattedDate, margin, yPosition);
      yPosition += lineHeight * 2;

      // Add separator line
      pdf.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += lineHeight * 2;

      // Add transcription content
      pdf.setFontSize(11);

      if (segments && segments.length > 0) {
        console.log("[EXPORT] Adding segments to PDF, count:", segments.length);
        // Generate PDF with segments and speaker names (without timestamps)
        for (let i = 0; i < segments.length; i++) {
          const segment = segments[i];

          // Check if we need a new page
          if (yPosition > pageHeight - margin - 30) {
            pdf.addPage();
            yPosition = margin;
          }

          // Find speaker name for this segment
          const speaker = speakers.find(
            (s: Speaker) => s.id === segment.speakerId
          );
          const speakerName = speaker ? speaker.name : "Unknown Speaker";
          const segmentIndex = i + 1;

          // Add speaker name and text on the same line
          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(11);
          const speakerText = `${segmentIndex}. ${speakerName}: `;
          pdf.text(speakerText, margin, yPosition);

          // Calculate width of speaker text to position the segment text
          const speakerWidth = pdf.getTextWidth(speakerText);

          pdf.setFont("helvetica", "normal");
          const availableWidth = maxWidth - speakerWidth;
          const segmentTextLines = pdf.splitTextToSize(
            segment.text.trim(),
            availableWidth
          );

          // Add first line of text on same line as speaker
          if (segmentTextLines.length > 0) {
            pdf.text(segmentTextLines[0], margin + speakerWidth, yPosition);
            yPosition += lineHeight;
          }

          // Add remaining lines if any
          for (let j = 1; j < segmentTextLines.length; j++) {
            if (yPosition > pageHeight - margin) {
              pdf.addPage();
              yPosition = margin;
            }
            pdf.text(segmentTextLines[j], margin, yPosition);
            yPosition += lineHeight;
          }

          // Add spacing between segments
          yPosition += lineHeight;
        }
        console.log("[EXPORT] Segments added to PDF successfully");
      } else {
        // Fallback to plain text if no segments available
        const textLines = pdf.splitTextToSize(text, maxWidth);

        for (let i = 0; i < textLines.length; i++) {
          if (yPosition > pageHeight - margin) {
            pdf.addPage();
            yPosition = margin;
          }
          pdf.text(textLines[i], margin, yPosition);
          yPosition += lineHeight;
        }
      }

      console.log("[EXPORT] Converting PDF to buffer");
      const pdfBuffer = Buffer.from(pdf.output("arraybuffer"));
      console.log(
        "[EXPORT] PDF generated successfully, size:",
        pdfBuffer.length,
        "bytes"
      );

      return new NextResponse(pdfBuffer, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${exportFilename}.pdf"`,
        },
      });
    }
  } catch (error) {
    console.error("[EXPORT] Export error:", error);
    console.error(
      "[EXPORT] Error stack:",
      error instanceof Error ? error.stack : "No stack trace"
    );
    return NextResponse.json(
      { success: false, error: "Failed to export file" },
      { status: 500 }
    );
  }
}
