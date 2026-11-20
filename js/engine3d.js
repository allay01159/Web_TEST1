'use strict';

window.NoirCircus = window.NoirCircus || {};

(function (NC) {
  // Minimal, fast 4x4 Column-Major Matrix Library
  const Mat4 = {
    create() {
      const out = new Float32Array(16);
      out[0] = out[5] = out[10] = out[15] = 1;
      return out;
    },
    identity(out) {
      out.fill(0);
      out[0] = out[5] = out[10] = out[15] = 1;
      return out;
    },
    multiply(out, a, b) {
      const a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
      const a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
      const a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
      const a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];

      let b0 = b[0], b1 = b[1], b2 = b[2], b3 = b[3];
      out[0] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
      out[1] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
      out[2] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
      out[3] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;

      b0 = b[4]; b1 = b[5]; b2 = b[6]; b3 = b[7];
      out[4] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
      out[5] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
      out[6] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
      out[7] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;

      b0 = b[8]; b1 = b[9]; b2 = b[10]; b3 = b[11];
      out[8] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
      out[9] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
      out[10] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
      out[11] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;

      b0 = b[12]; b1 = b[13]; b2 = b[14]; b3 = b[15];
      out[12] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
      out[13] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
      out[14] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
      out[15] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
      return out;
    },
    perspective(out, fovy, aspect, near, far) {
      const f = 1.0 / Math.tan(fovy / 2);
      const nf = 1 / (near - far);
      out.fill(0);
      out[0] = f / aspect;
      out[5] = f;
      out[10] = (far + near) * nf;
      out[11] = -1;
      out[14] = 2 * far * near * nf;
      return out;
    },
    lookAt(out, eye, center, up) {
      let zx = eye[0] - center[0];
      let zy = eye[1] - center[1];
      let zz = eye[2] - center[2];
      let len = Math.hypot(zx, zy, zz) || 1;
      zx /= len; zy /= len; zz /= len;

      let xx = up[1] * zz - up[2] * zy;
      let xy = up[2] * zx - up[0] * zz;
      let xz = up[0] * zy - up[1] * zx;
      len = Math.hypot(xx, xy, xz) || 1;
      xx /= len; xy /= len; xz /= len;

      const yx = zy * xz - zz * xy;
      const yy = zz * xx - zx * xz;
      const yz = zx * xy - zy * xx;

      out[0] = xx; out[1] = yx; out[2] = zx; out[3] = 0;
      out[4] = xy; out[5] = yy; out[6] = zy; out[7] = 0;
      out[8] = xz; out[9] = yz; out[10] = zz; out[11] = 0;
      out[12] = -(xx * eye[0] + xy * eye[1] + xz * eye[2]);
      out[13] = -(yx * eye[0] + yy * eye[1] + yz * eye[2]);
      out[14] = -(zx * eye[0] + zy * eye[1] + zz * eye[2]);
      out[15] = 1;
      return out;
    },
    fromTRS(out, pos, rotY, scale) {
      const c = Math.cos(rotY);
      const s = Math.sin(rotY);
      const sx = scale[0], sy = scale[1], sz = scale[2];
      out[0] = c * sx;  out[1] = 0;   out[2] = -s * sx; out[3] = 0;
      out[4] = 0;       out[5] = sy;  out[6] = 0;       out[7] = 0;
      out[8] = s * sz;  out[9] = 0;   out[10] = c * sz; out[11] = 0;
      out[12] = pos[0]; out[13] = pos[1]; out[14] = pos[2]; out[15] = 1;
      return out;
    }
  };

  const VS_SRC = `
    attribute vec3 aPos;
    attribute vec3 aNorm;
    attribute vec2 aUV;

    uniform mat4 uProj;
    uniform mat4 uView;
    uniform mat4 uModel;
    uniform vec2 uUVScale;

    varying vec3 vWorldPos;
    varying vec3 vNormal;
    varying vec2 vUV;

    void main() {
      vec4 worldPos = uModel * vec4(aPos, 1.0);
      vWorldPos = worldPos.xyz;
      vNormal = normalize(mat3(uModel) * aNorm);
      vUV = aUV * uUVScale;
      gl_Position = uProj * uView * worldPos;
    }
  `;

  const FS_SRC = `
    precision mediump float;

    varying vec3 vWorldPos;
    varying vec3 vNormal;
    varying vec2 vUV;

    uniform sampler2D uTex;
    uniform vec3 uTint;
    uniform float uEmissive;
    uniform float uOpacity;
    uniform float uAlphaCutoff;
    uniform float uUnlitSprite;

    uniform vec3 uPlayerPos;
    uniform vec3 uPlayerDir;
    uniform float uFlashlight;

    uniform vec3 uLightPos[10];
    uniform vec3 uLightColor[10];
    uniform float uLightRadius[10];

    uniform vec3 uFogColor;
    uniform float uFogDensity;
    uniform float uTime;

    void main() {
      vec4 texel = texture2D(uTex, vUV);
      if (texel.a < uAlphaCutoff) discard;

      vec3 baseColor = texel.rgb * uTint;
      float distToCam = length(vWorldPos - uPlayerPos);

      if (uUnlitSprite > 0.5) {
        // Silhouette entity: dark body with self-luminous white eyes piercing through fog
        float luma = dot(texel.rgb, vec3(0.333));
        float eyeGlow = smoothstep(0.62, 0.92, luma);
        float fogFactor = 1.0 - exp(-pow(distToCam * uFogDensity * 0.78, 2.0));
        fogFactor = clamp(fogFactor, 0.0, 0.94);

        vec3 litBody = baseColor * (0.28 + 0.72 * (1.0 - fogFactor));
        vec3 finalCol = mix(litBody, uFogColor * 0.45, fogFactor * (1.0 - eyeGlow));
        finalCol = mix(finalCol, vec3(1.0, 0.99, 0.96), eyeGlow * 0.95);
        gl_FragColor = vec4(finalCol, texel.a * uOpacity);
        return;
      }

      vec3 N = normalize(vNormal);
      if (!gl_FrontFacing) N = -N;

      // Subtle ambient theatre gloom
      vec3 lighting = vec3(0.085, 0.085, 0.09);

      // Player Lantern / Flashlight cone
      vec3 toFrag = vWorldPos - uPlayerPos;
      float dPlayer = length(toFrag);
      vec3 L_player = -toFrag / max(dPlayer, 0.0001);
      float spotCos = dot(normalize(toFrag), normalize(uPlayerDir));
      float cone = smoothstep(0.52, 0.92, spotCos);
      float ndotlPlayer = max(dot(N, L_player), 0.18);
      float attPlayer = 1.0 / (1.0 + 0.22 * dPlayer + 0.14 * dPlayer * dPlayer);
      float flicker = 0.96 + 0.04 * sin(uTime * 19.0 + sin(uTime * 7.3));
      lighting += vec3(0.96, 0.95, 0.90) * (cone * 1.45 + 0.28) * ndotlPlayer * attPlayer * uFlashlight * flicker;

      // Dynamic 3D Point Lights (EXIT sign, Key Spotlights, Hiding Booth Sconces)
      for (int i = 0; i < 10; i++) {
        float r = uLightRadius[i];
        if (r > 0.01) {
          vec3 lVec = uLightPos[i] - vWorldPos;
          float d = length(lVec);
          if (d < r) {
            vec3 L = lVec / max(d, 0.0001);
            float ndotl = max(dot(N, L), 0.22);
            float falloff = pow(1.0 - d / r, 1.75);
            lighting += uLightColor[i] * ndotl * falloff;
          }
        }
      }

      vec3 litColor = baseColor * (lighting + vec3(uEmissive));

      // Exponential Noir Distance Fog
      float fogFactor = 1.0 - exp(-pow(distToCam * uFogDensity, 2.0));
      fogFactor = clamp(fogFactor, 0.0, 1.0);
      vec3 finalColor = mix(litColor, uFogColor, fogFactor * (1.0 - min(uEmissive, 0.85)));

      gl_FragColor = vec4(finalColor, texel.a * uOpacity);
    }
  `;

  function makeSurface(w, h) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    return c;
  }

  class Engine3D {
    constructor(canvas) {
      this.canvas = canvas;
      this.gl = canvas.getContext('webgl2', { antialias: true, alpha: false }) ||
                canvas.getContext('webgl', { antialias: true, alpha: false });
      const gl = this.gl;

      this.program = this._createProgram(VS_SRC, FS_SRC);
      gl.useProgram(this.program);

      this.attribs = {
        aPos: gl.getAttribLocation(this.program, 'aPos'),
        aNorm: gl.getAttribLocation(this.program, 'aNorm'),
        aUV: gl.getAttribLocation(this.program, 'aUV')
      };

      this.uniforms = {
        uProj: gl.getUniformLocation(this.program, 'uProj'),
        uView: gl.getUniformLocation(this.program, 'uView'),
        uModel: gl.getUniformLocation(this.program, 'uModel'),
        uUVScale: gl.getUniformLocation(this.program, 'uUVScale'),
        uTex: gl.getUniformLocation(this.program, 'uTex'),
        uTint: gl.getUniformLocation(this.program, 'uTint'),
        uEmissive: gl.getUniformLocation(this.program, 'uEmissive'),
        uOpacity: gl.getUniformLocation(this.program, 'uOpacity'),
        uAlphaCutoff: gl.getUniformLocation(this.program, 'uAlphaCutoff'),
        uUnlitSprite: gl.getUniformLocation(this.program, 'uUnlitSprite'),
        uPlayerPos: gl.getUniformLocation(this.program, 'uPlayerPos'),
        uPlayerDir: gl.getUniformLocation(this.program, 'uPlayerDir'),
        uFlashlight: gl.getUniformLocation(this.program, 'uFlashlight'),
        uFogColor: gl.getUniformLocation(this.program, 'uFogColor'),
        uFogDensity: gl.getUniformLocation(this.program, 'uFogDensity'),
        uTime: gl.getUniformLocation(this.program, 'uTime')
      };

      this.lightUniforms = [];
      for (let i = 0; i < 10; i++) {
        this.lightUniforms.push({
          pos: gl.getUniformLocation(this.program, `uLightPos[${i}]`),
          color: gl.getUniformLocation(this.program, `uLightColor[${i}]`),
          radius: gl.getUniformLocation(this.program, `uLightRadius[${i}]`)
        });
      }

      gl.enable(gl.DEPTH_TEST);
      gl.depthFunc(gl.LEQUAL);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.clearColor(0.035, 0.035, 0.04, 1.0);

      this.projMat = Mat4.create();
      this.viewMat = Mat4.create();
      this.modelMat = Mat4.create();

      this.textures = this._buildProceduralTextures();
      this.primitives = {
        box: this._createBoxMesh(),
        quad: this._createQuadMesh()
      };
    }

    _compileShader(type, src) {
      const gl = this.gl;
      const sh = gl.createShader(type);
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(sh));
      }
      return sh;
    }

    _createProgram(vsSrc, fsSrc) {
      const gl = this.gl;
      const prog = gl.createProgram();
      gl.attachShader(prog, this._compileShader(gl.VERTEX_SHADER, vsSrc));
      gl.attachShader(prog, this._compileShader(gl.FRAGMENT_SHADER, fsSrc));
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        console.error(gl.getProgramInfoLog(prog));
      }
      return prog;
    }

    createTextureFromCanvas(canvas, repeat = true) {
      const gl = this.gl;
      const tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, repeat ? gl.REPEAT : gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, repeat ? gl.REPEAT : gl.CLAMP_TO_EDGE);
      return tex;
    }

    updateTextureFromCanvas(tex, canvas) {
      const gl = this.gl;
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
    }

    loadEntityTexture(onReady) {
      const gl = this.gl;
      const tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      // 1x1 transparent placeholder while image decodes
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 0]));
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

      const upload = (imgEl) => {
        try {
          gl.bindTexture(gl.TEXTURE_2D, tex);
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, imgEl);
          if (onReady) onReady(imgEl);
        } catch (err) {
          // On file:// protocol, external relative PNGs may trigger CORS SecurityError in WebGL.
          // Seamlessly fall back to the embedded same-origin data URI!
          if (imgEl.src !== NC.CLOWN_DATA_URI) {
            const fallback = new Image();
            fallback.onload = () => upload(fallback);
            fallback.src = NC.CLOWN_DATA_URI;
          }
        }
      };

      const img = new Image();
      img.onload = () => upload(img);
      img.onerror = () => {
        const fallback = new Image();
        fallback.onload = () => upload(fallback);
        fallback.src = NC.CLOWN_DATA_URI;
      };
      img.src = 'assets/clown.png';
      return tex;
    }

    _buildProceduralTextures() {
      const rand = NC.generator(901);

      // 1. Noir Theatre Wall Texture (plaster + wainscoting + framing)
      const wallC = makeSurface(256, 256);
      const wg = wallC.getContext('2d');
      wg.fillStyle = '#9c9a92';
      wg.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 4500; i++) {
        const v = 135 + Math.floor(rand() * 34);
        wg.fillStyle = `rgba(${v},${v},${v - 4},0.22)`;
        wg.fillRect(rand() * 256, rand() * 256, 2, 2);
      }
      // Subtle vertical wallpaper stripes
      for (let x = 0; x < 256; x += 32) {
        wg.fillStyle = 'rgba(20,20,20,0.08)';
        wg.fillRect(x, 0, 14, 172);
      }
      // Chair rail molding
      wg.fillStyle = '#2d2d2b';
      wg.fillRect(0, 168, 256, 10);
      wg.fillStyle = '#b9b7ae';
      wg.fillRect(0, 170, 256, 2);
      // Lower wooden wainscoting
      wg.fillStyle = '#474642';
      wg.fillRect(0, 178, 256, 78);
      for (let x = 10; x < 246; x += 64) {
        wg.strokeStyle = '#232321';
        wg.lineWidth = 3;
        wg.strokeRect(x, 188, 44, 54);
        wg.strokeStyle = '#686761';
        wg.lineWidth = 1;
        wg.strokeRect(x + 3, 191, 38, 48);
      }
      // Baseboard
      wg.fillStyle = '#1c1c1b';
      wg.fillRect(0, 244, 256, 12);

      // 2. Poster Wall Variant (with vintage NOIR CIRCUS playbill)
      const posterWallC = makeSurface(256, 256);
      const pwg = posterWallC.getContext('2d');
      pwg.drawImage(wallC, 0, 0);
      pwg.fillStyle = '#1b1b1a';
      pwg.fillRect(72, 34, 112, 118);
      pwg.fillStyle = '#e0ded3';
      pwg.fillRect(78, 40, 100, 106);
      pwg.strokeStyle = '#222';
      pwg.lineWidth = 2;
      pwg.strokeRect(82, 44, 92, 98);
      pwg.fillStyle = '#181818';
      pwg.font = 'bold 14px Georgia, serif';
      pwg.textAlign = 'center';
      pwg.fillText('NOIR', 128, 66);
      pwg.fillText('CIRCUS', 128, 82);
      pwg.font = '10px monospace';
      pwg.fillText('MIDNIGHT', 128, 126);
      pwg.beginPath();
      pwg.arc(128, 101, 13, 0, Math.PI * 2);
      pwg.fill();
      pwg.fillStyle = '#f5f5f5';
      pwg.fillRect(123, 98, 3, 3);
      pwg.fillRect(130, 98, 3, 3);

      // 3. Checkered Theatre Floor Texture
      const floorC = makeSurface(256, 256);
      const fg = floorC.getContext('2d');
      const tile = 64;
      for (let y = 0; y < 4; y++) {
        for (let x = 0; x < 4; x++) {
          const light = (x + y) % 2 === 0;
          fg.fillStyle = light ? '#b5b3aa' : '#2c2c2b';
          fg.fillRect(x * tile, y * tile, tile, tile);
          fg.strokeStyle = 'rgba(10,10,10,0.45)';
          fg.lineWidth = 2;
          fg.strokeRect(x * tile, y * tile, tile, tile);
        }
      }
      for (let i = 0; i < 3500; i++) {
        fg.fillStyle = rand() > 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.09)';
        fg.fillRect(rand() * 256, rand() * 256, 3, 1);
      }

      // 4. Coffered Theatre Ceiling
      const ceilC = makeSurface(256, 256);
      const cg = ceilC.getContext('2d');
      cg.fillStyle = '#262626';
      cg.fillRect(0, 0, 256, 256);
      cg.strokeStyle = '#141414';
      cg.lineWidth = 10;
      cg.strokeRect(8, 8, 240, 240);
      cg.strokeRect(36, 36, 184, 184);
      cg.strokeStyle = '#3a3a38';
      cg.lineWidth = 2;
      cg.strokeRect(42, 42, 172, 172);

      // 5. Dark Carved Wood (EXIT doors, frames, wardrobes, pedestals)
      const woodC = makeSurface(256, 256);
      const wdg = woodC.getContext('2d');
      wdg.fillStyle = '#343330';
      wdg.fillRect(0, 0, 256, 256);
      for (let x = 0; x < 256; x += 2) {
        const shade = 44 + Math.sin(x * 0.14) * 10 + rand() * 12;
        wdg.fillStyle = `rgb(${shade},${shade},${shade - 2})`;
        wdg.fillRect(x, 0, 2, 256);
      }
      wdg.strokeStyle = '#191918';
      wdg.lineWidth = 4;
      wdg.strokeRect(6, 6, 244, 244);

      // 6. Pleated Stage Velvet Curtain (for 3D Hiding Booths)
      const velvetC = makeSurface(256, 256);
      const vg = velvetC.getContext('2d');
      for (let x = 0; x < 256; x++) {
        const fold = 0.5 + 0.5 * Math.sin((x / 256) * Math.PI * 12);
        const v = Math.floor(24 + fold * 58);
        vg.fillStyle = `rgb(${v},${v},${v + 2})`;
        vg.fillRect(x, 0, 1, 256);
      }
      // Subtle stage trim at bottom
      vg.fillStyle = '#9a988e';
      vg.fillRect(0, 242, 256, 5);

      // 7. Brushed Pewter / Brass Metal
      const metalC = makeSurface(128, 128);
      const mg = metalC.getContext('2d');
      mg.fillStyle = '#c8c6bc';
      mg.fillRect(0, 0, 128, 128);
      for (let y = 0; y < 128; y += 2) {
        mg.fillStyle = y % 4 === 0 ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.12)';
        mg.fillRect(0, y, 128, 1);
      }

      // 8. Glowing 3D EXIT Sign Texture
      const exitC = makeSurface(256, 96);
      const eg = exitC.getContext('2d');
      eg.fillStyle = '#121212';
      eg.fillRect(0, 0, 256, 96);
      eg.fillStyle = '#f4f3ec';
      eg.fillRect(8, 8, 240, 80);
      eg.strokeStyle = '#181818';
      eg.lineWidth = 4;
      eg.strokeRect(14, 14, 228, 68);
      eg.fillStyle = '#111111';
      eg.font = 'bold 52px Georgia, serif';
      eg.textAlign = 'center';
      eg.textBaseline = 'middle';
      eg.fillText('EXIT', 128, 50);

      // 9. Luminous Portal Backdrop (visible when 3D EXIT doors open)
      const portalC = makeSurface(128, 256);
      const pg = portalC.getContext('2d');
      const grad = pg.createRadialGradient(64, 128, 12, 64, 128, 120);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.65, '#e8e7df');
      grad.addColorStop(1, '#9e9d95');
      pg.fillStyle = grad;
      pg.fillRect(0, 0, 128, 256);

      return {
        wall: this.createTextureFromCanvas(wallC, true),
        posterWall: this.createTextureFromCanvas(posterWallC, true),
        floor: this.createTextureFromCanvas(floorC, true),
        ceiling: this.createTextureFromCanvas(ceilC, true),
        wood: this.createTextureFromCanvas(woodC, true),
        velvet: this.createTextureFromCanvas(velvetC, true),
        metal: this.createTextureFromCanvas(metalC, true),
        exitSign: this.createTextureFromCanvas(exitC, false),
        portal: this.createTextureFromCanvas(portalC, false)
      };
    }

    _createBoxMesh() {
      const gl = this.gl;
      // Unit cube [-0.5, 0.5]^3 with normals and UVs
      const positions = [
        // Front (+Z)
        -0.5, -0.5,  0.5,   0.5, -0.5,  0.5,   0.5,  0.5,  0.5,  -0.5,  0.5,  0.5,
        // Back (-Z)
         0.5, -0.5, -0.5,  -0.5, -0.5, -0.5,  -0.5,  0.5, -0.5,   0.5,  0.5, -0.5,
        // Right (+X)
         0.5, -0.5,  0.5,   0.5, -0.5, -0.5,   0.5,  0.5, -0.5,   0.5,  0.5,  0.5,
        // Left (-X)
        -0.5, -0.5, -0.5,  -0.5, -0.5,  0.5,  -0.5,  0.5,  0.5,  -0.5,  0.5, -0.5,
        // Top (+Y)
        -0.5,  0.5,  0.5,   0.5,  0.5,  0.5,   0.5,  0.5, -0.5,  -0.5,  0.5, -0.5,
        // Bottom (-Y)
        -0.5, -0.5, -0.5,   0.5, -0.5, -0.5,   0.5, -0.5,  0.5,  -0.5, -0.5,  0.5
      ];
      const normals = [
         0, 0, 1,  0, 0, 1,  0, 0, 1,  0, 0, 1,
         0, 0,-1,  0, 0,-1,  0, 0,-1,  0, 0,-1,
         1, 0, 0,  1, 0, 0,  1, 0, 0,  1, 0, 0,
        -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0,
         0, 1, 0,  0, 1, 0,  0, 1, 0,  0, 1, 0,
         0,-1, 0,  0,-1, 0,  0,-1, 0,  0,-1, 0
      ];
      const uvs = [];
      for (let i = 0; i < 6; i++) {
        uvs.push(0, 1, 1, 1, 1, 0, 0, 0);
      }
      const indices = [];
      for (let i = 0; i < 6; i++) {
        const o = i * 4;
        indices.push(o, o + 1, o + 2, o, o + 2, o + 3);
      }
      return this._uploadMesh(positions, normals, uvs, indices);
    }

    _createQuadMesh() {
      // Unit vertical quad centered at origin in XY plane, facing +Z
      const positions = [
        -0.5, -0.5, 0,
         0.5, -0.5, 0,
         0.5,  0.5, 0,
        -0.5,  0.5, 0
      ];
      const normals = [
        0, 0, 1,
        0, 0, 1,
        0, 0, 1,
        0, 0, 1
      ];
      const uvs = [
        0, 1,
        1, 1,
        1, 0,
        0, 0
      ];
      const indices = [0, 1, 2, 0, 2, 3];
      return this._uploadMesh(positions, normals, uvs, indices);
    }

    _uploadMesh(positions, normals, uvs, indices) {
      const gl = this.gl;
      const posBuf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

      const normBuf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, normBuf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);

      const uvBuf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, uvBuf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(uvs), gl.STATIC_DRAW);

      const idxBuf = gl.createBuffer();
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idxBuf);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

      return { posBuf, normBuf, uvBuf, idxBuf, count: indices.length };
    }

    _bindMesh(mesh) {
      const gl = this.gl;
      gl.bindBuffer(gl.ARRAY_BUFFER, mesh.posBuf);
      gl.enableVertexAttribArray(this.attribs.aPos);
      gl.vertexAttribPointer(this.attribs.aPos, 3, gl.FLOAT, false, 0, 0);

      gl.bindBuffer(gl.ARRAY_BUFFER, mesh.normBuf);
      gl.enableVertexAttribArray(this.attribs.aNorm);
      gl.vertexAttribPointer(this.attribs.aNorm, 3, gl.FLOAT, false, 0, 0);

      gl.bindBuffer(gl.ARRAY_BUFFER, mesh.uvBuf);
      gl.enableVertexAttribArray(this.attribs.aUV);
      gl.vertexAttribPointer(this.attribs.aUV, 2, gl.FLOAT, false, 0, 0);

      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh.idxBuf);
    }

    beginFrame(camera, lights, time, fogDensity = 0.145) {
      const gl = this.gl;
      gl.viewport(0, 0, this.canvas.width, this.canvas.height);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.useProgram(this.program);

      const aspect = this.canvas.width / this.canvas.height;
      Mat4.perspective(this.projMat, camera.fov || 1.12, aspect, 0.06, 36.0);
      Mat4.lookAt(this.viewMat, camera.eye, camera.target, [0, 1, 0]);

      gl.uniformMatrix4fv(this.uniforms.uProj, false, this.projMat);
      gl.uniformMatrix4fv(this.uniforms.uView, false, this.viewMat);

      gl.uniform3fv(this.uniforms.uPlayerPos, camera.eye);
      gl.uniform3fv(this.uniforms.uPlayerDir, camera.forward);
      gl.uniform1f(this.uniforms.uFlashlight, camera.flashlight !== undefined ? camera.flashlight : 1.0);

      gl.uniform3f(this.uniforms.uFogColor, 0.035, 0.035, 0.04);
      gl.uniform1f(this.uniforms.uFogDensity, fogDensity);
      gl.uniform1f(this.uniforms.uTime, time);

      for (let i = 0; i < 10; i++) {
        const u = this.lightUniforms[i];
        const l = lights[i];
        if (l) {
          gl.uniform3fv(u.pos, l.pos);
          gl.uniform3fv(u.color, l.color);
          gl.uniform1f(u.radius, l.radius);
        } else {
          gl.uniform1f(u.radius, 0.0);
        }
      }

      this._currentMesh = null;
    }

    drawItem(item) {
      const gl = this.gl;
      const mesh = item.type === 'quad' ? this.primitives.quad : this.primitives.box;
      if (this._currentMesh !== mesh) {
        this._bindMesh(mesh);
        this._currentMesh = mesh;
      }

      if (item.doubleSided) {
        gl.disable(gl.CULL_FACE);
      } else {
        gl.enable(gl.CULL_FACE);
      }

      Mat4.fromTRS(this.modelMat, item.pos, item.rotY || 0, item.scale);
      gl.uniformMatrix4fv(this.uniforms.uModel, false, this.modelMat);

      const uvScale = item.uvScale || [1, 1];
      gl.uniform2f(this.uniforms.uUVScale, uvScale[0], uvScale[1]);

      const tint = item.tint || [1, 1, 1];
      gl.uniform3f(this.uniforms.uTint, tint[0], tint[1], tint[2]);
      gl.uniform1f(this.uniforms.uEmissive, item.emissive || 0.0);
      gl.uniform1f(this.uniforms.uOpacity, item.opacity !== undefined ? item.opacity : 1.0);
      gl.uniform1f(this.uniforms.uAlphaCutoff, item.alphaCutoff || 0.02);
      gl.uniform1f(this.uniforms.uUnlitSprite, item.unlitSprite ? 1.0 : 0.0);

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, item.tex);
      gl.uniform1i(this.uniforms.uTex, 0);

      gl.drawElements(gl.TRIANGLES, mesh.count, gl.UNSIGNED_SHORT, 0);
    }
  }

  NC.Engine3D = Engine3D;
  NC.Mat4 = Mat4;
})(window.NoirCircus);
