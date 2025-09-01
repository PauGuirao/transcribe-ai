import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import jsPDF from 'jspdf';

export async function POST(request: NextRequest) {
  try {
    console.log('[EXPORT] Starting export request');
    const { transcriptionId, format, filename } = await request.json();
    console.log('[EXPORT] Request params:', { transcriptionId, format, filename });

    if (!transcriptionId || !format) {
      console.log('[EXPORT] Missing required parameters:', { transcriptionId, format });
      return NextResponse.json(
        { success: false, error: 'Transcription ID and format are required' },
        { status: 400 }
      );
    }

    if (!['pdf', 'txt'].includes(format)) {
      return NextResponse.json(
        { success: false, error: 'Invalid format. Use "pdf" or "txt"' },
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
            cookieStore.set({ name, value: '', ...options });
          },
        },
      }
    );

    // Check authentication
    console.log('[EXPORT] Checking authentication');
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.log('[EXPORT] Authentication failed:', userError?.message || 'No user');
      return NextResponse.json(
        { success: false, error: 'Authentication required. Please sign in.' },
        { status: 401 }
      );
    }
    console.log('[EXPORT] User authenticated:', user.id);

    // Fetch the audio file to verify ownership and get metadata
    console.log('[EXPORT] Fetching audio file info for ID:', transcriptionId);
    const { data: audioFile, error: audioError } = await supabase
      .from('audios')
      .select('id, filename, user_id, status')
      .eq('id', transcriptionId)
      .single();

    if (audioError || !audioFile) {
      console.log('[EXPORT] Audio file not found:', audioError?.message || 'No data');
      return NextResponse.json(
        { success: false, error: 'Audio file not found' },
        { status: 404 }
      );
    }
    console.log('[EXPORT] Audio file found:', { filename: audioFile.filename, status: audioFile.status });

    // Verify the audio file belongs to the authenticated user
    if (audioFile.user_id !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    // Check if transcription is completed
    console.log('[EXPORT] Checking transcription status:', audioFile.status);
    if (audioFile.status !== 'completed') {
      console.log('[EXPORT] Transcription not completed, status:', audioFile.status);
      return NextResponse.json(
        { success: false, error: 'Transcription not completed yet' },
        { status: 400 }
      );
    }

    // Download transcription JSON from Supabase Storage
    const jsonFileName = `${user.id}/${audioFile.id}.json`;
    console.log('[EXPORT] Downloading transcription JSON:', jsonFileName);
    const { data: jsonData, error: downloadError } = await supabase.storage
      .from('transcriptions')
      .download(jsonFileName);

    if (downloadError || !jsonData) {
      console.log('[EXPORT] Failed to download JSON file:', downloadError?.message || 'No data');
      return NextResponse.json(
        { success: false, error: 'Transcription file not found' },
        { status: 404 }
      );
    }
    console.log('[EXPORT] JSON file downloaded successfully');

    // Parse the JSON transcription data
    let transcriptionData;
    try {
      const jsonText = await jsonData.text();
      console.log('[EXPORT] Parsing JSON data, size:', jsonText.length, 'characters');
      transcriptionData = JSON.parse(jsonText);
      console.log('[EXPORT] Transcription data parsed:', {
        hasText: !!transcriptionData.text,
        hasSegments: !!transcriptionData.segments,
        segmentCount: transcriptionData.segments?.length || 0
      });
    } catch (parseError) {
      console.log('[EXPORT] Failed to parse JSON:', parseError);
      return NextResponse.json(
        { success: false, error: 'Invalid transcription file format' },
        { status: 500 }
      );
    }

    const text = transcriptionData.text || '';
    const segments = transcriptionData.segments || null;
    const audioName = audioFile.filename || `audio_${transcriptionId}`;
    const exportFilename = filename || audioName.replace(/\.[^/.]+$/, '');

    if (format === 'txt') {
      console.log('[EXPORT] Generating TXT file');
      // Generate TXT file
      const txtContent = `Transcription of: ${audioName}\n`
        + `Generated on: ${new Date().toLocaleString()}\n`
        + `\n${'='.repeat(50)}\n\n`
        + text;

      console.log('[EXPORT] TXT file generated successfully, size:', txtContent.length, 'characters');
      return new NextResponse(txtContent, {
        headers: {
          'Content-Type': 'text/plain',
          'Content-Disposition': `attachment; filename="${exportFilename}.txt"`,
        },
      });
    } else {
      console.log('[EXPORT] Generating PDF file');
      // Generate PDF file
      const pdf = new jsPDF();
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;
      const maxWidth = pageWidth - 2 * margin;
      const lineHeight = 7;
      let yPosition = margin;

      // Add title
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Audio Transcription', margin, yPosition);
      yPosition += lineHeight * 2;

      // Add metadata
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`File: ${audioName}`, margin, yPosition);
      yPosition += lineHeight;
      pdf.text(`Generated: ${new Date().toLocaleString()}`, margin, yPosition);
      yPosition += lineHeight * 2;

      // Add separator line
      pdf.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += lineHeight * 2;

      // Add transcription content
      pdf.setFontSize(11);
      
      if (segments && segments.length > 0) {
        console.log('[EXPORT] Adding segments to PDF, count:', segments.length);
        // Generate PDF with segments and timestamps
        for (let i = 0; i < segments.length; i++) {
          const segment = segments[i];
          
          // Check if we need a new page
          if (yPosition > pageHeight - margin - 30) {
            pdf.addPage();
            yPosition = margin;
          }
          
          // Format time range
           const formatTime = (seconds: number) => {
             const minutes = Math.floor(seconds / 60);
             const remainingSeconds = Math.floor(seconds % 60);
             return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
           };
          
          const timeRange = `${formatTime(segment.start)} - ${formatTime(segment.end)}`;
          
          // Add segment number and time range
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(10);
          pdf.text(`#${(i + 1).toString().padStart(3, '0')} | ${timeRange}`, margin, yPosition);
          yPosition += lineHeight + 2;
          
          // Add segment text
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(11);
          const segmentTextLines = pdf.splitTextToSize(segment.text.trim(), maxWidth);
          
          for (let j = 0; j < segmentTextLines.length; j++) {
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
        console.log('[EXPORT] Segments added to PDF successfully');
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

      console.log('[EXPORT] Converting PDF to buffer');
      const pdfBuffer = Buffer.from(pdf.output('arraybuffer'));
      console.log('[EXPORT] PDF generated successfully, size:', pdfBuffer.length, 'bytes');

      return new NextResponse(pdfBuffer, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${exportFilename}.pdf"`,
        },
      });
    }
  } catch (error) {
    console.error('[EXPORT] Export error:', error);
    console.error('[EXPORT] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      { success: false, error: 'Failed to export file' },
      { status: 500 }
    );
  }
}