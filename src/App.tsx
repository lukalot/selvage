import { useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { ThreeDimensionalChat } from './components/ThreeDimensionalChat'
import { CustomControls } from './components/CustomControls'
import styled from '@emotion/styled'
import { FPSCounter } from './components/FPSCounter'

const AppContainer = styled.div`
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  touch-action: none; /* Prevents pull-to-refresh and other touch gestures */
`

const CanvasContainer = styled.div`
  flex: 1;
  width: 100%;
`

function App() {
  useEffect(() => {
    // Prevent browser zoom on ctrl+wheel
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault()
      }
    }

    // Prevent zoom on pinch gesture
    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 1) {
        e.preventDefault()
      }
    }

    // Prevent default keyboard zoom shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.ctrlKey || e.metaKey) && 
        (e.key === '+' || e.key === '-' || e.key === '=')
      ) {
        e.preventDefault()
      }
    }

    document.addEventListener('wheel', handleWheel, { passive: false })
    document.addEventListener('touchmove', handleTouchMove, { passive: false })
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('wheel', handleWheel)
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  return (
    <AppContainer>
      <FPSCounter />
      <CanvasContainer>
        <Canvas 
          camera={{ 
            position: [0, 30, 12],
            fov: 50,
            up: [0, 8, 1]
          }}
          onCreated={({ gl }) => {
            gl.setClearColor('#111111')
          }}
        >
          <CustomControls />
          <ThreeDimensionalChat />
        </Canvas>
      </CanvasContainer>
    </AppContainer>
  )
}

export default App 