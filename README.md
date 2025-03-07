# Floor Plan Designer

A web application for designing and managing floor plans with interactive room placement, customization, and export capabilities.

## Project Structure

```
floor-planner-assignment/
├── backend/               # Express.js server
│   ├── server.js         # Main server file
│   ├── package.json      # Backend dependencies
│   └── .env             # Environment variables
└── frontend/             # React application
    ├── src/             # Source files
    ├── public/          # Static files
    └── package.json     # Frontend dependencies
```

## Prerequisites

Before you begin, ensure you have the following installed:

- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
- npm (Node Package Manager)

## Backend Setup

1. Navigate to the backend directory:

   ```bash
   cd backend
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Create a `.env` file in the backend directory with the following content:

   ```
   PORT=3001
   MONGODB_URI=mongodb://127.0.0.1:27017/floorplanner
   NODE_ENV=development
   ```

4. Start MongoDB service:

   ```bash
   # On macOS/Linux
   sudo service mongod start

   # On Windows
   net start MongoDB
   ```

5. Start the backend server:

   ```bash
   # Development mode with auto-reload
   npm run dev

   # Production mode
   npm start
   ```

The API server will be running at `http://localhost:3001`.

## Frontend Setup

1. Navigate to the frontend directory:

   ```bash
   cd frontend
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Start the React development server:
   ```bash
   npm start
   ```

The React app will be running at `http://localhost:3000`.

## API Endpoints

The backend provides the following REST API endpoints:

- `GET /api/floorplan` - Get all rooms, doors, and windows
- `POST /api/rooms` - Add a new room
- `PATCH /api/rooms/:id` - Update room position
- `DELETE /api/rooms/:id` - Delete a room

## Features

- Interactive room placement and movement
- Room rotation and resizing
- Door and window placement
- Room templates for quick addition
- Export floor plan as PNG
- Automatic room spacing and overlap prevention
- Responsive design with mobile support

## Development

To work on both frontend and backend simultaneously:

1. Start the MongoDB service
2. Start the backend server (Terminal 1):
   ```bash
   cd backend
   npm run dev
   ```
3. Start the frontend development server (Terminal 2):
   ```bash
   cd frontend
   npm start
   ```

## Troubleshooting

1. If MongoDB fails to connect:

   - Ensure MongoDB service is running
   - Check MongoDB connection string in `.env`
   - Verify MongoDB port is not blocked

2. If frontend fails to connect to backend:

   - Verify backend is running on port 3001
   - Check API_URL constant in frontend code
   - Ensure CORS is properly configured

3. If rooms don't appear:
   - Check browser console for errors
   - Verify database connection
   - Ensure initial room data is properly seeded

## License

This project is licensed under the MIT License - see the LICENSE file for details.
