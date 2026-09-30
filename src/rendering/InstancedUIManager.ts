import * as THREE from 'three';

export class InstancedUIManager {
    public group = new THREE.Group();
    
    // Health Bars
    private healthMesh: THREE.InstancedMesh;
    private healthCount = 0;
    private maxHealthBars = 5000;
    
    // Nameplates
    private nameMesh: THREE.InstancedMesh;
    private nameCount = 0;
    private maxNameplates = 5000;
    
    // Atlas
    private atlasCanvas: HTMLCanvasElement;
    private atlasCtx: CanvasRenderingContext2D;
    private atlasTexture: THREE.CanvasTexture;
    private atlasX = 0;
    private atlasY = 0;
    private rowHeight = 64;
    private stringMap = new Map<string, { u: number, v: number, w: number, h: number, wPx: number, hPx: number }>();
    
    // Attributes
    private healthPctAttr: THREE.InstancedBufferAttribute;
    private uvOffsetAttr: THREE.InstancedBufferAttribute;
    private uvScaleAttr: THREE.InstancedBufferAttribute;

    constructor() {
        this.initHealthBars();
        this.initNameplates();
    }
    
    private initHealthBars() {
        const geo = new THREE.PlaneGeometry(2, 0.2);
        this.healthPctAttr = new THREE.InstancedBufferAttribute(new Float32Array(this.maxHealthBars), 1);
        geo.setAttribute('healthPct', this.healthPctAttr);
        
        const mat = new THREE.ShaderMaterial({
            vertexShader: `
                attribute float healthPct;
                varying vec2 vUv;
                varying float vHealth;
                void main() {
                    vUv = uv;
                    vHealth = healthPct;
                    // Billboard
                    vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
                    mvPosition.xy += position.xy * vec2(instanceMatrix[0][0], instanceMatrix[1][1]);
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: `
                varying vec2 vUv;
                varying float vHealth;
                void main() {
                    // Border
                    if (vUv.x < 0.02 || vUv.x > 0.98 || vUv.y < 0.1 || vUv.y > 0.9) {
                        gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
                        return;
                    }
                    if (vUv.x < vHealth) {
                        gl_FragColor = vec4(0.2, 0.8, 0.2, 1.0);
                    } else {
                        gl_FragColor = vec4(0.8, 0.2, 0.2, 0.8);
                    }
                }
            `,
            transparent: true,
            depthTest: false
        });
        
        this.healthMesh = new THREE.InstancedMesh(geo, mat, this.maxHealthBars);
        this.healthMesh.frustumCulled = false;
        this.healthMesh.renderOrder = 999;
        this.group.add(this.healthMesh);
    }
    
    private initNameplates() {
        this.atlasCanvas = document.createElement('canvas');
        this.atlasCanvas.width = 2048;
        this.atlasCanvas.height = 2048;
        this.atlasCtx = this.atlasCanvas.getContext('2d')!;
        this.atlasTexture = new THREE.CanvasTexture(this.atlasCanvas);
        this.atlasTexture.minFilter = THREE.LinearFilter;
        
        const geo = new THREE.PlaneGeometry(1, 1);
        this.uvOffsetAttr = new THREE.InstancedBufferAttribute(new Float32Array(this.maxNameplates * 2), 2);
        this.uvScaleAttr = new THREE.InstancedBufferAttribute(new Float32Array(this.maxNameplates * 2), 2);
        geo.setAttribute('uvOffset', this.uvOffsetAttr);
        geo.setAttribute('uvScale', this.uvScaleAttr);
        
        const mat = new THREE.ShaderMaterial({
            uniforms: {
                map: { value: this.atlasTexture }
            },
            vertexShader: `
                attribute vec2 uvOffset;
                attribute vec2 uvScale;
                varying vec2 vUv;
                void main() {
                    vUv = uvOffset + vec2(uv.x, 1.0 - uv.y) * uvScale;
                    // Billboard
                    vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
                    mvPosition.xy += position.xy * vec2(instanceMatrix[0][0], instanceMatrix[1][1]);
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: `
                uniform sampler2D map;
                varying vec2 vUv;
                void main() {
                    vec4 tex = texture2D(map, vUv);
                    gl_FragColor = tex;
                }
            `,
            transparent: true,
            depthTest: false
        });
        
        this.nameMesh = new THREE.InstancedMesh(geo, mat, this.maxNameplates);
        this.nameMesh.frustumCulled = false;
        this.nameMesh.renderOrder = 999;
        this.group.add(this.nameMesh);
    }
    
    public beginUpdate() {
        this.healthCount = 0;
        this.nameCount = 0;
    }
    
    public endUpdate() {
        this.healthMesh.count = this.healthCount;
        if (this.healthCount > 0) {
            this.healthMesh.instanceMatrix.needsUpdate = true;
            this.healthPctAttr.needsUpdate = true;
        }
        
        this.nameMesh.count = this.nameCount;
        if (this.nameCount > 0) {
            this.nameMesh.instanceMatrix.needsUpdate = true;
            this.uvOffsetAttr.needsUpdate = true;
            this.uvScaleAttr.needsUpdate = true;
        }
    }
    
    public addHealthBar(pos: THREE.Vector3, pct: number, scaleX: number = 1.0, scaleY: number = 1.0) {
        if (this.healthCount >= this.maxHealthBars) return;
        const i = this.healthCount++;
        
        const matrix = new THREE.Matrix4().makeTranslation(pos.x, pos.y, pos.z);
        matrix.elements[0] = scaleX;
        matrix.elements[5] = scaleY;
        
        this.healthMesh.setMatrixAt(i, matrix);
        this.healthPctAttr.setX(i, pct);
    }
    
    public addNameplate(pos: THREE.Vector3, text: string, isHostile: boolean, scale: number = 1.0) {
        if (this.nameCount >= this.maxNameplates) return;
        
        const key = text + '_' + (isHostile ? '1' : '0');
        let rect = this.stringMap.get(key);
        if (!rect) {
            rect = this.addTextToAtlas(text, isHostile);
            this.stringMap.set(key, rect);
            this.atlasTexture.needsUpdate = true;
        }
        
        const i = this.nameCount++;
        const matrix = new THREE.Matrix4().makeTranslation(pos.x, pos.y, pos.z);
        // Maintain aspect ratio from atlas width/height
        const widthUnits = (rect.wPx / 32) * scale;
        const heightUnits = (rect.hPx / 32) * scale;
        
        matrix.elements[0] = widthUnits;
        matrix.elements[5] = heightUnits;
        this.nameMesh.setMatrixAt(i, matrix);
        
        this.uvOffsetAttr.setXY(i, rect.u, rect.v);
        this.uvScaleAttr.setXY(i, rect.w, rect.h);
    }
    
    private addTextToAtlas(text: string, isHostile: boolean) {
        this.atlasCtx.font = 'bold 22px sans-serif';
        const w = Math.ceil(this.atlasCtx.measureText(text).width + 32);
        const h = this.rowHeight;
        
        if (this.atlasX + w > 2048) {
            this.atlasX = 0;
            this.atlasY += h;
        }
        
        const x = this.atlasX;
        const y = this.atlasY;
        
        this.atlasCtx.fillStyle = 'rgba(10, 20, 30, 0.75)';
        this.atlasCtx.beginPath();
        this.atlasCtx.roundRect(x + 4, y + 4, w - 8, h - 8, 8);
        this.atlasCtx.fill();
        
        this.atlasCtx.strokeStyle = isHostile ? '#ff4444' : '#44bbff';
        this.atlasCtx.lineWidth = 3;
        this.atlasCtx.stroke();
        
        this.atlasCtx.fillStyle = '#ffffff';
        this.atlasCtx.textAlign = 'center';
        this.atlasCtx.textBaseline = 'middle';
        this.atlasCtx.fillText(text, x + w / 2, y + h / 2);
        
        this.atlasX += w + 2;
        
        return {
            u: x / 2048,
            v: y / 2048,
            w: w / 2048,
            h: h / 2048,
            wPx: w,
            hPx: h
        };
    }
    
    public dispose() {
        if (this.healthMesh) {
            this.healthMesh.geometry.dispose();
            (this.healthMesh.material as THREE.Material).dispose();
        }
        if (this.nameMesh) {
            this.nameMesh.geometry.dispose();
            (this.nameMesh.material as THREE.Material).dispose();
        }
        if (this.atlasTexture) {
            this.atlasTexture.dispose();
        }
        this.stringMap.clear();
        this.group.clear();
    }
}
