import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { InstancedEntityRenderer, EntityData } from './InstancedEntityRenderer';

interface Props {
  count: number;
}

// Individual mesh component to test React overhead
const IndividualMesh = ({ entity, moving }: { entity: EntityData, moving: boolean }) => {
  const meshRef = useRef<any>();
  
  useFrame(({ clock }) => {
    if (!moving || !meshRef.current) return;
    const t = clock.elapsedTime;
    const i = parseInt(entity.id);
    meshRef.current.position.x = entity.x + Math.sin(t + i) * 2;
    meshRef.current.position.z = entity.z + Math.cos(t + i) * 2;
    meshRef.current.rotation.y = t;
  });

  return (
    <mesh ref={meshRef} position={[entity.x, entity.y, entity.z]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color={entity.color || 'white'} />
    </mesh>
  );
};

export function StressTestScene({ count }: Props) {
  const urlParams = new URLSearchParams(window.location.search);
  const mode = urlParams.get('renderMode') || 'individual';
  const moving = urlParams.get('moving') === '1';

  const entities = useMemo(() => {
    const arr: EntityData[] = [];
    const gridSize = Math.ceil(Math.sqrt(count));
    const spacing = 3;
    
    for (let i = 0; i < count; i++) {
      const row = Math.floor(i / gridSize);
      const col = i % gridSize;
      arr.push({
        id: i.toString(),
        x: (col - gridSize/2) * spacing,
        y: 0,
        z: (row - gridSize/2) * spacing,
        color: `hsl(${(i * 137.5) % 360}, 70%, 50%)`
      });
    }
    return arr;
  }, [count]);

  if (mode === 'instanced') {
    return <InstancedEntityRenderer entities={entities} moving={moving} />;
  }

  // Individual mode
  return (
    <group>
      {entities.map(e => (
        <IndividualMesh key={e.id} entity={e} moving={moving} />
      ))}
    </group>
  );
}
