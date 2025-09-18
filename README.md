# Transcriu

A modern, AI-powered audio transcription application built with Next.js 14, TypeScript, and OpenAI's Whisper API. Upload audio files, get accurate transcriptions, edit them, and export to PDF or TXT formats.

## Features

- 🎵 **Audio Upload**: Drag-and-drop interface for easy audio file uploads
- 🤖 **AI Transcription**: Powered by OpenAI's Whisper API for accurate speech-to-text
- ✏️ **Edit Transcriptions**: Real-time editing with auto-save functionality
- 🎧 **Advanced Audio Player**: Full-featured player with playback speed control, seeking, and volume adjustment
- 📄 **Export Options**: Export transcriptions as PDF or TXT files
- 📱 **Responsive Design**: Works seamlessly on desktop and mobile devices
- 🗄️ **Database Storage**: Persistent storage with PostgreSQL and Prisma ORM
- 🎨 **Modern UI**: Beautiful interface built with Tailwind CSS and shadcn/ui

## Tech Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS
- **UI Components**: shadcn/ui, Lucide React
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL with Prisma ORM
- **AI**: OpenAI Whisper API
- **File Handling**: Multer for uploads
- **PDF Generation**: jsPDF

## Prerequisites

Before you begin, ensure you have the following installed:

- Node.js 18+ and npm
- PostgreSQL database
- OpenAI API key

## Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd transcribe-ai
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**

   Copy the example environment file:

   ```bash
   cp .env.example .env
   ```

   Update the `.env` file with your configuration:

   ```env
   # Database
   DATABASE_URL="postgresql://username:password@localhost:5432/transcribeai"

   # OpenAI API
   OPENAI_API_KEY="your-openai-api-key-here"

   # Supabase (optional - for file storage)
   NEXT_PUBLIC_SUPABASE_URL="your-supabase-url-here"
   NEXT_PUBLIC_SUPABASE_ANON_KEY="your-supabase-anon-key-here"

   # File Upload Settings
   MAX_FILE_SIZE=25000000
   UPLOAD_DIR="./uploads"
   ```

4. **Set up Supabase**

   - Create a new project at [supabase.com](https://supabase.com)
   - Copy your project URL and anon key to the `.env` file
   - Set up authentication with Google provider in the Supabase dashboard
   - Create the required database tables (see Database Schema section)
   - Create a storage bucket for audio files

5. **Create uploads directory**
   ```bash
   mkdir uploads
   ```

## Getting Started

1. **Start the development server**

   ```bash
   npm run dev
   ```

2. **Open your browser**

   Navigate to [http://localhost:3000](http://localhost:3000)

3. **Upload and transcribe**
   - Drag and drop an audio file into the sidebar
   - Wait for the AI transcription to complete
   - Edit the transcription as needed
   - Export to PDF or TXT format

## Supported Audio Formats

- MP3
- WAV
- M4A
- FLAC
- OGG
- WEBM

## API Endpoints

- `POST /api/upload` - Upload audio files
- `GET /api/audio` - Get all audio files
- `GET /api/audio/[id]` - Get specific audio file
- `GET /api/audio/[id]/file` - Stream audio file
- `POST /api/transcribe` - Transcribe audio
- `GET/PATCH /api/transcription/[id]` - Get/update transcription
- `POST /api/export` - Export transcription

## Environment Variables

| Variable                        | Description                                       | Required |
| ------------------------------- | ------------------------------------------------- | -------- |
| `OPENAI_API_KEY`                | OpenAI API key for Whisper                        | Yes      |
| `REPLICATE_API_TOKEN`           | Replicate API token for alternative transcription | No       |
| `NEXT_PUBLIC_SUPABASE_URL`      | Supabase project URL                              | Yes      |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key                            | Yes      |
| `SUPABASE_SERVICE_ROLE_KEY`     | Supabase service role key                         | Yes      |
| `MAX_FILE_SIZE`                 | Maximum upload file size in bytes                 | No       |
| `UPLOAD_DIR`                    | Directory for uploaded files                      | No       |

## Database Schema

The application uses two main models:

- **Audio**: Stores audio file metadata and status
- **Transcription**: Stores original and edited transcription text

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

If you encounter any issues or have questions, please open an issue on GitHub.
