/**
 * REALM OF CROWNS — PlayCanvas Terrain Shader Chunk Integration
 * Assembles vertex texture-displacement chunks, normals computation, and the Triplanar Cliff pixel chunk.
 */

import * as pc from 'playcanvas';
import { TRIPLANAR_CLIFF_CHUNK_PS, TRIPLANAR_CLIFF_CHUNK_VS } from './TriplanarCliffShader';

export interface TerrainShaderConfig {
  width: number;
  depth: number;
  patchSize: number;
  maxHeight: number;
}

export class RealmTerrainShaders {
  public static buildShaderChunks(config: TerrainShaderConfig): Record<string, string> {
    const definesVS = `
      #define FIELD_SIZE             (ivec2(${config.width}, ${config.depth}))
      #define FIELD_SIZE_F           (vec2(${config.width.toFixed(1)}, ${config.depth.toFixed(1)}))
      #define FIELD_SIZE_U           (uvec2(FIELD_SIZE))
      #define FIELD_SIZE_H_F         (FIELD_SIZE_F / 2.0)
      #define FIELD_SIZE_H_N_F       (-FIELD_SIZE_H_F)
      #define FIELD_PATCH_SIZE_X     (${config.patchSize.toFixed(1)})
      #define FIELD_PATCH_SIZE_M1    (FIELD_PATCH_SIZE_X - 1.0)
      #define FIELD_PATCH_SIZE_M1_H  (FIELD_PATCH_SIZE_M1 / 2.0)
    `;

    const baseVS = `
      uniform vec2 uPatchCoordOffset;
      attribute uvec2 vertex_position;
      uniform highp sampler2D uHeightMap;
      uniform mat4 matrix_viewProjection;
      uniform mat4 matrix_model;
      uniform mat3 matrix_normal;
      uniform vec3 uCameraPos;
      uniform float uMaxHeight;
      uniform float uPatchLodCore;

      vec2 dCurrentFieldXZ;
      float dCurrentAltitude;
      vec3 dPositionW;
      mat4 dModelMatrix;
      mat3 dNormalMatrix;
      vec3 dCurrentFieldNormal;

      vec2 getCurrentFieldXZ() {
          return vec2(vertex_position) + uPatchCoordOffset;
      }

      vec2 getCurrentFieldUvCoord() {
          return (dCurrentFieldXZ + 0.5) / FIELD_SIZE_F;
      }

      float getAltitude(ivec2 offset) {
          vec2 coord = clamp(dCurrentFieldXZ + vec2(offset), vec2(0.0), FIELD_SIZE_F - 1.0);
          return texelFetch(uHeightMap, ivec2(coord), 0).r;
      }

      float getCurrentAltitude() {
          vec2 coord = clamp(dCurrentFieldXZ, vec2(0.0), FIELD_SIZE_F - 1.0);
          return texelFetch(uHeightMap, ivec2(coord), 0).r;
      }

      vec3 getCurrentFieldNormal() {
          float step = 1.0;
          float left  = getAltitude(ivec2(-step, 0));
          float right = getAltitude(ivec2( step, 0));
          float down  = getAltitude(ivec2(0, -step));
          float up    = getAltitude(ivec2(0,  step));

          vec3 normal = vec3(left - right, 2.0 * step, down - up);
          return normalize(normal);
      }
    `;

    const normalCoreVS = `
      vec3 vertex_normal;
      vec3 dCurrentFieldNormal;

      vec3 getLocalNormal(vec3 vertexNormal) {
          dCurrentFieldNormal = getCurrentFieldNormal();
          vertex_normal = dCurrentFieldNormal;
          return dCurrentFieldNormal;
      }

      mat3 getNormalMatrix(mat4 modelMatrix) {
          return matrix_normal;
      }
    `;

    const transformVS = definesVS + baseVS + TRIPLANAR_CLIFF_CHUNK_VS;

    return {
      normalCoreVS,
      transformVS,
      transformCoreVS: '',
      transformInstancingVS: '',
      diffusePS: TRIPLANAR_CLIFF_CHUNK_PS,
    };
  }

  public static applyChunksToMaterial(material: pc.StandardMaterial, config: TerrainShaderConfig) {
    const chunkStore = RealmTerrainShaders.buildShaderChunks(config);
    const chunkNames = Object.keys(chunkStore);

    const shaderChunks = material.getShaderChunks?.(pc.SHADERLANGUAGE_GLSL);
    if (shaderChunks) {
      for (const name of chunkNames) {
        shaderChunks.set(name, chunkStore[name]);
      }
      (material as any).shaderChunksVersion = pc.CHUNKAPI_1_70;
    } else {
      const chunks: Record<string, string> = (material as any).chunks;
      if (chunks) {
        for (const name of chunkNames) {
          chunks[name] = chunkStore[name];
        }
        (chunks as any).APIVersion = pc.CHUNKAPI_1_70;
      }
    }

    material.update();
  }
}
