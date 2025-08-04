# File Management System

A comprehensive file management system with Supabase backend and React frontend, designed for organizing files by categories with hierarchical date-based storage (category → year → month → date).

## Features

- **File Upload**: Upload files with category and date organization
- **File Browser**: Navigate through categories and dates with a tree structure
- **File Management**: View, download, and delete files
- **Category-based Organization**: Organize files by medical categories (neonatal, pediatric, etc.)
- **Date-based Storage**: Automatic organization by year/month/date
- **Supabase Integration**: Secure database storage with Row Level Security
- **Modern UI**: Built with React, TypeScript, and Tailwind CSS

## Project Structure

```
filemanagementsystem/
├── frontend/                 # React frontend application
│   ├── src/
│   │   ├── components/       # React components
│   │   ├── lib/             # API and utilities
│   │   └── pages/           # Page components
│   ├── public/              # Static assets
│   └── package.json         # Frontend dependencies
├── backend/                 # Node.js backend with Supabase
│   ├── server.js           # Express server
│   ├── supabase-schema.sql # Database schema
│   ├── config.env          # Environment variables
│   └── package.json        # Backend dependencies
└── README.md               # This file
```

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Supabase account and project

## Setup Instructions

### 1. Supabase Setup

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Go to your project's SQL Editor
3. Copy and paste the contents of `backend/supabase-schema.sql` into the SQL Editor
4. Execute the SQL to create the database schema
5. Note down your project URL and API keys from Settings > API

### 2. Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   - Copy `config.env` and update with your Supabase credentials:
   ```env
   SUPABASE_URL=your_supabase_project_url
   SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   PORT=5000
   ```

4. Start the backend server:
   ```bash
   npm run dev
   ```

   The backend will be running on `http://localhost:5000`

### 3. Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

   The frontend will be running on `http://localhost:5173`

## Usage

### File Upload

1. Navigate to the "Upload Files" tab
2. Select a file to upload
3. Choose a category (e.g., neonatal, pediatric, etc.)
4. Select the year, month, and date for organization
5. Add an optional description
6. Click "Upload File"

### File Browser

1. Navigate to the "Browse Files" tab
2. Use the file structure tree on the left to navigate:
   - Click on categories to expand/collapse
   - Click on years to see months
   - Click on months to see dates
   - Click on dates to view files
3. View file details and perform actions:
   - View file information
   - Download files
   - Delete files

## API Endpoints

### Backend API (http://localhost:5000/api)

- `GET /categories` - Get all categories
- `GET /files/:category/:year/:month/:date` - Get files by date
- `POST /upload` - Upload a new file
- `GET /structure` - Get file structure hierarchy
- `DELETE /files/:id` - Delete a file
- `GET /health` - Health check

## Database Schema

### Categories Table
- `id` - Primary key
- `name` - Category name (unique)
- `description` - Category description
- `created_at` - Creation timestamp
- `updated_at` - Update timestamp

### Files Table
- `id` - Primary key
- `filename` - Original filename
- `filepath` - Server file path
- `category` - File category
- `year` - Year (YYYY)
- `month` - Month (MM)
- `date` - Date (DD)
- `description` - File description
- `filesize` - File size in bytes
- `mimetype` - File MIME type
- `created_at` - Creation timestamp
- `updated_at` - Update timestamp

## Security Features

- Row Level Security (RLS) enabled on all tables
- Authentication-based access control
- Secure file upload handling
- Input validation and sanitization

## Development

### Backend Development

```bash
cd backend
npm run dev  # Start with nodemon for auto-reload
```

### Frontend Development

```bash
cd frontend
npm run dev  # Start Vite development server
```

### Building for Production

```bash
# Frontend
cd frontend
npm run build

# Backend
cd backend
npm start
```

## Troubleshooting

### Common Issues

1. **CORS Errors**: Ensure the backend is running on port 5000 and frontend on port 5173
2. **Supabase Connection**: Verify your environment variables are correctly set
3. **File Upload Issues**: Check that the uploads directory exists and has write permissions
4. **Database Errors**: Ensure the Supabase schema has been properly executed

### Logs

- Backend logs are displayed in the terminal where you run `npm run dev`
- Frontend errors are shown in the browser console
- Supabase logs can be viewed in the Supabase dashboard

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License. 