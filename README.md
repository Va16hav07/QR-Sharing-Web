# QR File Sharing Web Application

A simple web application that allows users to upload files and generate QR codes for easy sharing. Recipients can download the files by scanning the QR code or using the provided link.

## Features

- Drag and drop file upload interface
- QR code generation for file sharing
- Copy-to-clipboard functionality for download links
- Web Share API integration (when available)
- Responsive design for mobile and desktop
- File size limits and validation

## Installation

1. Clone this repository or download the files
2. Install dependencies:

```bash
npm install
```

3. Start the server:

```bash
npm start
```

4. For development with auto-reload:

```bash
npm install nodemon -g  # If nodemon is not installed
npm run dev
```

## Usage

1. Open your browser and navigate to `http://localhost:3000`
2. Drag and drop a file or click to select a file
3. Click the "Upload File" button
4. Once uploaded, you'll see a QR code and a download link
5. Share the QR code or the link with others to provide access to the file
6. Recipients can scan the QR code or visit the link to download the file

## Technical Details

- Backend: Node.js with Express
- Frontend: HTML, CSS, JavaScript
- Database: MongoDB for persistent storage
- File handling: Multer for file uploads
- QR code generation: qrcode library
- Templating engine: EJS

## Deployment on Render

This application is configured for easy deployment on Render.

1. Create an account on [Render](https://render.com/)
2. Connect your GitHub repository
3. Create a new Web Service and select your repository
4. Use the following settings:
   - Build Command: `npm install`
   - Start Command: `node server.js`
5. Add the following environment variables:
   - `MONGODB_URI`: Your MongoDB connection string (e.g., `mongodb+srv://username:password@cluster.mongodb.net/dbname`)
   - `NODE_ENV`: `production`
   - `FILE_EXPIRY_DAYS`: `7` (or your preferred expiration period)
   - `MAX_FILE_SIZE`: `52428800` (50MB in bytes)
   - `SESSION_SECRET`: A random string for session security
6. Deploy the application

Alternatively, you can use the provided `render.yaml` file for Blueprint deployment:

1. Fork this repository
2. Add your MongoDB connection string to Render environment variables
3. Use the Render Blueprint feature to deploy from the YAML configuration

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```
MONGODB_URI=your_mongodb_connection_string
PORT=3000
NODE_ENV=development
FILE_EXPIRY_DAYS=7
MAX_FILE_SIZE=52428800
SESSION_SECRET=your_secret_key
```

## License

ISC

## Author

Created on: June 8, 2025
