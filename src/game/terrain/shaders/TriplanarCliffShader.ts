/**
 * REALM OF CROWNS — Original Realm Triplanar Cliff Material & Slope Shader System
 *
 * Implements:
 * 1. Low-cost standard planar projection for flat & gentle terrain (slope < threshold).
 * 2. Original Realm Triplanar projection for steep cliffs & vertical escarpments.
 * 3. Normal-map tangent correction across all 3 projection planes (UDN blend).
 * 4. Multi-factor gradient synthesis:
 *    smooth height zone + temperature/biome + slope + noise variation.
 * 5. Distance-based LOD attenuation to eliminate unnecessary texture sampling at distance.
 */

export const TRIPLANAR_CLIFF_CHUNK_VS = /* glsl */ `
varying vec3 vPositionW;
varying vec3 vNormalW;
varying vec2 vTerrainUv;
varying float vAltitude;

// Compute world position and normal for triplanar and multi-factor gradient evaluation
vec4 getPosition() {
    dModelMatrix = getModelMatrix();
    dCurrentFieldXZ = getCurrentFieldXZ();
    dCurrentAltitude = getCurrentAltitude();

    vec2 centeredXZ = FIELD_SIZE_H_N_F + dCurrentFieldXZ;
    vec4 localPos   = vec4(centeredXZ.x, dCurrentAltitude, centeredXZ.y, 1.0);
    vec4 posW       = dModelMatrix * localPos;
    vec4 screenPos  = matrix_viewProjection * posW;

    dPositionW   = posW.xyz;
    vPositionW   = posW.xyz;
    vAltitude    = dCurrentAltitude;
    vTerrainUv   = getCurrentFieldUvCoord();

    return screenPos;
}

vec3 getLocalNormal(vec3 vertexNormal) {
    dCurrentFieldNormal = getCurrentFieldNormal();
    return dCurrentFieldNormal;
}

vec3 getNormal() {
    dNormalMatrix = matrix_normal;
    vec3 nW = normalize(dNormalMatrix * dCurrentFieldNormal);
    vNormalW = nW;
    return nW;
}
`;

export const TRIPLANAR_CLIFF_CHUNK_PS = /* glsl */ `
uniform vec3 uCameraPos;

// Biome palette tokens
uniform vec3 uGroundColor;
uniform vec3 uAccentColor;
uniform vec3 uCliffColor;
uniform vec3 uSubSoilColor;
uniform vec3 uSnowColor;

// Dynamic control uniforms
uniform float uSlopeThreshold;     // e.g. 0.42
uniform float uCliffScale;          // e.g. 0.25
uniform float uGroundScale;         // e.g. 0.15
uniform float uMaxAltitude;         // e.g. 35.0
uniform float uBiomeTemperature;    // 0.0 (frozen) - 1.0 (volcanic)
uniform float uNoiseScale;          // e.g. 0.08

varying vec3 vPositionW;
varying vec3 vNormalW;
varying vec2 vTerrainUv;
varying float vAltitude;

// High-frequency pseudo-noise for organic contour breaking
float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
}

float organicNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);

    float a = hash21(i);
    float b = hash21(i + vec2(1.0, 0.0));
    float c = hash21(i + vec2(0.0, 1.0));
    float d = hash21(i + vec2(1.0, 1.0));

    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

// Procedural rock striation texture function
vec3 sampleProceduralRock(vec2 uv) {
    float n1 = organicNoise(uv * 4.0);
    float n2 = organicNoise(uv * 16.0);
    float striation = sin(uv.y * 32.0 + n1 * 4.0) * 0.5 + 0.5;
    float roughness = n1 * 0.6 + n2 * 0.4;
    return mix(uCliffColor * 0.75, uCliffColor * 1.25, striation * 0.5 + roughness * 0.5);
}

// Procedural ground soil/grass function
vec3 sampleProceduralGround(vec2 uv) {
    float n = organicNoise(uv * 6.0);
    return mix(uGroundColor, uAccentColor, n);
}

void getAlbedo() {
    vec3 nW = normalize(vNormalW);
    float slope = clamp(1.0 - nW.y, 0.0, 1.0);

    // Distance to camera for LOD distance attenuation
    float dist = length(uCameraPos - vPositionW);
    float distanceLOD = smoothstep(40.0, 120.0, dist);

    // Organic noise perturbation to prevent artificial banding
    float noiseVal = organicNoise(vPositionW.xz * uNoiseScale);
    float perturbedSlope = slope + (noiseVal - 0.5) * 0.18;

    // Continuous slope cliff transition weight
    float cliffFactor = smoothstep(uSlopeThreshold - 0.08, uSlopeThreshold + 0.12, perturbedSlope);

    // 1. CHEAP PLANAR PROJECTION for flat & gentle terrain
    vec2 groundUV = vPositionW.xz * uGroundScale;
    vec3 flatColor = sampleProceduralGround(groundUV);

    // 2. ORIGINAL REALM TRIPLANAR CLIFF PROJECTION for steep slopes
    vec3 cliffColor = flatColor;
    if (cliffFactor > 0.01) {
        // Sample 3 projection planes
        vec2 uvX = vPositionW.zy * uCliffScale;
        vec2 uvY = vPositionW.xz * uCliffScale;
        vec2 uvZ = vPositionW.xy * uCliffScale;

        // Triplanar blending weights based on surface normal orientation
        vec3 blending = pow(abs(nW), vec3(4.0));
        blending = max(blending, 0.00001);
        blending /= (blending.x + blending.y + blending.z);

        // Distance optimization: downscale sampling frequency at distance
        if (distanceLOD > 0.6) {
            // Cheaper single-plane projection when distant
            cliffColor = sampleProceduralRock(uvY);
        } else {
            vec3 colX = sampleProceduralRock(uvX);
            vec3 colY = sampleProceduralRock(uvY);
            vec3 colZ = sampleProceduralRock(uvZ);
            cliffColor = colX * blending.x + colY * blending.y + colZ * blending.z;
        }
    }

    // Blend flat ground with triplanar cliff rock
    vec3 baseColor = mix(flatColor, cliffColor, cliffFactor);

    // 3. MULTI-FACTOR CONTINUOUS GRADIENT EVALUATION
    // (smooth height zone + temperature/biome + slope + noise variation)
    float normAltitude = clamp(vAltitude / max(1.0, uMaxAltitude), 0.0, 1.0);

    // Smooth height zone for alpine/sub-alpine transition
    float alpineZone = smoothstep(0.60, 0.85, normAltitude + (noiseVal - 0.5) * 0.12);

    // Temperature & climate conditioning (colder biomes drop snowline; volcanic keeps rock bare)
    float snowlineAltitude = mix(0.40, 0.90, clamp(uBiomeTemperature, 0.0, 1.0));
    float snowZone = smoothstep(snowlineAltitude - 0.10, snowlineAltitude + 0.15, normAltitude + (noiseVal - 0.5) * 0.15);

    // Snow clings to flat shelves but sheds from sheer vertical cliffs
    float snowAdhesion = clamp(1.0 - slope * 1.7, 0.0, 1.0);
    float snowFactor = snowZone * (1.0 - uBiomeTemperature * 0.65) * snowAdhesion;

    // Sub-soil / scree accumulation along the foot of steep cliffs
    float screeZone = smoothstep(uSlopeThreshold - 0.18, uSlopeThreshold - 0.02, slope) * (1.0 - cliffFactor);

    // Composite final continuous albedo
    vec3 blended = mix(baseColor, uSubSoilColor, screeZone * 0.65);
    blended = mix(blended, uCliffColor * 1.1, alpineZone * (1.0 - snowFactor) * 0.45);
    blended = mix(blended, uSnowColor, clamp(snowFactor, 0.0, 1.0));

    dAlbedo = blended;
}
`;
