import React, { useRef, useState } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import { Grid } from '@react-three/drei'
import { CustomControls } from './CustomControls'
import * as THREE from 'three'
import { MessageBubble } from './MessageBubble'
import { GRID } from '../constants/grid'

export function ThreeDimensionalChat() {
  const [cursorPosition, setCursorPosition] = useState<[number, number, number]>([0, 0, 0])
  const { camera, raycaster, scene } = useThree()
  const lightRef = React.useRef<THREE.DirectionalLight>(null)
  const gridRef = React.useRef<any>(null)
  const planeRef = useRef<THREE.Mesh>(null)

  React.useEffect(() => {
    camera.position.set(0, 30, 5)
    camera.lookAt(0, 0, 0)
    camera.updateProjectionMatrix()
  }, [camera])

  // Update light intensity and grid fade properties based on camera height
  useFrame(() => {
    if (lightRef.current) {
      const MIN_HEIGHT = GRID.CAMERA_HEIGHT.MIN
      const MAX_HEIGHT = GRID.CAMERA_HEIGHT.MAX
      const MIN_INTENSITY = 0.1
      const MAX_INTENSITY = 0.8
      const MIN_FADE_DISTANCE = 50
      const MAX_FADE_DISTANCE = 100
      const MIN_FADE_STRENGTH = 1
      const MAX_FADE_STRENGTH = 0.5

      // Calculate ratios based on camera height
      const heightRatio = (camera.position.y - MIN_HEIGHT) / (MAX_HEIGHT - MIN_HEIGHT)
      
      // Update light intensity
      const intensity = MIN_INTENSITY + (MAX_INTENSITY - MIN_INTENSITY) * heightRatio
      lightRef.current.intensity = Math.max(MIN_INTENSITY, Math.min(MAX_INTENSITY, intensity))
      
      // Update grid fade properties
      if (gridRef.current) {
        const fadeDistance = MIN_FADE_DISTANCE + (MAX_FADE_DISTANCE - MIN_FADE_DISTANCE) * heightRatio
        const fadeStrength = MAX_FADE_STRENGTH + (MIN_FADE_STRENGTH - MAX_FADE_STRENGTH) * (1 - heightRatio)
        
        gridRef.current.fadeDistance = fadeDistance
        gridRef.current.fadeStrength = fadeStrength
      }
    }

    // Update invisible plane position to follow camera
    if (planeRef.current) {
      planeRef.current.position.x = camera.position.x
      planeRef.current.position.z = camera.position.z
    }
  })

  const handlePointerMove = () => {
    const intersects = raycaster.intersectObjects(scene.children)
    const gridIntersection = intersects.find(intersect => 
      intersect.object.name === 'grid-plane'
    )

    if (gridIntersection) {
      const { point } = gridIntersection
      setCursorPosition([point.x, 0, point.z])
    }
  }

  return (
    <>
      <CustomControls />
      <Grid
        ref={gridRef}
        name="grid"
        position={[-2.5, 0, -2.5]}
        args={[100, 100]}
        cellSize={GRID.UNIT_SIZE}
        cellThickness={1}
        cellColor="#353535" 
        sectionSize={GRID.SECTION_SIZE}
        sectionThickness={1.2}
        sectionColor="#373737" 
        fadeStrength={1}
        fadeDistance={100}
        infiniteGrid
      />

      {/* Updated MessageBubble with proper grid-based props */}
      <MessageBubble 
        initialGridPosition={{
          x: 0,
          y: 0,
          z: 0
        }}
        initialGridSize={{
          width: GRID.SECTION_SIZE,
          height: GRID.SECTION_SIZE
        }}
      />

      {/* Updated invisible plane with ref */}
      <mesh 
        ref={planeRef}
        name="grid-plane" 
        rotation={[-Math.PI / 2, 0, 0]} 
        onPointerMove={handlePointerMove}
      >
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial visible={false} />
      </mesh>

      {/* Lighting */}
      <ambientLight intensity={0.2} />
      <directionalLight 
        ref={lightRef}
        position={[10, 20, 10]} 
        intensity={0.1}
      />

      {/* Dark background */}
      <color attach="background" args={['#111111']} />
    </>
  )
} 