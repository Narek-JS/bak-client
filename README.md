# Bak Cameras

A modern React web application for real-time AI-powered camera processing with object detection capabilities.

## Features

- **Landing Page**: Beautiful dark-themed welcome screen with gradient effects
- **Image Upload**: Multi-file upload interface with drag-and-drop support
- **Live Camera Processing**: Real-time video streaming with black & white processing
- **WebSocket Integration**: Real-time communication with backend processing server
- **Responsive Design**: Modern UI built with Tailwind CSS

## Tech Stack

- **Frontend**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS 4
- **Real-time**: WebSocket API
- **Media**: MediaRecorder API + getUserMedia for camera access
- **Canvas**: Real-time video processing and overlay rendering

## Getting Started

1. **Install Dependencies**

   ```bash
   npm install
   ```

2. **Start Development Server**

   ```bash
   npm run dev
   ```

3. **Backend Requirements**
   - Ensure your backend server is running on `http://localhost:8000`
   - WebSocket endpoint: `ws://localhost:8000/ws`
   - Image upload endpoint: `POST http://localhost:8000/images`
   - Configure WebSocket URL in `.env` file: `VITE_WEBSOCKET_URL=ws://localhost:8000/ws`

## Application Flow

1. **Landing Page**: Users see the welcome screen and click "Start Magic"
2. **Image Upload**: Users upload multiple images for processing
3. **Live Processing**: Camera activates and streams real-time video with black & white processing

## Components

- `App.tsx` - Main application state management and routing
- `LandingPage.tsx` - Welcome screen with call-to-action
- `ImageUpload.tsx` - File upload interface with progress states
- `VideoProcessor.tsx` - Camera access and real-time processing

## Development

- **Linting**: `npm run lint`
- **Build**: `npm run build`
- **Preview**: `npm run preview`
- **Testing**: `npm run test`

## Browser Support

- Modern browsers with camera access support
- Camera access permissions required
- WebSocket support needed for real-time features

## API Integration

The application expects a backend server with the following endpoints:

### Image Upload

- **POST** `/images`
- **Content-Type**: `multipart/form-data`
- **Body**: Multiple image files
- **Response**: Success status

### WebSocket

- **URL**: `ws://localhost:8000/ws`
- **Input**: Video chunks (Blob data)
- **Output**: Processed black & white video chunks (binary data)
- **Format**: WebM video chunks with grayscale processing

## Troubleshooting

### Common Issues

1. **WebSocket Connection Failed**

   - Ensure the backend server is running on the correct port
   - Check the `VITE_WEBSOCKET_URL` in your `.env` file
   - Verify firewall settings allow WebSocket connections

2. **Camera Access Denied**

   - Allow camera permissions when prompted by the browser
   - Ensure you're using HTTPS in production (required for camera access)

3. **Binary Message Parsing Errors**

   - The app now properly handles both binary and text WebSocket messages
   - Check browser console for detailed error messages

4. **404 Favicon Error**
   - This is now resolved with the included favicon.ico file
