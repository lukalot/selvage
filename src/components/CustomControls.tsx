import { useThree, useFrame } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import * as THREE from 'three'

interface CustomControlsProps {
  onEnterPress?: () => void;
}

export function CustomControls({ onEnterPress }: CustomControlsProps) {
  const { camera, gl } = useThree()
  const isDragging = useRef(false)
  const previousMousePosition = useRef({ x: 0, y: 0 })
  const previousTime = useRef(performance.now())
  
  // Velocity state
  const velocity = useRef({
    x: 0,
    z: 0,
    zoom: 0
  })
  
  // Constants for physics (adjusted for delta time)
  const DRAG_COEFFICIENT = 5.0 // Per second - increased for more noticeable drag
  const BASE_MOVEMENT_SPEED = 0.115 // Units per second
  const ZOOM_SPEED = 0.03
  const MIN_HEIGHT = 30
  const MAX_HEIGHT = 100
  const VELOCITY_THRESHOLD = 0.0001
  const RETURN_STRENGTH = 1.0 // Increased from 0.01 for stronger bounce

  useFrame(() => {
    const currentTime = performance.now()
    const deltaTime = (currentTime - previousTime.current) / 1000 // Convert to seconds
    previousTime.current = currentTime

    if (Math.abs(velocity.current.x) > VELOCITY_THRESHOLD || 
        Math.abs(velocity.current.z) > VELOCITY_THRESHOLD || 
        Math.abs(velocity.current.zoom) > VELOCITY_THRESHOLD) {
      
      // Scale movement speed based on camera height
      const heightRatio = camera.position.y / MIN_HEIGHT
      const scaledMovementSpeed = BASE_MOVEMENT_SPEED * heightRatio * deltaTime
      const scaledZoomSpeed = -ZOOM_SPEED * heightRatio
      
      // Apply horizontal movement with scaled speed
      const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion)
      const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion)
      
      forward.y = 0
      right.y = 0
      forward.normalize()
      right.normalize()
      
      camera.position.add(right.multiplyScalar(velocity.current.x * scaledMovementSpeed))
      camera.position.add(forward.multiplyScalar(velocity.current.z * scaledMovementSpeed))
      
      // Apply zoom with scaled speed
      const newHeight = camera.position.y + velocity.current.zoom * scaledZoomSpeed
      
      // Enhanced boundary checking with stronger return force
      if (newHeight < MIN_HEIGHT) {
        const penetrationDepth = MIN_HEIGHT - newHeight
        velocity.current.zoom = penetrationDepth * RETURN_STRENGTH
        camera.position.y = MIN_HEIGHT
      } else if (newHeight > MAX_HEIGHT) {
        const penetrationDepth = newHeight - MAX_HEIGHT
        velocity.current.zoom = -penetrationDepth * RETURN_STRENGTH
        camera.position.y = MAX_HEIGHT
      } else {
        camera.position.y = newHeight
      }
      
      // Apply time-based drag (simplified and more effective)
      const dragAmount = DRAG_COEFFICIENT * deltaTime
      velocity.current.x *= (1 - dragAmount)
      velocity.current.z *= (1 - dragAmount)
      velocity.current.zoom *= (1 - dragAmount)
      
      // Reset very small velocities
      if (Math.abs(velocity.current.x) < VELOCITY_THRESHOLD) velocity.current.x = 0
      if (Math.abs(velocity.current.z) < VELOCITY_THRESHOLD) velocity.current.z = 0
      if (Math.abs(velocity.current.zoom) < VELOCITY_THRESHOLD) velocity.current.zoom = 0
    }
  })
  
  useEffect(() => {
    const canvas = gl.domElement
    let lastMouseMoveTime = performance.now()
    
    const handleMouseDown = (event: MouseEvent) => {
      isDragging.current = true
      previousMousePosition.current = {
        x: event.clientX,
        y: event.clientY
      }
      lastMouseMoveTime = performance.now()
      velocity.current = { x: 0, z: 0, zoom: 0 }
    }
    
    const handleMouseUp = () => {
      isDragging.current = false
    }
    
    const handleMouseMove = (event: MouseEvent) => {
      if (!isDragging.current) return
      
      const currentTime = performance.now()
      const deltaTime = (currentTime - lastMouseMoveTime) / 1000 // Convert to seconds
      lastMouseMoveTime = currentTime
      
      if (deltaTime > 0) {
        const deltaX = event.clientX - previousMousePosition.current.x
        const deltaY = event.clientY - previousMousePosition.current.y
        
        // Calculate velocity based on mouse movement and time
        velocity.current.x = -(deltaX / deltaTime) * BASE_MOVEMENT_SPEED
        velocity.current.z = (deltaY / deltaTime) * BASE_MOVEMENT_SPEED
      }
      
      previousMousePosition.current = {
        x: event.clientX,
        y: event.clientY
      }
    }
    
    const handleWheel = (event: WheelEvent) => {
      event.preventDefault()
      
      // Set zoom velocity based on wheel delta, with better scaling
      velocity.current.zoom -= Math.sign(event.deltaY) * 2 // Fixed increment for smoother zoom
      
      // Reduce zoom velocity when very far from limits
      if (camera.position.y < MIN_HEIGHT * 0.8 || camera.position.y > MAX_HEIGHT * 1.2) {
        velocity.current.zoom *= 0.5
      }
    }
    
    const handleContextMenu = (event: MouseEvent) => {
      event.preventDefault()
    }
    
    const handleKeyPress = (event: KeyboardEvent) => {
      console.log('Key pressed:', event.key);
      if (event.key === 'Enter') {
        onEnterPress?.();
      }
    }
    
    canvas.addEventListener('mousedown', handleMouseDown)
    window.addEventListener('mouseup', handleMouseUp)
    window.addEventListener('mousemove', handleMouseMove)
    canvas.addEventListener('wheel', handleWheel, { passive: false })
    canvas.addEventListener('contextmenu', handleContextMenu)
    window.addEventListener('keypress', handleKeyPress)
    
    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown)
      window.removeEventListener('mouseup', handleMouseUp)
      window.removeEventListener('mousemove', handleMouseMove)
      canvas.removeEventListener('wheel', handleWheel)
      canvas.removeEventListener('contextmenu', handleContextMenu)
      window.removeEventListener('keypress', handleKeyPress)
    }
  }, [camera, gl, onEnterPress])
  
  return null
} 