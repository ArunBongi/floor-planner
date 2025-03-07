import React, { useEffect, useState, useCallback } from 'react';
import './App.css';
import './FloorPlan.css';

// Add API URL constant
const API_URL = 'http://localhost:3001/api';

// Utility functions
const pxToCm = (px) => Math.round(px / 3.78); // 1cm ≈ 3.78px
const cmToPx = (cm) => Math.round(cm * 3.78);

// Debounce function
const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

// Error Boundary Component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-container">
          <h2>Something went wrong.</h2>
          <button onClick={() => window.location.reload()}>
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Loading Spinner Component
const LoadingSpinner = () => (
  <div className="loading-spinner">
    <div className="spinner"></div>
    <p>Loading...</p>
  </div>
);

// Wall component to create proper architectural connections
const Wall = ({ start, end, thickness = 8 }) => {
  const length = Math.sqrt(
    Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2)
  );
  
  const angle = Math.atan2(end.y - start.y, end.x - start.x) * (180 / Math.PI);
  
  return (
    <div
      className="wall"
      style={{
        width: `${length}px`,
        height: `${thickness}px`,
        top: `${start.y - thickness / 2}px`,
        left: `${start.x}px`,
        transformOrigin: 'left center',
        transform: `rotate(${angle}deg)`,
      }}
    />
  );
};

// Enhanced Room component with better visuals
const Room = ({ room, moveRoom, rotateRoom, connectWalls, isSelected, onSelect, updateDoorPosition, doorPositions }) => {
  const [rotation, setRotation] = useState(room.rotation || 0);
  const [touchStartTime, setTouchStartTime] = useState(0);
  const [touchStartPos, setTouchStartPos] = useState({ x: 0, y: 0 });
  
  // Get actual dimensions based on rotation
  const getDimensions = () => {
    const isRotated = rotation === 90 || rotation === 270;
    return {
      width: isRotated ? room.length : room.width,
      height: isRotated ? room.width : room.length
    };
  };
  
  const { width, height } = getDimensions();
  
  // Handle touch events for mobile
  const handleTouchStart = (e) => {
    if (e.target.className === 'rotate-handle') return;
    
    const touch = e.touches[0];
    setTouchStartTime(Date.now());
    setTouchStartPos({ x: touch.clientX, y: touch.clientY });
    
    // Select this room
    onSelect(room.id);
  };
  
  const handleTouchMove = (e) => {
    const touch = e.touches[0];
    const dx = touch.clientX - touchStartPos.x;
    const dy = touch.clientY - touchStartPos.y;
    
    if (Date.now() - touchStartTime > 100) {
      moveRoom(room.id, room.left + dx, room.top + dy);
      setTouchStartPos({ x: touch.clientX, y: touch.clientY });
    }
  };
  
  useEffect(() => {
    // Get the room's corner coordinates
    const corners = [
      { x: room.left, y: room.top }, // top-left
      { x: room.left + width, y: room.top }, // top-right
      { x: room.left + width, y: room.top + height }, // bottom-right
      { x: room.left, y: room.top + height } // bottom-left
    ];
    
    if (connectWalls && rotation === 0) {
      connectWalls(room.id, corners);
    }
  }, [room.left, room.top, width, height, rotation, room.id, connectWalls]);

  return (
    <div
      className={`room ${isSelected ? 'selected' : ''}`}
      data-room-type={room.name}
      style={{
        width: `${width}px`,
        height: `${height}px`,
        top: `${room.top}px`,
        left: `${room.left}px`,
        transform: `rotate(${rotation}deg)`,
        transformOrigin: 'center center',
        backgroundColor: room.color || getRoomColor(room.name)
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onMouseDown={(e) => {
        if (e.target.className === 'rotate-handle') return;
        
        onSelect(room.id);
        
        const startX = e.clientX;
        const startY = e.clientY;
        const initialLeft = room.left;
        const initialTop = room.top;

        // Create move and up listeners
        const onMouseMove = (moveEvent) => {
          const dx = moveEvent.clientX - startX;
          const dy = moveEvent.clientY - startY;
          moveRoom(room.id, initialLeft + dx, initialTop + dy);
        };

        const onMouseUp = () => {
          document.removeEventListener('mousemove', onMouseMove);
          document.removeEventListener('mouseup', onMouseUp);
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
      }}
    >
      <div className="room-label">{room.name}</div>
      <div className="room-dimensions">{pxToCm(room.width)}×{pxToCm(room.length)}cm</div>
      
      <div className="door" style={getDoorPosition(room.name, width, height, rotation, room.id)}>
        <div className="door-swing"></div>
      </div>
      
      {getWindowPosition(room.name, width, height, rotation).map((windowStyle, index) => (
        <div key={`window-${index}`} className="window" style={windowStyle}></div>
      ))}
      
      {getRoomFurniture(room.name, width, height)}
      
      <div 
        className="rotate-handle"
        onTouchStart={(e) => {
          e.stopPropagation();
          const touch = e.touches[0];
          const rect = e.currentTarget.parentElement.getBoundingClientRect();
          const centerX = rect.left + rect.width / 2;
          const centerY = rect.top + rect.height / 2;
          
          const getAngle = (cx, cy, ex, ey) => {
            const dy = ey - cy;
            const dx = ex - cx;
            const rad = Math.atan2(dy, dx);
            return rad * 180 / Math.PI;
          };
          
          const startAngle = getAngle(centerX, centerY, touch.clientX, touch.clientY);
          const initialRotation = rotation;
          
          const handleTouchMove = (moveEvent) => {
            const moveTouch = moveEvent.touches[0];
            const currentAngle = getAngle(centerX, centerY, moveTouch.clientX, moveTouch.clientY);
            let newRotation = initialRotation + (currentAngle - startAngle);
            
            // Snap to 90-degree increments
            newRotation = Math.round(newRotation / 90) * 90;
            if (newRotation < 0) newRotation += 360;
            if (newRotation >= 360) newRotation -= 360;
            
            if (newRotation !== rotation) {
              setRotation(newRotation);
              rotateRoom(room.id, newRotation);
            }
          };
          
          const handleTouchEnd = () => {
            document.removeEventListener('touchmove', handleTouchMove);
            document.removeEventListener('touchend', handleTouchEnd);
          };
          
          document.addEventListener('touchmove', handleTouchMove);
          document.addEventListener('touchend', handleTouchEnd);
        }}
        onMouseDown={(e) => {
          e.stopPropagation();
          
          const rect = e.currentTarget.parentElement.getBoundingClientRect();
          const centerX = rect.left + rect.width / 2;
          const centerY = rect.top + rect.height / 2;
          
          const getAngle = (cx, cy, ex, ey) => {
            const dy = ey - cy;
            const dx = ex - cx;
            const rad = Math.atan2(dy, dx);
            return rad * 180 / Math.PI;
          };
          
          const startAngle = getAngle(centerX, centerY, e.clientX, e.clientY);
          const initialRotation = rotation;
          
          const onMouseMove = (moveEvent) => {
            const currentAngle = getAngle(centerX, centerY, moveEvent.clientX, moveEvent.clientY);
            let newRotation = initialRotation + (currentAngle - startAngle);
            
            // Snap to 90-degree increments
            newRotation = Math.round(newRotation / 90) * 90;
            if (newRotation < 0) newRotation += 360;
            if (newRotation >= 360) newRotation -= 360;
            
            if (newRotation !== rotation) {
              setRotation(newRotation);
              rotateRoom(room.id, newRotation);
            }
          };
          
          const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
          };
          
          document.addEventListener('mousemove', onMouseMove);
          document.addEventListener('mouseup', onMouseUp);
        }}
      >
        <svg viewBox="0 0 24 24" width="24" height="24">
          <path fill="currentColor" d="M7.11 8.53L5.7 7.11C4.8 8.27 4.24 9.61 4.07 11h2.02c.14-.87.49-1.72 1.02-2.47zM6.09 13H4.07c.17 1.39.72 2.73 1.62 3.89l1.41-1.42c-.52-.75-.87-1.59-1.01-2.47zm1.01 5.32c1.16.9 2.51 1.44 3.9 1.61V17.9c-.87-.15-1.71-.49-2.46-1.03L7.1 18.32zM13 4.07V1L8.45 5.55 13 10V6.09c2.84.48 5 2.94 5 5.91s-2.16 5.43-5 5.91v2.02c3.95-.49 7-3.85 7-7.93s-3.05-7.44-7-7.93z"/>
        </svg>
      </div>
      
      {isSelected && (
        <div className="dimension-indicators">
          <div className="dimension-indicator width-indicator">
            <div className="dimension-line"></div>
            <div className="dimension-text">{pxToCm(room.width)}cm</div>
          </div>
          <div className="dimension-indicator height-indicator">
            <div className="dimension-line"></div>
            <div className="dimension-text">{pxToCm(room.length)}cm</div>
          </div>
        </div>
      )}
    </div>
  );
};

// Get appropriate furniture elements based on room type
const getRoomFurniture = (roomType, width, height) => {
  switch (roomType) {
    case 'Living Room':
      return (
        <div className="room-furniture">
          <div className="sofa" style={{left: `${width * 0.1}px`, top: `${height * 0.2}px`, width: `${width * 0.5}px`}}></div>
          <div className="coffee-table" style={{left: `${width * 0.35}px`, top: `${height * 0.5}px`}}></div>
          <div className="tv-stand" style={{left: `${width * 0.7}px`, top: `${height * 0.2}px`}}></div>
        </div>
      );
    case 'Kitchen':
      return (
        <div className="room-furniture">
          <div className="kitchen-counter" style={{left: '10px', bottom: '10px', width: `${width - 20}px`}}></div>
          <div className="kitchen-island" style={{
            left: `${width * 0.35}px`, 
            top: `${height * 0.4}px`, 
            width: `${width * 0.3}px`
          }}></div>
          <div className="fridge" style={{
            right: '15px', 
            top: `${height * 0.3}px` 
          }}></div>
          <div className="stove" style={{
            left: `${width * 0.35}px`, 
            bottom: '15px' 
          }}></div>
        </div>
      );
    case 'Bedroom':
      return (
        <div className="room-furniture">
          <div className="bed" style={{left: `${width * 0.1}px`, top: `${height * 0.3}px`, width: `${width * 0.5}px`}}></div>
          <div className="nightstand" style={{left: `${width * 0.65}px`, top: `${height * 0.3}px`}}></div>
          <div className="wardrobe" style={{left: `${width * 0.1}px`, top: `${height * 0.7}px`, width: `${width * 0.3}px`}}></div>
        </div>
      );
    case 'Bathroom':
      return (
        <div className="room-furniture">
          <div className="toilet" style={{right: '15px', top: '15px'}}></div>
          <div className="sink" style={{right: '15px', top: `${height * 0.4}px`}}></div>
          <div className="shower" style={{left: '15px', top: '15px'}}></div>
          <div className="bathtub" style={{left: '15px', bottom: '15px', width: `${width * 0.6}px`}}></div>
        </div>
      );
    case 'Dining Room':
      return (
        <div className="room-furniture">
          <div className="dining-table" style={{left: `${width * 0.25}px`, top: `${height * 0.25}px`, width: `${width * 0.5}px`}}></div>
          <div className="sideboard" style={{left: '10px', bottom: '10px', width: `${width - 20}px`}}></div>
        </div>
      );
    case 'Office':
      return (
        <div className="room-furniture">
          <div className="desk" style={{right: '15px', top: '15px', width: `${width * 0.4}px`}}></div>
          <div className="office-chair" style={{right: `${width * 0.2}px`, top: `${height * 0.25}px`}}></div>
          <div className="bookshelf" style={{left: '10px', bottom: '10px', width: `${width - 20}px`}}></div>
        </div>
      );
    default:
      return null;
  }
};

// Helper function to get door position based on room type and rotation
const getDoorPosition = (roomType, width, height, rotation, roomId) => {
  const doorWidth = 80;
  const doorThickness = 10;
  let position = { width: `${doorWidth}px`, height: `${doorThickness}px` };
  
  // Get saved door position or use default
  const doorPos =  getDefaultDoorPosition(roomType);
  
  switch (doorPos) {
    case 'left':
      position = {
        ...position,
        left: 0,
        top: `${height / 2 - doorThickness / 2}px`,
        transform: 'rotate(90deg)',
        transformOrigin: 'left center'
      };
      break;
    case 'right':
      position = {
        ...position,
        right: 0,
        top: `${height / 2 - doorThickness / 2}px`,
        transform: 'rotate(90deg)',
        transformOrigin: 'right center'
      };
      break;
    case 'top':
      position = {
        ...position,
        top: 0,
        left: `${width / 2 - doorWidth / 2}px`,
        transform: 'rotate(0deg)',
        transformOrigin: 'center bottom'
      };
      break;
    case 'bottom':
      position = {
        ...position,
        bottom: 0,
        left: `${width / 2 - doorWidth / 2}px`,
        transform: 'rotate(0deg)',
        transformOrigin: 'center top'
      };
  }
  
  if (rotation) {
    const finalRotation = rotation % 360;
    position.transform = `rotate(${finalRotation}deg)`;
  }
  
  return position;
};

// Get default door position based on room type
const getDefaultDoorPosition = (roomType) => {
  switch (roomType) {
    case 'Living Room':
      return 'top'; 
    case 'Kitchen':
      return 'top'; 
    case 'Bedroom':
      return 'right'; 
    case 'Bathroom':
      return 'top'; 
    case 'Dining Room':
      return 'left'; 
    case 'Office':
      return 'left';
    default:
      return 'top';
  }
};

const getWindowPosition = (roomType, width, height, rotation) => {
  const windowWidth = 120;
  const windowHeight = 10;
  let position = { width: `${windowWidth}px`, height: `${windowHeight}px` };
  
  // Default window positions based on room type
  switch (roomType) {
    case 'Living Room':
      // Two windows on the front wall
      return [
        {
          ...position,
          top: '0px',  
          left: '0px', 
          transform: 'rotate(0deg)',
          transformOrigin: 'center center'
        },
        {
        ...position,
        top: '0px',  
        left: `${width - windowWidth}px`, 
        transform: 'rotate(0deg)', 
        transformOrigin: 'center center'
      },
      ];
    case 'Bedroom':
      // One large window on the outer wall 
      return [{
        ...position,
        width: `${windowWidth * 1.2}px`,
        top: '0px',
        left: `${width * 0.3}px`,
        transform: 'rotate(0deg)',
        transformOrigin: 'center center'
      }];
    case 'Kitchen':
      // Window above the counter
      return [{
        ...position,
        bottom: '0px',
        left: `${width * 0.4}px`,
        transform: 'rotate(0deg)',
        transformOrigin: 'center center'
      }];
    case 'Bathroom':
      // Small window high on the wall
      return [{
        ...position,
        width: `${windowWidth * 0.7}px`,
        bottom: '0px',
        left: `${width - windowWidth}px`,
        transform: 'rotate(0deg)',
        transformOrigin: 'center center'
      }];
    case 'Dining Room':
      // Large window for natural light
      return [
        {
          ...position,
          width: `${windowWidth * 1.7}px`,
          top: `${height * 0.5}px`,  
          left: `${width - (windowWidth * 0.92)}px`, 
          transform: 'rotate(90deg)',
          transformOrigin: 'center center'
        }
      ];
    case 'Office':
      // Two windows for good lighting
      return [
        {
          ...position,
          width: `${windowWidth * 0.7}px`,  
          top: '0px',
          left: `${width * 0.25}px`,
          transform: 'rotate(0deg)',
          transformOrigin: 'center center'
        },
        {
          ...position,
          top: `${height * 0.7}px`,  
          left: `${width - (windowWidth * 0.57)}px`, 
          transform: 'rotate(90deg)',
          transformOrigin: 'center center'
        }
      ];
    default:
      return [{
        ...position,
        top: '0px',
        left: `${width * 0.3}px`,
        transform: 'rotate(0deg)',
        transformOrigin: 'center center'
      }];
  }
};

const getRoomColor = (roomType) => {
  switch (roomType) {
    case 'Living Room':
      return 'rgba(230, 236, 245, 0.5)';
    case 'Kitchen':
      return 'rgba(241, 243, 232, 0.5)';
    case 'Bedroom':
      return 'rgba(240, 234, 245, 0.5)';
    case 'Bathroom':
      return 'rgba(226, 240, 245, 0.5)';
    case 'Dining Room':
      return 'rgba(245, 238, 230, 0.5)';
    case 'Office':
      return 'rgba(230, 245, 236, 0.5)';
    default:
      return 'rgba(240, 240, 240, 0.5)';
  }
};

// Memoize room component for better performance
const MemoizedRoom = React.memo(Room, (prevProps, nextProps) => {
  return (
    prevProps.room.id === nextProps.room.id &&
    prevProps.room.left === nextProps.room.left &&
    prevProps.room.top === nextProps.room.top &&
    prevProps.room.rotation === nextProps.room.rotation &&
    prevProps.isSelected === nextProps.isSelected
  );
});

// Main App Component
const App = () => {
  const [loading, setLoading] = useState(true);
  const [rooms, setRooms] = useState([]);
  const [walls, setWalls] = useState([]);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomWidth, setNewRoomWidth] = useState('');
  const [newRoomLength, setNewRoomLength] = useState('');
  const [nextId, setNextId] = useState(1);
  const [roomTemplate, setRoomTemplate] = useState('livingroom');
  const [selectedRoomId, setSelectedRoomId] = useState(null);
  const [scale, setScale] = useState(80); 
  const [doorPositions, setDoorPositions] = useState({});

  // Function to update door position
  const updateDoorPosition = (roomId, position) => {
    setDoorPositions(prev => ({
      ...prev,
      [roomId]: position
    }));
  };

  // Add API integration functions
  const fetchFloorPlan = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/floorplan`);
      const data = await response.json();
      
      if (data.rooms) {
        setRooms(data.rooms.map(room => ({
          ...room,
          id: room._id // Map MongoDB _id to our id field
        })));
        setNextId(Math.max(...data.rooms.map(room => room._id)) + 1);
      }
    } catch (error) {
      console.error('Error fetching floor plan:', error);
      alert('Failed to load floor plan. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const addRoomToServer = async (roomData) => {
    try {
      const response = await fetch(`${API_URL}/rooms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(roomData),
      });
      
      if (!response.ok) {
        throw new Error('Failed to add room');
      }
      
      const savedRoom = await response.json();
      return savedRoom;
    } catch (error) {
      console.error('Error adding room:', error);
      throw error;
    }
  };

  const updateRoomPosition = async (id, left, top) => {
    try {
      const response = await fetch(`${API_URL}/rooms/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ left, top }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update room position');
      }
    } catch (error) {
      console.error('Error updating room position:', error);
    }
  };

  const deleteRoomFromServer = async (id) => {
    try {
      // For rooms that are not yet synced with the server (local only)
      if (typeof id === 'number') {
        setRooms(prevRooms => prevRooms.filter(room => room.id !== id));
        if (selectedRoomId === id) {
          setSelectedRoomId(null);
        }
        return;
      }

      const response = await fetch(`${API_URL}/rooms/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`Failed to delete room: ${response.statusText}`);
      }
      
      // Remove room from local state only after successful server deletion
      setRooms(prevRooms => prevRooms.filter(room => room.id !== id));
      if (selectedRoomId === id) {
        setSelectedRoomId(null);
      }
    } catch (error) {
      console.error('Error deleting room:', error);
      throw error;
    }
  };

  const safeDeleteRoom = async (id) => {
    try {
      if (!id) {
        console.error('Invalid room ID');
        return;
      }
      await deleteRoomFromServer(id);
    } catch (error) {
      console.error('Error deleting room:', error);
      alert('Failed to delete room. Please try again.');
    }
  };

  // Update useEffect to fetch data from backend
  useEffect(() => {
    try {
      const initialRooms = [
        // Living Room as the central space
        { 
          id: 1, 
          name: 'Living Room', 
          width: 400, 
          length: 300, 
          top: 150,
          left: 400, 
          rotation: 0 
        },
        // Kitchen below Living Room
        { 
          id: 2, 
          name: 'Kitchen', 
          width: 280, 
          length: 260, 
          top: 470, 
          left: 400, 
          rotation: 0 
        },
        // Dining Room next to Kitchen
        { 
          id: 3, 
          name: 'Dining Room', 
          width: 260, 
          length: 260, 
          top: 470, 
          left: 700, 
          rotation: 0 
        },
        // Bedroom to the left of Living Room
        { 
          id: 4, 
          name: 'Bedroom', 
          width: 320,
          length: 280, 
          top: 150, 
          left: 60, 
          rotation: 0 
        },
        // Bathroom below Bedroom
        { 
          id: 5, 
          name: 'Bathroom', 
          width: 180,
          length: 220,
          top: 450, 
          left: 200, 
          rotation: 0 
        },
        // Office to the right of Living Room
        { 
          id: 6, 
          name: 'Office', 
          width: 240,
          length: 280,
          top: 150, 
          left: 820, 
          rotation: 0 
        }
      ];
      setRooms(initialRooms);
      setNextId(7);

      // Set initial door positions
      setDoorPositions({
        1: 'top',    // Living Room
        2: 'top',    // Kitchen
        3: 'left',   // Dining Room
        4: 'right',  // Bedroom
        5: 'top',    // Bathroom
        6: 'left',   // Office
      });
    } catch (error) {
      console.error('Error initializing rooms:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Update addRoom function to use backend
  const addRoom = async () => {
    let roomInfo;
    
    if (roomTemplate === 'custom') {
      if (!newRoomName || !newRoomWidth || !newRoomLength) {
        alert('Please fill in all fields');
        return;
      }

      const width = cmToPx(parseInt(newRoomWidth, 10));
      const length = cmToPx(parseInt(newRoomLength, 10));
      
      if (isNaN(width) || isNaN(length) || width < 50 || length < 50) {
        alert('Please enter valid dimensions (minimum 50cm)');
        return;
      }
      
      roomInfo = { name: newRoomName, width, length };
    } else {
      roomInfo = getTemplateRoom(roomTemplate);
    }

    const { top, left } = calculateNextPosition(roomInfo.width, roomInfo.length);
    
    try {
      const savedRoom = await addRoomToServer({
        ...roomInfo,
        top,
        left,
      });

      setRooms([...rooms, { ...savedRoom, id: savedRoom._id }]);
      setNextId(savedRoom._id + 1);
      resetForm();
      setSelectedRoomId(savedRoom._id);
    } catch (error) {
      alert('Failed to add room. Please try again.');
    }
  };

  // Update moveRoom function to use backend
  const moveRoom = async (id, left, top) => {
    const roomToMove = rooms.find(room => room.id === id);
    if (!roomToMove) return;

    const isRotated = (roomToMove.rotation || 0) === 90 || (roomToMove.rotation || 0) === 270;
    const roomWidth = isRotated ? roomToMove.length : roomToMove.width;
    const roomHeight = isRotated ? roomToMove.width : roomToMove.length;
    
    const maxLeft = 1000 - roomWidth;
    const maxTop = 700 - roomHeight;
    
    const newLeft = Math.max(0, Math.min(left, maxLeft));
    const newTop = Math.max(0, Math.min(top, maxTop));

    // Update UI immediately
    setRooms(
      rooms.map(room => 
        room.id === id 
          ? { ...room, left: newLeft, top: newTop } 
          : room
      )
    );

    // Update server
    await updateRoomPosition(id, newLeft, newTop);
  };

  const calculateNextPosition = useCallback((width, length) => {
    const gridSize = 10;
    const maxWidth = 1000;
    
    for (let top = 50; top < 600; top += gridSize) {
      for (let left = 50; left < maxWidth - width; left += gridSize) {
        const hasOverlap = rooms.some(room => {
          const isRotated = (room.rotation || 0) === 90 || (room.rotation || 0) === 270;
          const roomWidth = isRotated ? room.length : room.width;
          const roomHeight = isRotated ? room.width : room.length;
          
          return !(
            left + width < room.left ||
            left > room.left + roomWidth ||
            top + length < room.top ||
            top > room.top + roomHeight
          );
        });
        
        if (!hasOverlap) {
          return { top, left };
        }
      }
    }
    
    // If all positions are taken, stack vertically at the bottom
    const maxBottom = rooms.reduce((max, room) => {
      const isRotated = (room.rotation || 0) === 90 || (room.rotation || 0) === 270;
      const roomHeight = isRotated ? room.width : room.length;
      return Math.max(max, room.top + roomHeight);
    }, 0);
    
    return { top: maxBottom + 20, left: 50 };
  }, [rooms]);

  const resetForm = () => {
    setNewRoomName('');
    setNewRoomWidth('');
    setNewRoomLength('');
    setRoomTemplate('livingroom');
  };

  // Get template room dimensions
  const getTemplateRoom = (template) => {
    switch (template) {
      case 'livingroom':
        return { name: 'Living Room', width: 350, length: 270 };
      case 'kitchen':
        return { name: 'Kitchen', width: 240, length: 320 };
      case 'bedroom':
        return { name: 'Bedroom', width: 300, length: 280 };
      case 'bathroom':
        return { name: 'Bathroom', width: 180, length: 220 };
      case 'diningroom':
        return { name: 'Dining Room', width: 280, length: 220 };
      case 'office':
        return { name: 'Office', width: 220, length: 180 };
      default:
        return { name: newRoomName, width: parseInt(newRoomWidth, 10), length: parseInt(newRoomLength, 10) };
    }
  };

  const rotateRoom = (id, rotation) => {
    setRooms(
      rooms.map(room => 
        room.id === id 
          ? { ...room, rotation } 
          : room
      )
    );
  };

  const deleteRoom = (id) => {
    setRooms(rooms.filter(room => room.id !== id));
    if (selectedRoomId === id) {
      setSelectedRoomId(null);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    addRoom();
  };

  const handleTemplateChange = (e) => {
    const template = e.target.value;
    setRoomTemplate(template);
    
    if (template !== 'custom') {
      const roomInfo = getTemplateRoom(template);
      setNewRoomName(roomInfo.name);
      setNewRoomWidth(pxToCm(roomInfo.width).toString());
      setNewRoomLength(pxToCm(roomInfo.length).toString());
    }
  };

  const exportFloorPlan = () => {
    // Create a canvas element
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Set canvas size to match floor plan size with some padding
    canvas.width = 1200;
    canvas.height = 1000;
    
    // Set white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw each room
    rooms.forEach(room => {
      const isRotated = (room.rotation || 0) === 90 || (room.rotation || 0) === 270;
      const width = isRotated ? room.length : room.width;
      const height = isRotated ? room.width : room.length;
      
      // Save the current context state
      ctx.save();
      
      // Move to room position and apply rotation
      ctx.translate(room.left + width/2, room.top + height/2);
      ctx.rotate((room.rotation || 0) * Math.PI / 180);
      ctx.translate(-width/2, -height/2);
      
      // Draw room outline
      ctx.strokeStyle = '#2c3e50';
      ctx.lineWidth = 2;
      ctx.strokeRect(0, 0, width, height);
      
      // Draw doors with better visibility
      const doorWidth = 80;
      const doorHeight = 15; // Increased thickness for better visibility
      const doorPos = getDefaultDoorPosition(room.name);
      
      ctx.fillStyle = '#34495e';
      ctx.strokeStyle = '#2c3e50';
      ctx.lineWidth = 2;
      
      // Draw door with swing arc
      switch(doorPos) {
        case 'top':
          ctx.fillRect(width/2 - doorWidth/2, 0, doorWidth, doorHeight);
          // Draw door swing arc
          ctx.beginPath();
          ctx.arc(width/2 - doorWidth/2, doorHeight, doorWidth, -Math.PI/2, 0);
          ctx.stroke();
          break;
        case 'bottom':
          ctx.fillRect(width/2 - doorWidth/2, height - doorHeight, doorWidth, doorHeight);
          ctx.beginPath();
          ctx.arc(width/2 - doorWidth/2, height - doorHeight, doorWidth, 0, Math.PI/2);
          ctx.stroke();
          break;
        case 'left':
          ctx.fillRect(0, height/2 - doorWidth/2, doorHeight, doorWidth);
          ctx.beginPath();
          ctx.arc(doorHeight, height/2 - doorWidth/2, doorWidth, Math.PI, 3*Math.PI/2);
          ctx.stroke();
          break;
        case 'right':
          ctx.fillRect(width - doorHeight, height/2 - doorWidth/2, doorHeight, doorWidth);
          ctx.beginPath();
          ctx.arc(width - doorHeight, height/2 - doorWidth/2, doorWidth, -Math.PI/2, 0);
          ctx.stroke();
          break;
      }
      
      // Draw windows with better visibility
      const windows = getWindowPosition(room.name, width, height, room.rotation);
      ctx.fillStyle = '#87CEEB'; // Light blue for windows
      ctx.strokeStyle = '#2c3e50';
      ctx.lineWidth = 2;
      
      windows.forEach(windowStyle => {
        const windowWidth = parseInt(windowStyle.width, 10);
        const windowHeight = parseInt(windowStyle.height, 10);
        const left = parseInt(windowStyle.left, 10) || 0;
        const top = parseInt(windowStyle.top, 10) || 0;
        const bottom = parseInt(windowStyle.bottom, 10);
        
        // Draw window frame
        if (bottom !== undefined) {
          ctx.fillRect(left, height - bottom - windowHeight, windowWidth, windowHeight);
          ctx.strokeRect(left, height - bottom - windowHeight, windowWidth, windowHeight);
          // Add window details
          const y = height - bottom - windowHeight;
          ctx.beginPath();
          ctx.moveTo(left + windowWidth/2, y);
          ctx.lineTo(left + windowWidth/2, y + windowHeight);
          ctx.stroke();
        } else {
          ctx.fillRect(left, top, windowWidth, windowHeight);
          ctx.strokeRect(left, top, windowWidth, windowHeight);
          // Add window details
          ctx.beginPath();
          ctx.moveTo(left + windowWidth/2, top);
          ctx.lineTo(left + windowWidth/2, top + windowHeight);
          ctx.stroke();
        }
      });
      
      // Draw room label
      ctx.fillStyle = '#2c3e50';
      ctx.font = 'bold 16px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(room.name, width/2, height/2);
      
      // Draw dimensions
      ctx.font = '14px Arial';
      ctx.fillText(`${pxToCm(room.width)}×${pxToCm(room.length)}cm`, width/2, height - 30);
      
      // Restore the context state
      ctx.restore();
    });
    
    // Convert canvas to PNG and trigger download
    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = 'floorplan.png';
    link.href = dataUrl;
    link.click();
  };

  // Debounced room movement for better performance
  const debouncedMoveRoom = useCallback(
    debounce((id, left, top) => {
      setRooms(prevRooms =>
        prevRooms.map(room =>
          room.id === id
            ? { ...room, left, top }
            : room
        )
      );
    }, 16), // ~60fps
    []
  );

  // Add window resize handler
  useEffect(() => {
    const handleResize = debounce(() => {
      // Adjust room positions if they're outside viewport
      setRooms(prevRooms =>
        prevRooms.map(room => {
          const maxLeft = window.innerWidth - room.width;
          const maxTop = window.innerHeight - room.length;
          return {
            ...room,
            left: Math.min(Math.max(0, room.left), maxLeft),
            top: Math.min(Math.max(0, room.top), maxTop)
          };
        })
      );
    }, 100);

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Update the floor plan container size
  const floorPlanContainerStyle = {
    flex: 1,
    padding: '40px',
    backgroundColor: '#f5f7fa',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden' // Prevent scrolling in the main area
  };

  return (
    <ErrorBoundary>
      <div className="App">
        {loading ? (
          <LoadingSpinner />
        ) : (
          <>
            <header className="header">
              <div className="logo">
                <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
                <h1>Floor Plan Designer</h1>
              </div>
              
              <div className="view-controls">
                <button className="export-btn" onClick={exportFloorPlan}>
                  Export Plan
                </button>
              </div>
            </header>
            
            <div className="main-content" style={{
              display: 'flex',
              height: 'calc(100vh - 80px)', // Adjust for header height
              overflow: 'hidden' // Prevent overall scrolling
            }}>
              <aside className="sidebar" style={{
                width: '300px',
                overflowY: 'auto', // Enable vertical scrolling for sidebar only
                padding: '20px',
                borderRight: '1px solid #ddd',
                height: '100%'
              }}>
                <div className="control-panel">
                  <h2>Add New Room</h2>
                  <form className="room-form" onSubmit={handleSubmit}>
                    <div className="form-group">
                      <label>Room Type:</label>
                      <select 
                        value={roomTemplate} 
                        onChange={handleTemplateChange}
                        className="template-selector"
                      >
                        <option value="livingroom">Living Room</option>
                        <option value="kitchen">Kitchen</option>
                        <option value="bedroom">Bedroom</option>
                        <option value="bathroom">Bathroom</option>
                        <option value="diningroom">Dining Room</option>
                        <option value="office">Office</option>
                        <option value="custom">Custom Room</option>
                      </select>
                    </div>
                    
                    {roomTemplate === 'custom' && (
                      <div className="form-group">
                        <label>Room Name:</label>
                        <input 
                          type="text" 
                          placeholder="Room Name" 
                          value={newRoomName} 
                          onChange={(e) => setNewRoomName(e.target.value)} 
                          required
                        />
                      </div>
                    )}
                    
                    <div className="form-group dimensions-group">
                      <label>Width (cm):</label>
                      <input 
                        type="number" 
                        placeholder="Width (cm)" 
                        value={newRoomWidth} 
                        onChange={(e) => setNewRoomWidth(e.target.value)} 
                        min="100"
                        max="1000"
                        required
                      />
                    </div>
                    
                    <div className="form-group dimensions-group">
                      <label>Length (cm):</label>
                      <input 
                        type="number" 
                        placeholder="Length (cm)" 
                        value={newRoomLength} 
                        onChange={(e) => setNewRoomLength(e.target.value)} 
                        min="100"
                        max="1000"
                        required
                      />
                    </div>
                    
                    <button type="submit" className="add-button">Add Room</button>
                  </form>
                </div>
                
               
                
                <div className="room-list-panel">
                  <h2>Room List</h2>
                  <ul className="room-list">
                    {rooms.map(room => (
                      <li 
                        key={room.id}
                        className={selectedRoomId === room.id ? 'selected' : ''}
                        onClick={() => setSelectedRoomId(room.id)}
                      >
                        <div className="room-item-info">
                          <span className="room-color" style={{backgroundColor: getRoomColor(room.name)}}></span>
                          <span className="room-name">{room.name}</span>
                          <span className="room-dim">{pxToCm(room.width)}×{pxToCm(room.length)}cm</span>
                        </div>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            safeDeleteRoom(room.id);
                          }}
                          className="delete-button"
                          aria-label="Delete room"
                        >
                          ×
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div className="view-options">
                  <h2>View Options</h2>
                  <div className="form-group">
                    <label>Scale: {scale}%</label>
                    <input 
                      type="range" 
                      min="50" 
                      max="150" 
                      value={scale} 
                      onChange={(e) => setScale(parseInt(e.target.value, 10))}
                      className="scale-slider"
                    />
                  </div>
                  
                </div>
              </aside>

              <div className="floor-plan-container" style={floorPlanContainerStyle}>
                <div 
                  className="floor-plan-canvas" 
                  style={{
                    transform: `scale(${scale / 100})`,
                    transformOrigin: 'center center',
                    minWidth: '1000px',
                    minHeight: '800px',
                    position: 'relative'
                  }}
                >
                  {rooms.map(room => (
                    <MemoizedRoom
                      key={room.id}
                      room={room}
                      moveRoom={debouncedMoveRoom}
                      rotateRoom={rotateRoom}
                      isSelected={selectedRoomId === room.id}
                      onSelect={setSelectedRoomId}
                      updateDoorPosition={updateDoorPosition}
                      doorPositions={doorPositions}
                    />
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </ErrorBoundary>
  );
};

export default App;
