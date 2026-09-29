import React, { useRef, useMemo, useEffect } from 'react';
import { InstancedMesh, Matrix4, Object3D, Color } from 'three';
import { useFrame } from '@react-three/fiber';

export interface EntityData {
  id: string;
  x: number;
  y: number;
  z: number;
  color?: string;
  isMoving?: boolean;
}

interface Props {
  entities: EntityData[];
  moving: boolean;
}

const dummy = new Object3D();
const tempMatrix = new Matrix4();
const tempColor = new Color();

export function InstancedEntityRenderer({ entities, moving }: Props) {
  const meshRef = useRef<InstancedMesh>(null);

  // Initialize static positions once
  useEffect(() => {
    if (!meshRef.current) return;
    
    entities.forEach((entity, i) => {
      dummy.position.set(entity.x, entity.y, entity.z);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
      if (entity.color) {
        tempColor.set(entity.color);
        meshRef.current!.setColorAt(i, tempColor);
      }
    });
    
    meshRef.current.instanceMatrix.needsUpdate = true;
    if (entities[0]?.color) {
      meshRef.current.instanceColor!.needsUpdate = true;
    }
  }, [entities]);

  // Update loop for moving entities without React state
  useFrame(({ clock }) => {
    if (!moving || !meshRef.current) return;
    
    const t = clock.elapsedTime;
    
    entities.forEach((entity, i) => {
      // Simple deterministic movement: circular oscillation
      const offsetX = Math.sin(t + i) * 2;
      const offsetZ = Math.cos(t + i) * 2;
      
      dummy.position.set(entity.x + offsetX, entity.y, entity.z + offsetZ);
      dummy.rotation.y = t;
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });
    
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, entities.length]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial />
    </instancedMesh>
  );
}
