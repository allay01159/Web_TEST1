'use strict';

window.NoirCircus = window.NoirCircus || {};

(function (NC) {
  class TheatreWorld {
    constructor(engine) {
      this.engine = engine;
      this.cfg = NC.CONFIG;
      this.staticItems = [];
      this.clownAspect = 294 / 274;

      this.clownTex = engine.loadEntityTexture((img) => {
        if (img.naturalWidth && img.naturalHeight) {
          this.clownAspect = img.naturalWidth / img.naturalHeight;
        }
      });

      this.keypadCanvas = document.createElement('canvas');
      this.keypadCanvas.width = 128;
      this.keypadCanvas.height = 192;
      this.keypadTex = engine.createTextureFromCanvas(this.keypadCanvas, false);
      this.updateKeypadTexture([false, false, false, false], false);

      this.ticketTextures = this.cfg.spots.map((_, i) => this._makeTicketTexture(i, '?'));
      this._buildStaticArchitecture();
    }

    _makeTicketTexture(spotIdx, digit) {
      const c = document.createElement('canvas');
      c.width = 96;
      c.height = 128;
      const g = c.getContext('2d');
      g.fillStyle = '#ebe9df';
      g.fillRect(4, 4, 88, 120);
      g.strokeStyle = '#191919';
      g.lineWidth = 3;
      g.strokeRect(10, 10, 76, 108);
      g.setLineDash([4, 4]);
      g.beginPath();
      g.moveTo(12, 46);
      g.lineTo(84, 46);
      g.stroke();
      g.setLineDash([]);
      g.fillStyle = '#181818';
      g.font = 'bold 14px Georgia, serif';
      g.textAlign = 'center';
      g.fillText('NOIR', 48, 28);
      const roman = this.cfg.roman[this.cfg.order[spotIdx]];
      g.font = 'bold 20px Georgia, serif';
      g.fillText(roman + '석', 48, 72);
      g.font = 'bold 28px monospace';
      g.fillText(String(digit), 48, 104);
      return this.engine.createTextureFromCanvas(c, false);
    }

    syncTicketDigits(tickets) {
      tickets.forEach((digit, i) => {
        const c = document.createElement('canvas');
        c.width = 96;
        c.height = 128;
        const g = c.getContext('2d');
        g.fillStyle = '#ebe9df';
        g.fillRect(4, 4, 88, 120);
        g.strokeStyle = '#191919';
        g.lineWidth = 3;
        g.strokeRect(10, 10, 76, 108);
        g.setLineDash([4, 4]);
        g.beginPath();
        g.moveTo(12, 46);
        g.lineTo(84, 46);
        g.stroke();
        g.setLineDash([]);
        g.fillStyle = '#181818';
        g.font = 'bold 14px Georgia, serif';
        g.textAlign = 'center';
        g.fillText('NOIR', 48, 28);
        const roman = this.cfg.roman[this.cfg.order[i]];
        g.font = 'bold 20px Georgia, serif';
        g.fillText(roman + '석', 48, 72);
        g.font = 'bold 30px monospace';
        g.fillText(String(digit), 48, 105);
        this.engine.updateTextureFromCanvas(this.ticketTextures[i], c);
      });
    }

    updateKeypadTexture(found, unlocked) {
      const g = this.keypadCanvas.getContext('2d');
      g.fillStyle = '#1c1c1e';
      g.fillRect(0, 0, 128, 192);
      g.strokeStyle = '#8b897f';
      g.lineWidth = 4;
      g.strokeRect(6, 6, 116, 180);

      // Status LEDs for 4 keys
      for (let i = 0; i < 4; i++) {
        const lx = 24 + i * 26;
        g.fillStyle = (unlocked || found[i]) ? '#f4f3ec' : '#333336';
        g.beginPath();
        g.arc(lx, 26, 7, 0, Math.PI * 2);
        g.fill();
        g.strokeStyle = '#999';
        g.lineWidth = 1.5;
        g.stroke();
      }

      // Numeric 3x4 keypad grid
      g.fillStyle = '#2d2d30';
      for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 3; c++) {
          g.fillRect(20 + c * 32, 48 + r * 31, 24, 23);
          g.strokeStyle = '#6f6e67';
          g.lineWidth = 1;
          g.strokeRect(20 + c * 32, 48 + r * 31, 24, 23);
        }
      }
    }

    _buildStaticArchitecture() {
      const { N, grid, wallHeight, spots } = this.cfg;
      const tex = this.engine.textures;

      // Floor & Coffered Ceiling planes
      this.staticItems.push({
        type: 'box',
        pos: [N / 2, -0.05, N / 2],
        scale: [N, 0.1, N],
        uvScale: [N, N],
        tex: tex.floor,
        tint: [0.95, 0.95, 0.93]
      });

      this.staticItems.push({
        type: 'box',
        pos: [N / 2, wallHeight + 0.05, N / 2],
        scale: [N, 0.1, N],
        uvScale: [N, N],
        tex: tex.ceiling,
        tint: [0.85, 0.85, 0.85]
      });

      // Maze Walls & Corner Architectural Pilasters
      for (let gz = 0; gz < N; gz++) {
        for (let gx = 0; gx < N; gx++) {
          if (grid[gz][gx] === 1) {
            const hasPoster = ((gx * 5 + gz * 7) % 9 === 0) && gx > 1 && gx < N - 2 && gz > 1 && gz < N - 2;
            this.staticItems.push({
              type: 'box',
              pos: [gx + 0.5, wallHeight / 2, gz + 0.5],
              scale: [1, wallHeight, 1],
              uvScale: [1, 1],
              tex: hasPoster ? tex.posterWall : tex.wall,
              tint: [0.96, 0.96, 0.94]
            });
          }
        }
      }

      // 4 Room 3D Display Pedestals
      for (const spot of spots) {
        // Plinth base
        this.staticItems.push({
          type: 'box',
          pos: [spot.x, 0.08, spot.z],
          scale: [0.54, 0.16, 0.54],
          tex: tex.wood,
          tint: [0.85, 0.85, 0.85]
        });
        // Fluted pedestal column
        this.staticItems.push({
          type: 'box',
          pos: [spot.x, 0.43, spot.z],
          scale: [0.34, 0.56, 0.34],
          tex: tex.wood,
          tint: [1.0, 1.0, 0.98]
        });
        // Top display table capital
        this.staticItems.push({
          type: 'box',
          pos: [spot.x, 0.74, spot.z],
          scale: [0.48, 0.08, 0.48],
          tex: tex.metal,
          tint: [0.72, 0.72, 0.7]
        });
      }
    }

    _pushExitPortal(opaque, translucent, state) {
      const tex = this.engine.textures;
      const ex = this.cfg.exit.x; // 6.5
      const ez = 14.96; // Flush against South wall (Z = 15.0), facing North (-Z)
      const doorH = 1.72;
      const openAngle = state.exitOpenAngle || 0; // 0 -> 1.42 rad

      // Threshold step
      opaque.push({
        type: 'box',
        pos: [ex, 0.02, ez - 0.08],
        scale: [1.14, 0.04, 0.24],
        tex: tex.metal,
        tint: [0.65, 0.65, 0.63]
      });

      // Left & Right heavy 3D doorframe jambs
      opaque.push({
        type: 'box',
        pos: [ex - 0.50, doorH / 2, ez - 0.03],
        scale: [0.11, doorH, 0.14],
        tex: tex.wood,
        tint: [0.9, 0.9, 0.88]
      });
      opaque.push({
        type: 'box',
        pos: [ex + 0.50, doorH / 2, ez - 0.03],
        scale: [0.11, doorH, 0.14],
        tex: tex.wood,
        tint: [0.9, 0.9, 0.88]
      });

      // Top lintel & decorative cornice molding
      opaque.push({
        type: 'box',
        pos: [ex, doorH + 0.06, ez - 0.04],
        scale: [1.18, 0.13, 0.18],
        tex: tex.wood,
        tint: [0.95, 0.95, 0.92]
      });

      // Glowing white escape portal backdrop behind the doors
      opaque.push({
        type: 'quad',
        pos: [ex, doorH / 2, ez + 0.01],
        rotY: Math.PI,
        scale: [0.90, doorH - 0.04, 1],
        tex: tex.portal,
        emissive: state.exitUnlocked ? 0.95 : 0.25,
        doubleSided: true
      });

      // Hinged 3D Double Doors (Left leaf hinged at ex - 0.445, Right leaf hinged at ex + 0.445)
      const leafW = 0.44;
      const leafH = doorH - 0.04;
      const hingeZ = ez - 0.03;

      // Left Door Leaf
      const lAngle = -openAngle; // Swings outward (-Z) to the left (-X)
      const lCenterX = (ex - 0.445) + Math.cos(lAngle) * (leafW / 2);
      const lCenterZ = hingeZ + Math.sin(lAngle) * (leafW / 2);
      opaque.push({
        type: 'box',
        pos: [lCenterX, leafH / 2 + 0.02, lCenterZ],
        rotY: -lAngle,
        scale: [leafW, leafH, 0.045],
        tex: tex.wood,
        tint: [1.05, 1.05, 1.02]
      });
      // Left Door Brass Handle
      const lhX = (ex - 0.445) + Math.cos(lAngle) * (leafW - 0.07) + Math.sin(lAngle) * 0.035;
      const lhZ = hingeZ + Math.sin(lAngle) * (leafW - 0.07) - Math.cos(lAngle) * 0.035;
      opaque.push({
        type: 'box',
        pos: [lhX, 0.88, lhZ],
        rotY: -lAngle,
        scale: [0.022, 0.24, 0.025],
        tex: tex.metal,
        tint: [1.1, 1.1, 1.05]
      });

      // Right Door Leaf
      const rAngle = openAngle; // Swings outward (-Z) to the right (+X)
      const rCenterX = (ex + 0.445) - Math.cos(rAngle) * (leafW / 2);
      const rCenterZ = hingeZ - Math.sin(rAngle) * (leafW / 2);
      opaque.push({
        type: 'box',
        pos: [rCenterX, leafH / 2 + 0.02, rCenterZ],
        rotY: rAngle,
        scale: [leafW, leafH, 0.045],
        tex: tex.wood,
        tint: [1.05, 1.05, 1.02]
      });
      // Right Door Brass Handle
      const rhX = (ex + 0.445) - Math.cos(rAngle) * (leafW - 0.07) - Math.sin(rAngle) * 0.035;
      const rhZ = hingeZ - Math.sin(rAngle) * (leafW - 0.07) + Math.cos(rAngle) * 0.035;
      opaque.push({
        type: 'box',
        pos: [rhX, 0.88, rhZ],
        rotY: rAngle,
        scale: [0.022, 0.24, 0.025],
        tex: tex.metal,
        tint: [1.1, 1.1, 1.05]
      });

      // Overhead 3D Illuminated EXIT Sign Box + Hanging Rods
      const signY = 2.02;
      const signZ = ez - 0.09;
      opaque.push({
        type: 'box',
        pos: [ex - 0.22, 2.22, signZ],
        scale: [0.018, 0.26, 0.018],
        tex: tex.metal
      });
      opaque.push({
        type: 'box',
        pos: [ex + 0.22, 2.22, signZ],
        scale: [0.018, 0.26, 0.018],
        tex: tex.metal
      });
      // Sign Metal Housing
      opaque.push({
        type: 'box',
        pos: [ex, signY, signZ],
        scale: [0.64, 0.22, 0.09],
        tex: tex.wood,
        tint: [0.5, 0.5, 0.5]
      });
      // Illuminated EXIT Front Face (facing -Z)
      opaque.push({
        type: 'quad',
        pos: [ex, signY, signZ - 0.048],
        rotY: Math.PI,
        scale: [0.60, 0.18, 1],
        tex: tex.exitSign,
        emissive: 0.92
      });

      // 3D Wall-Mounted Keypad Lock Box beside the door
      opaque.push({
        type: 'box',
        pos: [ex + 0.68, 1.12, ez - 0.01],
        scale: [0.16, 0.24, 0.05],
        tex: tex.metal,
        tint: [0.7, 0.7, 0.7]
      });
      opaque.push({
        type: 'quad',
        pos: [ex + 0.68, 1.12, ez - 0.038],
        rotY: Math.PI,
        scale: [0.14, 0.22, 1],
        tex: this.keypadTex,
        emissive: 0.35
      });
    }

    _pushHidingSpots(opaque, state) {
      const tex = this.engine.textures;
      const spots = this.cfg.hidingSpots;

      for (let i = 0; i < spots.length; i++) {
        const s = spots[i];
        const openAmt = state.hideOpen[i]; // 1 = open, 0 = closed (player inside)
        const yaw = s.yaw; // Outward normal angle: 0 (+X), PI (-X), PI/2 (+Z), -PI/2 (-Z)
        const fx = s.dirX;
        const fz = s.dirZ;
        // Right vector when facing outward (fx, fz): (-fz, fx)
        const rx = -fz;
        const rz = fx;

        const w = 0.88;
        const d = 0.48;
        const h = 1.96;

        // Helper to place local offset (localX = outward, localY = up, localZ = right)
        const toWorld = (lx, ly, lz) => [
          s.x + fx * lx + rx * lz,
          ly,
          s.z + fz * lx + rz * lz
        ];

        // Booth / Wardrobe Left & Right Side Panels
        opaque.push({
          type: 'box',
          pos: toWorld(0, h / 2, -w / 2),
          rotY: -yaw,
          scale: [d, h, 0.05],
          tex: tex.wood,
          tint: [0.85, 0.85, 0.82]
        });
        opaque.push({
          type: 'box',
          pos: toWorld(0, h / 2, w / 2),
          rotY: -yaw,
          scale: [d, h, 0.05],
          tex: tex.wood,
          tint: [0.85, 0.85, 0.82]
        });
        // Back Panel & Top Canopy
        opaque.push({
          type: 'box',
          pos: toWorld(-d / 2 + 0.02, h / 2, 0),
          rotY: -yaw,
          scale: [0.04, h, w],
          tex: tex.wood,
          tint: [0.65, 0.65, 0.62]
        });
        opaque.push({
          type: 'box',
          pos: toWorld(0.02, h + 0.04, 0),
          rotY: -yaw,
          scale: [d + 0.08, 0.08, w + 0.08],
          tex: tex.wood,
          tint: [0.95, 0.95, 0.92]
        });
        // Floor platform
        opaque.push({
          type: 'box',
          pos: toWorld(0, 0.02, 0),
          rotY: -yaw,
          scale: [d, 0.04, w],
          tex: tex.wood,
          tint: [0.75, 0.75, 0.72]
        });

        // Subtle overhead lantern bar so shelter is readable in dim hallways
        opaque.push({
          type: 'box',
          pos: toWorld(d / 2 + 0.05, h - 0.06, 0),
          rotY: -yaw,
          scale: [0.06, 0.05, 0.24],
          tex: tex.exitSign,
          tint: [0.82, 0.82, 0.78],
          emissive: 0.35
        });

        if (s.type === 'booth') {
          // 3D Velvet Curtain Booth: Brass rod + two animated 3D curtains
          opaque.push({
            type: 'box',
            pos: toWorld(d / 2 - 0.03, h - 0.04, 0),
            rotY: -yaw,
            scale: [0.025, 0.025, w - 0.04],
            tex: tex.metal
          });

          // Curtain panel width expands as openAmt -> 0 (closing the gap when hiding!)
          const sway = Math.sin(state.elapsed * 2.2 + i) * 0.008;
          const panelW = NC.lerp(0.395, 0.22, openAmt);
          const offsetZ = (w / 2 - 0.03) - panelW / 2;

          opaque.push({
            type: 'box',
            pos: toWorld(d / 2 - 0.03 + sway, (h - 0.08) / 2 + 0.03, -offsetZ),
            rotY: -yaw,
            scale: [0.035, h - 0.09, panelW],
            tex: tex.velvet,
            tint: [0.95, 0.95, 0.95],
            doubleSided: true
          });
          opaque.push({
            type: 'box',
            pos: toWorld(d / 2 - 0.03 - sway, (h - 0.08) / 2 + 0.03, offsetZ),
            rotY: -yaw,
            scale: [0.035, h - 0.09, panelW],
            tex: tex.velvet,
            tint: [0.95, 0.95, 0.95],
            doubleSided: true
          });
        } else {
          // 3D Backstage Wardrobe: Two hinged 3D louvered doors!
          const doorSwing = NC.lerp(0.06, 1.18, openAmt); // 0.06 rad crack when inside, 1.18 rad when open
          const leafW = (w - 0.08) / 2;
          const leafH = h - 0.08;
          const frontX = d / 2 - 0.02;

          // Left Wardrobe Door (hinged at lz = -leafW)
          const lHingeZ = -leafW;
          const lMidX = frontX + Math.sin(doorSwing) * (leafW / 2);
          const lMidZ = lHingeZ + Math.cos(doorSwing) * (leafW / 2);
          opaque.push({
            type: 'box',
            pos: toWorld(lMidX, leafH / 2 + 0.04, lMidZ),
            rotY: -yaw + doorSwing,
            scale: [0.035, leafH, leafW - 0.01],
            tex: tex.wood,
            tint: [1.05, 1.05, 1.02]
          });
          // Louver slats on Left Door (leaving gaps to peek through!)
          for (let slat = 0; slat < 4; slat++) {
            opaque.push({
              type: 'box',
              pos: toWorld(lMidX, 0.95 + slat * 0.16, lMidZ),
              rotY: -yaw + doorSwing,
              scale: [0.052, 0.04, leafW * 0.65],
              tex: tex.metal,
              tint: [0.45, 0.45, 0.43]
            });
          }

          // Right Wardrobe Door (hinged at lz = +leafW)
          const rHingeZ = leafW;
          const rMidX = frontX + Math.sin(doorSwing) * (leafW / 2);
          const rMidZ = rHingeZ - Math.cos(doorSwing) * (leafW / 2);
          opaque.push({
            type: 'box',
            pos: toWorld(rMidX, leafH / 2 + 0.04, rMidZ),
            rotY: -yaw - doorSwing,
            scale: [0.035, leafH, leafW - 0.01],
            tex: tex.wood,
            tint: [1.05, 1.05, 1.02]
          });
          // Louver slats on Right Door
          for (let slat = 0; slat < 4; slat++) {
            opaque.push({
              type: 'box',
              pos: toWorld(rMidX, 0.95 + slat * 0.16, rMidZ),
              rotY: -yaw - doorSwing,
              scale: [0.052, 0.04, leafW * 0.65],
              tex: tex.metal,
              tint: [0.45, 0.45, 0.43]
            });
          }
        }
      }
    }

    render(state) {
      const { player, enemy, found, lure, elapsed, camera } = state;
      const tex = this.engine.textures;

      // Build dynamic 3D lights array (up to 10 lights)
      const lights = [
        // 0: Bright 3D EXIT sign spotlight
        {
          pos: [this.cfg.exit.x, 1.85, 14.55],
          color: state.exitUnlocked ? [1.35, 1.35, 1.3] : [0.95, 0.95, 0.9],
          radius: state.exitUnlocked ? 5.2 : 3.8
        },
        // 1..4: 4 Room Pedestal Spotlights (dim after key is collected)
        ...this.cfg.spots.map((s, i) => ({
          pos: [s.x, 1.85, s.z],
          color: found[i] ? [0.28, 0.28, 0.27] : [1.05, 1.04, 0.98],
          radius: found[i] ? 2.4 : 4.0
        })),
        // 5..9: Warm subtle sconces above hiding spots so shelters are navigable
        ...this.cfg.hidingSpots.slice(0, 5).map((h) => ({
          pos: [h.x + h.dirX * 0.35, 1.82, h.z + h.dirZ * 0.35],
          color: [0.42, 0.42, 0.4],
          radius: 2.5
        }))
      ];

      this.engine.beginFrame(camera, lights, elapsed, state.hidingSpot !== null ? 0.115 : 0.142);

      // 1. Draw static 3D world geometry
      for (let i = 0; i < this.staticItems.length; i++) {
        this.engine.drawItem(this.staticItems[i]);
      }

      // 2. Collect dynamic opaque 3D objects & transparent billboards
      const opaque = [];
      const translucent = [];

      this._pushExitPortal(opaque, translucent, state);
      this._pushHidingSpots(opaque, state);

      // 3D Keys & Ticket Tags hovering over uncollected pedestals
      this.cfg.spots.forEach((s, i) => {
        if (found[i]) return;
        const bob = Math.sin(elapsed * 2.6 + i) * 0.045;
        const rot = elapsed * 1.4 + i;
        const ky = 1.03 + bob;

        // Key Shaft
        opaque.push({
          type: 'box',
          pos: [s.x, ky, s.z],
          rotY: rot,
          scale: [0.025, 0.20, 0.025],
          tex: tex.metal,
          emissive: 0.28
        });
        // Key Bow Ring (top)
        opaque.push({
          type: 'box',
          pos: [s.x, ky + 0.11, s.z],
          rotY: rot,
          scale: [0.085, 0.075, 0.025],
          tex: tex.metal,
          emissive: 0.28
        });
        // Key Bit Teeth (bottom)
        opaque.push({
          type: 'box',
          pos: [s.x + Math.cos(rot) * 0.03, ky - 0.07, s.z - Math.sin(rot) * 0.03],
          rotY: rot,
          scale: [0.055, 0.045, 0.022],
          tex: tex.metal,
          emissive: 0.28
        });

        // Floating Seat Ticket Stub facing camera
        const faceCamYaw = Math.atan2(camera.eye[0] - s.x, camera.eye[2] - s.z);
        translucent.push({
          type: 'quad',
          pos: [s.x + 0.14, ky + 0.02, s.z],
          rotY: faceCamYaw,
          scale: [0.16, 0.21, 1],
          tex: this.ticketTextures[i],
          emissive: 0.35,
          doubleSided: true
        });
      });

      // 3D Clockwork Toy Decoy when active
      if (lure) {
        const spin = elapsed * 7.5;
        opaque.push({
          type: 'box',
          pos: [lure.x, 0.13, lure.z],
          rotY: Math.sin(elapsed * 12) * 0.12,
          scale: [0.24, 0.24, 0.24],
          tex: tex.wood,
          emissive: 0.25
        });
        // Spinning Brass Wind-up Key on top
        opaque.push({
          type: 'box',
          pos: [lure.x, 0.31, lure.z],
          rotY: spin,
          scale: [0.16, 0.09, 0.02],
          tex: tex.metal,
          emissive: 0.45
        });
      }

      // The Black Clown Entity (User's Attached Silhouette Image)
      const jitterX = enemy.aggro > 0 ? (Math.sin(elapsed * 47) * 0.022) : 0;
      const jitterZ = enemy.aggro > 0 ? (Math.cos(elapsed * 53) * 0.022) : 0;
      const hoverY = Math.sin(elapsed * 3.8) * 0.025;
      const ex = enemy.x + jitterX;
      const ez = enemy.z + jitterZ;
      const clownH = 1.94;
      const clownW = clownH * this.clownAspect;
      const billYaw = Math.atan2(camera.eye[0] - ex, camera.eye[2] - ez);

      translucent.push({
        type: 'quad',
        pos: [ex, clownH / 2 + hoverY, ez],
        rotY: billYaw,
        scale: [clownW, clownH, 1],
        tex: this.clownTex,
        unlitSprite: true,
        alphaCutoff: 0.04,
        doubleSided: true
      });

      // Draw all dynamic opaque items
      for (let i = 0; i < opaque.length; i++) {
        this.engine.drawItem(opaque[i]);
      }

      // Sort translucent billboards back-to-front by distance to camera
      translucent.sort((a, b) => {
        const da = (a.pos[0] - camera.eye[0]) ** 2 + (a.pos[2] - camera.eye[2]) ** 2;
        const db = (b.pos[0] - camera.eye[0]) ** 2 + (b.pos[2] - camera.eye[2]) ** 2;
        return db - da;
      });

      for (let i = 0; i < translucent.length; i++) {
        this.engine.drawItem(translucent[i]);
      }
    }
  }

  NC.TheatreWorld = TheatreWorld;
})(window.NoirCircus);
