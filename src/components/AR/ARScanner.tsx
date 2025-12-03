import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { XR, ARButton, useHitTest } from '@react-three/xr';
import { useState, useRef, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { X, Check, RotateCcw } from 'lucide-react';
import { Vector3, BufferGeometry, LineBasicMaterial } from 'three';
import SolarPanelModel from './SolarPanelModel';
import { calculateSolarPotential } from '@/utils/solarCalculator';

const Reticle = ({ updatePos }: { updatePos: (pos: Vector3) => void }) => {
  const ref = useRef<any>(null);
  // const { camera } = useThree(); // Not used in the new Reticle logic

  // AR Hit Test
  useHitTest((hitMatrix) => {
    if (ref.current) {
      hitMatrix.decompose(ref.current.position, ref.current.quaternion, ref.current.scale);
      updatePos(ref.current.position.clone());
    }
  });

  // Fallback for non-AR (development/testing)
  // The user's instruction explicitly commented out the fallback logic for now.
  // For now, I'll assume AR is primary and useHitTest handles positioning.
  // If a non-AR fallback is needed, it would be implemented here,
  // potentially using useFrame and raycasting from the camera.

  return (
    <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.1, 0.12, 32]} />
      <meshBasicMaterial color="white" opacity={0.8} transparent />
    </mesh>
  );
};

const Polygon = ({ points }: { points: Vector3[] }) => {
  const geometry = useMemo(() => {
    if (points.length < 2) return null;
    const geo = new BufferGeometry().setFromPoints(points);
    return geo;
  }, [points]);

  if (!geometry) return null;

  return (
    <lineLoop geometry={geometry}>
      <lineBasicMaterial color="yellow" linewidth={3} />
    </lineLoop>
  );
};

const ARScanner = ({ onComplete }: { onComplete: (results: any) => void }) => {
  const [points, setPoints] = useState<Vector3[]>([]);
  const [status, setStatus] = useState<string>('Tap "Start AR" to begin');
  const reticlePos = useRef<Vector3>(new Vector3(0, 0, -2)); // Shared mutable object for reticle position

  const handleAddPoint = () => {
    if (reticlePos.current) {
      setPoints([...points, reticlePos.current.clone()]);
      if (points.length >= 2) {
        setStatus("Add more points or Finish");
      } else {
        setStatus("Add another point");
      }
    }
  };

  const handleFinish = () => {
    if (points.length < 3) {
      setStatus("Need at least 3 points");
      return;
    }
    const results = calculateSolarPotential(points);
    onComplete(results);
  };

  const handleReset = () => {
    setPoints([]);
    setStatus('Tap "Start AR" to begin');
  };

  return (
    <div className="relative w-full h-full bg-black">
      <div className="absolute top-4 left-4 right-4 z-50 flex justify-between items-start pointer-events-none">
        <div className="bg-black/50 backdrop-blur-md text-white px-4 py-2 rounded-full text-sm font-medium">
          {status}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="bg-black/20 hover:bg-black/40 text-white rounded-full pointer-events-auto"
          onClick={() => onComplete(null)}
        >
          <X className="w-6 h-6" />
        </Button>
      </div>

      {/* AR Button - This will render the default AR button */}
      <ARButton
        className="absolute bottom-24 left-1/2 transform -translate-x-1/2 bg-white text-black px-6 py-3 rounded-full font-bold shadow-lg hover:bg-gray-100 transition-colors z-50"
        sessionInit={{ requiredFeatures: ['hit-test'] }}
      />

      <div className="absolute bottom-10 left-0 right-0 z-50 flex justify-center gap-4 pointer-events-none">
        <Button
          onClick={handleAddPoint}
          className="pointer-events-auto bg-primary text-primary-foreground rounded-full font-bold shadow-lg"
        >
          Add Point
        </Button>

        {points.length >= 3 && (
          <Button
            onClick={handleFinish}
            className="pointer-events-auto bg-green-600 hover:bg-green-700 text-white rounded-full font-bold shadow-lg"
          >
            <Check className="w-4 h-4 mr-2" /> Finish
          </Button>
        )}

        {points.length > 0 && (
          <Button
            onClick={handleReset}
            variant="destructive"
            size="icon"
            className="pointer-events-auto rounded-full shadow-lg"
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
        )}
      </div>

      <Canvas>
        <XR>
          <ambientLight intensity={1} />
          <pointLight position={[10, 10, 10]} />

          <Reticle updatePos={(pos) => reticlePos.current.copy(pos)} />
          <Polygon points={points} />

          {points.length >= 3 && (
            <SolarPanelModel position={[points[0].x, points[0].y + 0.1, points[0].z]} />
          )}

          {points.map((p, i) => (
            <mesh key={i} position={p}>
              <sphereGeometry args={[0.05, 16, 16]} />
              <meshBasicMaterial color="yellow" />
            </mesh>
          ))}

        </XR>
      </Canvas>
    </div>
  );
};

export default ARScanner;
