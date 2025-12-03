import { useRef } from 'react';
import { Mesh } from 'three';

const SolarPanelModel = ({ position, rotation }: { position: [number, number, number], rotation?: [number, number, number] }) => {
    const meshRef = useRef<Mesh>(null);

    return (
        <group position={position} rotation={rotation ? [rotation[0], rotation[1], rotation[2]] : [-Math.PI / 2, 0, 0]}>
            {/* Frame */}
            <mesh position={[0, 0, 0]}>
                <boxGeometry args={[1, 1.6, 0.04]} />
                <meshStandardMaterial color="#333" />
            </mesh>
            {/* Cells */}
            <mesh position={[0, 0, 0.025]}>
                <boxGeometry args={[0.95, 1.55, 0.01]} />
                <meshStandardMaterial color="#000044" roughness={0.2} metalness={0.8} />
            </mesh>
            {/* Grid lines (simplified texture or just visual separation) */}
        </group>
    );
};

export default SolarPanelModel;
