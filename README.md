# FastAPI Audit Application

This is a full-stack application for audio recording, transcription, summarization, and report generation for audits. It uses Next.js for the frontend and FastAPI for the backend.

## Features

- Audio recording and transcription
- File upload and processing
- Transcription history management
- AI-powered summarization of audit data
- PDF report generation
- AI assistant chat functionality

## Prerequisites

- Node.js (v18+)
- Python (v3.9+)
- Groq API key (for AI functionality)

## Setup

1. Clone the repository
2. Install frontend dependencies:
   \`\`\`bash
   npm install
   \`\`\`
3. Install backend dependencies:
   \`\`\`bash
   pip install -r backend/requirements.txt
   \`\`\`
4. Set up your Groq API key:
   \`\`\`bash
   export GROQ_API_KEY=your_api_key_here
   \`\`\`

## Running the Application

To run both the frontend and backend together:

\`\`\`bash
npm run dev
\`\`\`

This will start:
- Next.js frontend on http://localhost:3000
- FastAPI backend on http://localhost:8000

## Project Structure

- `/app` - Next.js frontend pages and components
- `/components` - React components
- `/lib` - Utility functions and API service
- `/backend` - Python FastAPI backend
  - `main.py` - Main FastAPI application
  - `transcription.py` - Audio recording and transcription service
  - `summarization.py` - AI-powered summarization
  - `report_generator.py` - PDF report generation (French)
  - `report_generator_en.py` - PDF report generation (English)
  - `chat.py` - AI assistant chat functionality

## Usage

1. Open http://localhost:3000 in your browser
2. Use the recording tab to record audio or upload audio files
3. View transcriptions in real-time
4. Generate summaries and reports based on transcriptions
5. Chat with the AI assistant for help with audit data

## License

MIT
"# reactproject" 
