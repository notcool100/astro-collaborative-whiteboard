'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { whiteboardsApi } from '@/services/api';
import { fabric } from 'fabric';

export default function WhiteboardEditor({ params }: { params: { id: string } }) {
  const router = useRouter();
  const whiteboardId = params.id;
  const { user, logout } = useAuth();
  
  const [whiteboard, setWhiteboard] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState('select');
  const [activeColor, setActiveColor] = useState('#000000');
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [isSaving, setIsSaving] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedObject, setSelectedObject] = useState<fabric.Object | null>(null);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
  
  // Initialize canvas
  useEffect(() => {
    if (canvasRef.current && !fabricCanvasRef.current) {
      const canvas = new fabric.Canvas(canvasRef.current, {
        width: window.innerWidth,
        height: window.innerHeight - 120, // Adjust for header and toolbar
        backgroundColor: '#ffffff',
        selection: true,
        preserveObjectStacking: true,
      });
      
      fabricCanvasRef.current = canvas;
      
      // Handle window resize
      const handleResize = () => {
        canvas.setWidth(window.innerWidth);
        canvas.setHeight(window.innerHeight - 120);
        canvas.renderAll();
      };
      
      window.addEventListener('resize', handleResize);
      
      // Handle object selection
      canvas.on('selection:created', (e) => {
        setSelectedObject(e.selected?.[0] || null);
      });
      
      canvas.on('selection:updated', (e) => {
        setSelectedObject(e.selected?.[0] || null);
      });
      
      canvas.on('selection:cleared', () => {
        setSelectedObject(null);
      });
      
      return () => {
        window.removeEventListener('resize', handleResize);
        canvas.dispose();
        fabricCanvasRef.current = null;
      };
    }
  }, []);
  
  // Fetch whiteboard data
  useEffect(() => {
    const fetchWhiteboard = async () => {
      try {
        setIsLoading(true);
        const response = await whiteboardsApi.getById(whiteboardId);
        setWhiteboard(response.data.data.whiteboard);
        
        // Load whiteboard content if available
        if (response.data.data.version && response.data.data.version.data && fabricCanvasRef.current) {
          fabricCanvasRef.current.loadFromJSON(response.data.data.version.data, () => {
            fabricCanvasRef.current?.renderAll();
          });
        }
      } catch (error) {
        console.error('Error fetching whiteboard:', error);
        setError('Failed to load whiteboard. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };
    
    if (whiteboardId) {
      fetchWhiteboard();
    }
  }, [whiteboardId]);
  
  // Handle tool selection
  const handleToolSelect = (tool: string) => {
    if (!fabricCanvasRef.current) return;
    
    const canvas = fabricCanvasRef.current;
    
    // Disable drawing mode
    canvas.isDrawingMode = false;
    
    // Set active tool
    setActiveTool(tool);
    
    // Configure canvas based on selected tool
    switch (tool) {
      case 'select':
        canvas.selection = true;
        break;
      case 'pen':
        canvas.isDrawingMode = true;
        canvas.freeDrawingBrush.color = activeColor;
        canvas.freeDrawingBrush.width = strokeWidth;
        break;
      case 'rectangle':
      case 'circle':
      case 'line':
      case 'text':
        // These tools will be handled on canvas click
        break;
      default:
        break;
    }
  };
  
  // Handle color change
  const handleColorChange = (color: string) => {
    setActiveColor(color);
    
    if (fabricCanvasRef.current?.isDrawingMode) {
      fabricCanvasRef.current.freeDrawingBrush.color = color;
    }
    
    // Update selected object color if applicable
    if (selectedObject && fabricCanvasRef.current) {
      if (selectedObject.type === 'path') {
        selectedObject.set({ stroke: color });
      } else {
        selectedObject.set({ fill: color });
      }
      fabricCanvasRef.current.renderAll();
    }
  };
  
  // Handle stroke width change
  const handleStrokeWidthChange = (width: number) => {
    setStrokeWidth(width);
    
    if (fabricCanvasRef.current?.isDrawingMode) {
      fabricCanvasRef.current.freeDrawingBrush.width = width;
    }
    
    // Update selected object stroke width if applicable
    if (selectedObject && fabricCanvasRef.current && selectedObject.type === 'path') {
      selectedObject.set({ strokeWidth: width });
      fabricCanvasRef.current.renderAll();
    }
  };
  
  // Handle canvas click for shape creation
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!fabricCanvasRef.current || activeTool === 'select' || activeTool === 'pen') return;
    
    const canvas = fabricCanvasRef.current;
    const pointer = canvas.getPointer(e);
    
    switch (activeTool) {
      case 'rectangle':
        const rect = new fabric.Rect({
          left: pointer.x - 50,
          top: pointer.y - 50,
          width: 100,
          height: 100,
          fill: activeColor,
          stroke: '#000000',
          strokeWidth: 1,
        });
        canvas.add(rect);
        canvas.setActiveObject(rect);
        break;
      case 'circle':
        const circle = new fabric.Circle({
          left: pointer.x - 50,
          top: pointer.y - 50,
          radius: 50,
          fill: activeColor,
          stroke: '#000000',
          strokeWidth: 1,
        });
        canvas.add(circle);
        canvas.setActiveObject(circle);
        break;
      case 'line':
        const line = new fabric.Line([pointer.x - 50, pointer.y, pointer.x + 50, pointer.y], {
          stroke: activeColor,
          strokeWidth: strokeWidth,
        });
        canvas.add(line);
        canvas.setActiveObject(line);
        break;
      case 'text':
        const text = new fabric.Textbox('Text', {
          left: pointer.x,
          top: pointer.y,
          fontFamily: 'Arial',
          fontSize: 20,
          fill: activeColor,
          width: 150,
        });
        canvas.add(text);
        canvas.setActiveObject(text);
        break;
      default:
        break;
    }
    
    // Switch back to select tool after adding a shape
    setActiveTool('select');
  };
  
  // Save whiteboard
  const saveWhiteboard = async () => {
    if (!fabricCanvasRef.current) return;
    
    try {
      setIsSaving(true);
      
      // Generate thumbnail
      const thumbnail = fabricCanvasRef.current.toDataURL({
        format: 'jpeg',
        quality: 0.5,
        multiplier: 0.5,
      });
      
      // Get canvas data
      const canvasData = JSON.stringify(fabricCanvasRef.current.toJSON());
      
      // Save to server
      await whiteboardsApi.saveVersion(whiteboardId, {
        data: canvasData,
        thumbnail,
        metadata: {
          lastSavedBy: user?.id,
          lastSavedAt: new Date().toISOString(),
        },
      });
      
      // Show success message
      alert('Whiteboard saved successfully');
    } catch (error) {
      console.error('Error saving whiteboard:', error);
      alert('Failed to save whiteboard. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };
  
  // Delete selected object
  const deleteSelectedObject = () => {
    if (!fabricCanvasRef.current || !selectedObject) return;
    
    fabricCanvasRef.current.remove(selectedObject);
    setSelectedObject(null);
  };
  
  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!fabricCanvasRef.current) return;
      
      // Delete selected object with Delete key
      if (e.key === 'Delete' && selectedObject) {
        deleteSelectedObject();
      }
      
      // Undo with Ctrl+Z
      if (e.key === 'z' && (e.ctrlKey || e.metaKey)) {
        // Implement undo functionality
      }
      
      // Redo with Ctrl+Y or Ctrl+Shift+Z
      if ((e.key === 'y' && (e.ctrlKey || e.metaKey)) || 
          (e.key === 'z' && (e.ctrlKey || e.metaKey) && e.shiftKey)) {
        // Implement redo functionality
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedObject]);
  
  // Get user initials for avatar
  const getUserInitials = () => {
    if (!user || !user.name) return '?';
    
    const nameParts = user.name.split(' ');
    if (nameParts.length === 1) return nameParts[0].charAt(0).toUpperCase();
    
    return (nameParts[0].charAt(0) + nameParts[nameParts.length - 1].charAt(0)).toUpperCase();
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="bg-white border-b border-border">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center">
            <Link href="/dashboard" className="text-text-secondary hover:text-text flex items-center mr-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
              </svg>
            </Link>
            <h1 className="text-lg font-semibold text-text truncate">
              {isLoading ? 'Loading...' : whiteboard?.name || 'Untitled Whiteboard'}
            </h1>
          </div>
          <div className="flex items-center space-x-2">
            <button 
              className="btn btn-secondary"
              onClick={saveWhiteboard}
              disabled={isLoading || isSaving}
            >
              {isSaving ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </span>
              ) : (
                <span className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M7.707 10.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V6h5a2 2 0 012 2v7a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2h5v5.586l-1.293-1.293zM9 4a1 1 0 012 0v2H9V4z" />
                  </svg>
                  Save
                </span>
              )}
            </button>
            <button 
              className="btn btn-secondary"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M5 3a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2V5a2 2 0 00-2-2H5zm0 2h10v10H5V5z" />
              </svg>
            </button>
            <div className="relative group">
              <button className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center">
                  <span className="text-sm font-medium">{getUserInitials()}</span>
                </div>
              </button>
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10 hidden group-hover:block">
                <Link href="/settings/profile" className="block px-4 py-2 text-sm text-text-secondary hover:bg-background">
                  Profile Settings
                </Link>
                <button 
                  onClick={logout}
                  className="block w-full text-left px-4 py-2 text-sm text-text-secondary hover:bg-background"
                >
                  Sign out
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Toolbar */}
      <div className="bg-white border-b border-border p-2 flex justify-center">
        <div className="flex bg-background rounded-lg shadow-sm border border-border p-1 space-x-1">
          <button 
            className={`toolbar-btn ${activeTool === 'select' ? 'bg-primary text-white' : ''}`}
            onClick={() => handleToolSelect('select')}
            title="Select (V)"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M6.672 1.911a1 1 0 10-1.932.518l.259.966a1 1 0 001.932-.518l-.26-.966zM2.429 4.74a1 1 0 10-.517 1.932l.966.259a1 1 0 00.517-1.932l-.966-.26zm8.814-.569a1 1 0 00-1.415-1.414l-.707.707a1 1 0 101.415 1.415l.707-.708zm-7.071 7.072l.707-.707A1 1 0 003.465 9.12l-.708.707a1 1 0 001.415 1.415zm3.2-5.171a1 1 0 00-1.3 1.3l4 10a1 1 0 001.823.075l1.38-2.759 3.018 3.02a1 1 0 001.414-1.415l-3.019-3.02 2.76-1.379a1 1 0 00-.076-1.822l-10-4z" clipRule="evenodd" />
            </svg>
          </button>
          <button 
            className={`toolbar-btn ${activeTool === 'pen' ? 'bg-primary text-white' : ''}`}
            onClick={() => handleToolSelect('pen')}
            title="Pen (P)"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
            </svg>
          </button>
          <button 
            className={`toolbar-btn ${activeTool === 'rectangle' ? 'bg-primary text-white' : ''}`}
            onClick={() => handleToolSelect('rectangle')}
            title="Rectangle (R)"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5 4a3 3 0 00-3 3v6a3 3 0 003 3h10a3 3 0 003-3V7a3 3 0 00-3-3H5zm-1 9v-1h5v2H5a1 1 0 01-1-1zm7 1h4a1 1 0 001-1v-1h-5v2zm0-4h5V8h-5v2zM9 8H4v2h5V8z" clipRule="evenodd" />
            </svg>
          </button>
          <button 
            className={`toolbar-btn ${activeTool === 'circle' ? 'bg-primary text-white' : ''}`}
            onClick={() => handleToolSelect('circle')}
            title="Circle (C)"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
            </svg>
          </button>
          <button 
            className={`toolbar-btn ${activeTool === 'line' ? 'bg-primary text-white' : ''}`}
            onClick={() => handleToolSelect('line')}
            title="Line (L)"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
            </svg>
          </button>
          <button 
            className={`toolbar-btn ${activeTool === 'text' ? 'bg-primary text-white' : ''}`}
            onClick={() => handleToolSelect('text')}
            title="Text (T)"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 5v8a2 2 0 01-2 2h-5l-5 4v-4H4a2 2 0 01-2-2V5a2 2 0 012-2h12a2 2 0 012 2zM7 8H5v2h2V8zm2 0h2v2H9V8zm6 0h-2v2h2V8z" clipRule="evenodd" />
            </svg>
          </button>
          <div className="border-l border-border mx-1"></div>
          <div className="flex items-center space-x-1">
            <button 
              className={`w-6 h-6 rounded-full border-2 ${activeColor === '#000000' ? 'border-primary' : 'border-transparent'}`}
              style={{ backgroundColor: '#000000' }}
              onClick={() => handleColorChange('#000000')}
              title="Black"
            ></button>
            <button 
              className={`w-6 h-6 rounded-full border-2 ${activeColor === '#FF0000' ? 'border-primary' : 'border-transparent'}`}
              style={{ backgroundColor: '#FF0000' }}
              onClick={() => handleColorChange('#FF0000')}
              title="Red"
            ></button>
            <button 
              className={`w-6 h-6 rounded-full border-2 ${activeColor === '#00FF00' ? 'border-primary' : 'border-transparent'}`}
              style={{ backgroundColor: '#00FF00' }}
              onClick={() => handleColorChange('#00FF00')}
              title="Green"
            ></button>
            <button 
              className={`w-6 h-6 rounded-full border-2 ${activeColor === '#0000FF' ? 'border-primary' : 'border-transparent'}`}
              style={{ backgroundColor: '#0000FF' }}
              onClick={() => handleColorChange('#0000FF')}
              title="Blue"
            ></button>
          </div>
          <div className="border-l border-border mx-1"></div>
          <div className="flex items-center space-x-1">
            <button 
              className={`toolbar-btn ${strokeWidth === 1 ? 'bg-primary text-white' : ''}`}
              onClick={() => handleStrokeWidthChange(1)}
              title="Thin"
            >
              <div className="w-4 h-1 bg-current rounded-full"></div>
            </button>
            <button 
              className={`toolbar-btn ${strokeWidth === 3 ? 'bg-primary text-white' : ''}`}
              onClick={() => handleStrokeWidthChange(3)}
              title="Medium"
            >
              <div className="w-4 h-2 bg-current rounded-full"></div>
            </button>
            <button 
              className={`toolbar-btn ${strokeWidth === 5 ? 'bg-primary text-white' : ''}`}
              onClick={() => handleStrokeWidthChange(5)}
              title="Thick"
            >
              <div className="w-4 h-3 bg-current rounded-full"></div>
            </button>
          </div>
          <div className="border-l border-border mx-1"></div>
          <button 
            className="toolbar-btn"
            onClick={deleteSelectedObject}
            disabled={!selectedObject}
            title="Delete (Del)"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 relative overflow-hidden">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-80 z-10">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          </div>
        )}
        <canvas 
          ref={canvasRef} 
          className="absolute inset-0"
          onClick={handleCanvasClick}
        ></canvas>
      </div>

      {/* Properties Sidebar */}
      {isSidebarOpen && (
        <div className="absolute top-0 right-0 h-full w-64 bg-white border-l border-border shadow-lg z-20 p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold">Properties</h3>
            <button 
              onClick={() => setIsSidebarOpen(false)}
              className="text-text-secondary hover:text-text"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
          
          {selectedObject ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Type</label>
                <div className="text-sm">{selectedObject.type}</div>
              </div>
              
              {selectedObject.type !== 'path' && (
                <div>
                  <label className="block text-sm font-medium mb-1">Fill Color</label>
                  <div className="flex flex-wrap gap-2">
                    {['#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF', '#FFFFFF'].map((color) => (
                      <button 
                        key={color}
                        className={`w-6 h-6 rounded-full border ${color === '#FFFFFF' ? 'border-gray-300' : 'border-transparent'}`}
                        style={{ backgroundColor: color }}
                        onClick={() => {
                          if (selectedObject && fabricCanvasRef.current) {
                            selectedObject.set({ fill: color });
                            fabricCanvasRef.current.renderAll();
                          }
                        }}
                      ></button>
                    ))}
                  </div>
                </div>
              )}
              
              {(selectedObject.type === 'path' || selectedObject.type === 'line') && (
                <div>
                  <label className="block text-sm font-medium mb-1">Stroke Color</label>
                  <div className="flex flex-wrap gap-2">
                    {['#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF', '#FFFFFF'].map((color) => (
                      <button 
                        key={color}
                        className={`w-6 h-6 rounded-full border ${color === '#FFFFFF' ? 'border-gray-300' : 'border-transparent'}`}
                        style={{ backgroundColor: color }}
                        onClick={() => {
                          if (selectedObject && fabricCanvasRef.current) {
                            selectedObject.set({ stroke: color });
                            fabricCanvasRef.current.renderAll();
                          }
                        }}
                      ></button>
                    ))}
                  </div>
                </div>
              )}
              
              {(selectedObject.type === 'path' || selectedObject.type === 'line') && (
                <div>
                  <label className="block text-sm font-medium mb-1">Stroke Width</label>
                  <div className="flex items-center space-x-2">
                    <input 
                      type="range" 
                      min="1" 
                      max="20" 
                      value={selectedObject.strokeWidth || 1}
                      onChange={(e) => {
                        if (selectedObject && fabricCanvasRef.current) {
                          selectedObject.set({ strokeWidth: parseInt(e.target.value) });
                          fabricCanvasRef.current.renderAll();
                        }
                      }}
                      className="w-full"
                    />
                    <span className="text-sm">{selectedObject.strokeWidth || 1}</span>
                  </div>
                </div>
              )}
              
              <div className="pt-4 border-t border-border">
                <button 
                  className="btn btn-secondary w-full"
                  onClick={deleteSelectedObject}
                >
                  Delete
                </button>
              </div>
            </div>
          ) : (
            <div className="text-text-secondary text-sm">
              Select an object to edit its properties
            </div>
          )}
        </div>
      )}

      {/* Bottom Bar */}
      <div className="bg-white border-t border-border p-2 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <button className="btn btn-icon">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 0l-2 2a1 1 0 101.414 1.414L8 10.414l1.293 1.293a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </button>
          <span className="text-sm text-text-secondary">100%</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="text-sm text-text-secondary">
            {whiteboard ? `Last edited ${new Date(whiteboard.updated_at).toLocaleString()}` : ''}
          </div>
        </div>
      </div>
    </div>
  );
}