import React, { useState, useRef } from 'react'
import { Html } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import { Plane, Vector3, Vector2, Euler } from 'three'
import { GRID } from '../constants/grid.ts'

interface GridPosition {
  x: number
  y: number
  z: number
}

interface GridDimensions {
  width: number
  height: number
}

interface AnchorPoint {
  x: number  // -1 = left, 0 = center, 1 = right
  y: number  // -1 = top, 0 = center, 1 = bottom
}

interface MessageBubbleProps {
  initialGridPosition: {
    x: number;
    y: number;
    z: number;
  };
  initialGridSize: {
    width: number;
    height: number;
  };
  onFocus?: () => void;
  onBlur?: () => void;
}

const styles = {
  messageBubbleContainer: (width: number, height: number) => ({
    width: `${width}px`,
    height: `${height}px`,
    background: '#1f1f1f',
    borderRadius: '8px',
    color: 'white',
    fontSize: '15px',
    boxShadow: '0 2px 12px rgba(0,0,0,0.4)',
    border: '1.5px solid #313131',
    userSelect: 'none' as const,
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    pointerEvents: 'auto' as const,
  }),

  innerContainer: {
    width: '100%', 
    height: '100%',
    position: 'relative' as const,
  },

  messageTextArea: {
    width: '100%',
    height: '100%',
    background: 'transparent',
    border: 'none',
    outline: 'none',
    color: 'white',
    padding: '12px',
    resize: 'none',
    whiteSpace: 'pre-wrap',
    wordWrap: 'break-word',
    overflowWrap: 'break-word' as const,
    overflow: 'auto',
    maxHeight: '100%',
    boxSizing: 'border-box' as const,
    wordBreak: 'break-all',
    cursor: 'text',
    pointerEvents: 'auto' as const,
    position: 'relative' as const,
    zIndex: 1,
  },

  resizeHandlesContainer: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none' as const,
  },

  resizeHandle: {
    position: 'absolute' as const,
    width: '24px',
    height: '24px',
    cursor: 'nw-resize',
    zIndex: 1000,
    pointerEvents: 'auto' as const,
    '& .corner-handle:hover .handle-path': {
      stroke: '#ffffff',
    },
    '& .handle-path': {
      stroke: '#666666',
      transition: 'stroke 0.1s ease-out',
    }
  },

  cornerPositions: {
    tl: { top: '-12px', left: '-12px' },
    tr: { top: '-12px', right: '-12px' },
    bl: { bottom: '-12px', left: '-12px' },
    br: { bottom: '-12px', right: '-12px' },
  },
}

type Corner = 'tl' | 'tr' | 'bl' | 'br'

const snapToGrid = (value: number): number => {
  return Math.round(value / GRID.SECTION_SIZE) * GRID.SECTION_SIZE
}

const getAnchorForCorner = (corner: Corner): AnchorPoint => {
  switch(corner) {
    case 'br':
      return { x: -1, y: -1 } // anchor top-left when dragging bottom-right
    case 'bl':
      return { x: 1, y: -1 }  // anchor top-right when dragging bottom-left
    case 'tr':
      return { x: -1, y: 1 }  // anchor bottom-left when dragging top-right
    case 'tl':
      return { x: 1, y: 1 }   // anchor bottom-right when dragging top-left
    default:
      return { x: 0, y: 0 }   // center by default
  }
}

const CornerHandle = React.memo(({ corner, isHovered }: { corner: Corner, isHovered: boolean }) => {
  const rotation = {
    tl: '270',
    tr: '0',
    br: '90',
    bl: '180'
  }[corner]

  return (
    <svg 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      style={{ 
        transform: `rotate(${rotation}deg)`,
        opacity: 0.8,
      }}
    >
      <path
        d="M 4 4 A 15 15 0 0 1 20 20"
        stroke={isHovered ? "#ffffff" : "#666666"}
        strokeWidth="8"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  )
})

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  initialGridPosition = { x: 0, y: 0, z: 0 },
  initialGridSize = { width: GRID.SECTION_SIZE, height: GRID.SECTION_SIZE },
  onFocus,
  onBlur
}) => {
  const { camera, raycaster } = useThree()
  const mouseVector = useRef(new Vector2())
  const [gridPosition, setGridPosition] = useState<GridPosition>(initialGridPosition)
  const [gridDimensions, setGridDimensions] = useState<GridDimensions>(initialGridSize)
  const [activeCorner, setActiveCorner] = useState<Corner | null>(null)
  const [isTextAreaFocused, setIsTextAreaFocused] = useState(false)

  // Convert grid units to world space with offset
  const worldPosition = [
    (gridPosition.x * GRID.UNIT_SIZE),
    -0.05,
    (gridPosition.z * GRID.UNIT_SIZE),
  ] as [number, number, number]

  // Convert grid units to visual pixels for HTML
  const visualDimensions = {
    width: (gridDimensions.width * GRID.VISUAL_MULTIPLIER) - 8, // 10px margin
    height: gridDimensions.height * GRID.VISUAL_MULTIPLIER - 8
  }

  const handleResizeStart = (e: React.MouseEvent, corner: Corner) => {
    e.stopPropagation()
    e.preventDefault()
    setActiveCorner(corner)
    
    const startGridPosition = { ...gridPosition }
    const startGridDimensions = { ...gridDimensions }
    
    // Store initial world position
    let startWorldX = 0
    let startWorldZ = 0
    let initialized = false

    const handleMouseMove = (e: MouseEvent) => {
      mouseVector.current.set(
        (e.clientX / window.innerWidth) * 2 - 1,
        -(e.clientY / window.innerHeight) * 2 + 1
      )
      
      raycaster.setFromCamera(mouseVector.current, camera)
      const gridPlane = new Plane(new Vector3(0, 1, 0))
      const intersection = new Vector3()
      
      if (raycaster.ray.intersectPlane(gridPlane, intersection)) {
        const worldX = intersection.x
        const worldZ = intersection.z

        // Initialize start position if this is the first move
        if (!initialized) {
          startWorldX = worldX
          startWorldZ = worldZ
          initialized = true
          return
        }

        // Calculate total delta from start position in world units
        const totalDeltaX = worldX - startWorldX
        const totalDeltaZ = worldZ - startWorldZ

        console.log(
          `Current World Position: (${gridPosition.x}, ${gridPosition.z})`
        )

        let newWidth = startGridDimensions.width
        let newHeight = startGridDimensions.height
        let newPosition = { ...startGridPosition }

        switch(corner) {
          case 'br':
            newWidth = snapToGrid(startGridDimensions.width + totalDeltaX)
            newHeight = snapToGrid(startGridDimensions.height + totalDeltaZ)
            newPosition.x = Math.max(0, startGridPosition.x + snapToGrid(totalDeltaX) / 2)
            newPosition.z = Math.max(0, startGridPosition.z + snapToGrid(totalDeltaZ) / 2)
            break
            
          case 'bl':
            newWidth = snapToGrid(startGridDimensions.width - totalDeltaX)
            newHeight = snapToGrid(startGridDimensions.height + totalDeltaZ)
            newPosition.x = Math.min(0, startGridPosition.x + snapToGrid(totalDeltaX) / 2)
            newPosition.z = Math.max(0, startGridPosition.z + snapToGrid(totalDeltaZ) / 2)
            break
            
          case 'tr':
            newWidth = snapToGrid(startGridDimensions.width + totalDeltaX)
            newHeight = snapToGrid(startGridDimensions.height - totalDeltaZ)
            newPosition.x = Math.max(0, startGridPosition.x + snapToGrid(totalDeltaX) / 2)
            newPosition.z = Math.min(0, startGridPosition.z + snapToGrid(totalDeltaZ) / 2)
            break
            
          case 'tl':
            newWidth = snapToGrid(startGridDimensions.width - totalDeltaX)
            newHeight = snapToGrid(startGridDimensions.height - totalDeltaZ)
            newPosition.x = Math.min(0, startGridPosition.x + snapToGrid(totalDeltaX) / 2)
            newPosition.z = Math.min(0, startGridPosition.z + snapToGrid(totalDeltaZ) / 2)
            break
        }

        // Apply size constraints
        newWidth = Math.max(GRID.MIN_MESSAGE_SIZE, Math.min(GRID.MAX_MESSAGE_SIZE, newWidth))
        newHeight = Math.max(GRID.MIN_MESSAGE_SIZE, Math.min(GRID.MAX_MESSAGE_SIZE, newHeight))

        // Update state if there are actual changes
        if (newWidth !== gridDimensions.width || 
            newHeight !== gridDimensions.height ||
            newPosition.x !== gridPosition.x ||
            newPosition.z !== gridPosition.z) {
          setGridDimensions({ width: newWidth, height: newHeight })
          setGridPosition(newPosition)
        }
      }
    }

    const handleMouseUp = () => {
      setActiveCorner(null)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  const ResizeHandle = ({ corner }: { corner: Corner }) => {
    const [isHovered, setIsHovered] = useState(false)
    
    return (
      <div
        style={{
          ...styles.resizeHandle,
          ...styles.cornerPositions[corner],
          display: isTextAreaFocused ? 'block' : 'none',
        }}
        onMouseDown={(e) => handleResizeStart(e, corner)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <CornerHandle corner={corner} isHovered={isHovered} />
      </div>
    )
  }

  const anchor = activeCorner ? getAnchorForCorner(activeCorner) : { x: 0, y: 0 }

  return (
    <>
      <Html
        transform
        distanceFactor={14}
        position={worldPosition}
        rotation={new Euler(-Math.PI / 2, 0, 0)}
        center={false}
        style={{
          ...styles.messageBubbleContainer(visualDimensions.width, visualDimensions.height),
          transformOrigin: `${anchor.x === -1 ? '0' : anchor.x === 1 ? '100%' : '50%'} ${anchor.y === -1 ? '0' : anchor.y === 1 ? '100%' : '50%'}`,
        }}
      >
        <div style={styles.innerContainer}>
          <textarea 
            placeholder="Write..." 
            style={styles.messageTextArea as any}
            onFocus={() => {
              setIsTextAreaFocused(true);
              onFocus?.();
              console.log('MessageBubble focused');
            }}
            onBlur={() => {
              if (!activeCorner) {
                setIsTextAreaFocused(false);
                onBlur?.();
                console.log('MessageBubble blurred');
              }
            }}
          />
          <div style={styles.resizeHandlesContainer}>
            <ResizeHandle corner="tl" />
            <ResizeHandle corner="tr" />
            <ResizeHandle corner="bl" />
            <ResizeHandle corner="br" />
          </div>
        </div>
      </Html>
    </>
  )
}