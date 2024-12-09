import { ThreeElements } from '@react-three/fiber'

declare global {
  namespace JSX {
    interface IntrinsicElements {
      ambientLight: ThreeElements['ambientLight']
      directionalLight: ThreeElements['directionalLight']
      mesh: ThreeElements['mesh']
      boxGeometry: ThreeElements['boxGeometry']
      meshStandardMaterial: ThreeElements['meshStandardMaterial']
    }
  }
} 