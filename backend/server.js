const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// MongoDB Connection
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/floorplanner';

// Error handling middleware
const errorHandler = (err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
};

// Input validation middleware
const validateRoomInput = (req, res, next) => {
  const { name, width, length, top, left } = req.body;
  
  if (!name || typeof name !== 'string') {
    return res.status(400).json({ error: 'Invalid room name' });
  }
  
  if (!width || !length || width <= 0 || length <= 0) {
    return res.status(400).json({ error: 'Invalid room dimensions' });
  }
  
  if (typeof top !== 'number' || typeof left !== 'number') {
    return res.status(400).json({ error: 'Invalid room position' });
  }
  
  next();
};

const connectDB = async () => {
  try {
    await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log('Connected to MongoDB');
  } catch (err) {
    console.error('MongoDB Connection Error:', err);
    process.exit(1);
  }
};

// Define schemas with improved structure
const roomSchema = new mongoose.Schema({
  name: { type: String, required: true },
  width: { type: Number, required: true },
  length: { type: Number, required: true },
  top: { type: Number, default: 50 },
  left: { type: Number, default: 50 },
});

const doorSchema = new mongoose.Schema({
  room: { type: String },
  top: { type: Number, required: true },
  left: { type: Number, required: true },
  rotation: { type: Number, default: 0 },
});

const windowSchema = new mongoose.Schema({
  room: { type: String },
  top: { type: Number, required: true },
  left: { type: Number, required: true },
  rotation: { type: Number, default: 0 },
});

// Define models
const Room = mongoose.model('Room', roomSchema);
const Door = mongoose.model('Door', doorSchema);
const Window = mongoose.model('Window', windowSchema);

// Seed database with initial data
const seedDatabase = async () => {
  try {
    // Check if data already exists
    const roomCount = await Room.countDocuments();
    
    if (roomCount === 0) {
      console.log('Seeding database with initial data...');
      
      // Rooms with unique positions
      await Room.insertMany([
        { name: 'Living Room', width: 400, length: 300, top: 50, left: 50 },
        { name: 'Kitchen', width: 300, length: 200, top: 400, left: 50 },
        { name: 'Bedroom', width: 300, length: 300, top: 50, left: 500 },
      ]);
      
      // Doors with positions relative to rooms
      await Door.insertMany([
        { room: 'Living Room', top: 150, left: 420 },
        { room: 'Kitchen', top: 450, left: 320 },
      ]);
      
      // Windows with positions relative to rooms
      await Window.insertMany([
        { room: 'Living Room', top: 80, left: 200 },
        { room: 'Bedroom', top: 80, left: 600 },
      ]);
      
      console.log('Database seeded successfully!');
    } else {
      console.log('Database already has data, skipping seed operation');
    }
  } catch (error) {
    console.error('Error seeding database:', error);
  }
};

// API endpoints with validation
app.get('/api/floorplan', async (req, res, next) => {
  try {
    const rooms = await Room.find({});
    const doors = await Door.find({});
    const windows = await Window.find({});

    res.json({ rooms, doors, windows });
  } catch (err) {
    next(err);
  }
});

app.post('/api/rooms', validateRoomInput, async (req, res, next) => {
  try {
    const { name, width, length, top, left } = req.body;
    const newRoom = new Room({ name, width, length, top, left });
    const savedRoom = await newRoom.save();
    res.status(201).json(savedRoom);
  } catch (err) {
    next(err);
  }
});

app.patch('/api/rooms/:id', validateRoomInput, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { top, left } = req.body;
    const updatedRoom = await Room.findByIdAndUpdate(
      id, 
      { top, left }, 
      { new: true }
    );
    if (!updatedRoom) {
      return res.status(404).json({ error: 'Room not found' });
    }
    res.json(updatedRoom);
  } catch (err) {
    next(err);
  }
});

app.delete('/api/rooms/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const deletedRoom = await Room.findByIdAndDelete(id);
    if (!deletedRoom) {
      return res.status(404).json({ error: 'Room not found' });
    }
    res.status(200).json({ message: 'Room deleted successfully' });
  } catch (err) {
    next(err);
  }
});

// Apply error handling middleware
app.use(errorHandler);

// Start server
const startServer = async () => {
  await connectDB();
  await seedDatabase();

  app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
    console.log(`API available at http://localhost:${port}/api/floorplan`);
  });
};

startServer();