(() => {
  initNebulaLoader();

  function initNebulaLoader() {
    const overlay = document.getElementById("loaderOverlay");
    const loaderCanvas = document.getElementById("loaderCanvas");
    const tagline = document.getElementById("loaderTagline");
    const ThreeLib = window.THREE;

    if (!overlay || !loaderCanvas || !ThreeLib) {
      document.body.classList.remove("is-loading");
      return;
    }

    const isMobileLoader = window.matchMedia("(max-width: 768px), (hover: none) and (pointer: coarse)").matches;
    const reducedMotionLoader = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const loaderRenderer = new ThreeLib.WebGLRenderer({
      canvas: loaderCanvas,
      antialias: !isMobileLoader,
      alpha: true,
      powerPreference: "high-performance"
    });
    loaderRenderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobileLoader ? 1.15 : 1.6));
    loaderRenderer.setSize(window.innerWidth, window.innerHeight, false);
    loaderRenderer.outputColorSpace = ThreeLib.SRGBColorSpace;
    loaderRenderer.toneMapping = ThreeLib.ACESFilmicToneMapping;
    loaderRenderer.toneMappingExposure = 1.03;
    loaderRenderer.useLegacyLights = false;

    const loaderScene = new ThreeLib.Scene();
    const loaderCamera = new ThreeLib.PerspectiveCamera(56, window.innerWidth / window.innerHeight, 0.1, 180);
    const loaderBaseCameraZ = isMobileLoader ? 18 : 15;
    loaderCamera.position.z = loaderBaseCameraZ;

    const ambient = new ThreeLib.AmbientLight(0xc8d4e2, 0.34);
    const key = new ThreeLib.PointLight(0xe4ecff, 2.15, 120, 2);
    key.position.set(4, 2, 8);
    const fill = new ThreeLib.PointLight(0x8ca0bb, 0.95, 120, 2);
    fill.position.set(-7, -2, 6);
    const warmRim = new ThreeLib.PointLight(0xffd6a8, 0.5, 140, 2);
    warmRim.position.set(7, -1, -6);
    const galaxyKey = new ThreeLib.PointLight(0xbecfe2, 0.75, 150, 2);
    galaxyKey.position.set(-9, 4, -8);
    loaderScene.add(ambient, key, fill, warmRim, galaxyKey);

    const maxAnisotropy = Math.min(loaderRenderer.capabilities.getMaxAnisotropy(), isMobileLoader ? 2 : 6);
    const particleTexture = createParticleTexture(isMobileLoader ? 112 : 160, maxAnisotropy);

    const galaxyGroup = new ThreeLib.Group();
    galaxyGroup.rotation.x = isMobileLoader ? 0.84 : 0.78;
    galaxyGroup.rotation.z = -0.2;
    loaderScene.add(galaxyGroup);

    const galaxyCore = createCoreSprite(isMobileLoader ? 5.8 : 6.8);
    galaxyGroup.add(galaxyCore);

    const galaxyArms = createGalaxyPoints({
      count: isMobileLoader ? 2200 : 4200,
      arms: 4,
      radius: isMobileLoader ? 6.8 : 7.8,
      twist: 1.3,
      armJitter: 1.3,
      height: 0.55,
      noise: 0.35,
      radiusPower: 0.62,
      size: isMobileLoader ? 0.08 : 0.095,
      opacity: 0.95,
      innerColor: 0xfff0da,
      outerColor: 0x8ca7bf
    });
    galaxyGroup.add(galaxyArms);

    const galaxyDust = createGalaxyPoints({
      count: isMobileLoader ? 900 : 1700,
      arms: 5,
      radius: isMobileLoader ? 8.2 : 9.1,
      twist: 0.9,
      armJitter: 2.1,
      height: 1.1,
      noise: 0.65,
      radiusPower: 0.8,
      size: isMobileLoader ? 0.1 : 0.125,
      opacity: 0.28,
      innerColor: 0xd9d2c7,
      outerColor: 0x73859b
    });
    galaxyGroup.add(galaxyDust);

    const stars = createLoaderPoints({
      count: isMobileLoader ? 760 : 1450,
      radiusMin: 20,
      radiusMax: 88,
      size: isMobileLoader ? 0.065 : 0.085,
      hueBase: 0.59,
      hueRange: 0.05,
      saturation: 0.2,
      lightMin: 0.72,
      lightRange: 0.18,
      opacity: 0.84
    });
    loaderScene.add(stars);

    const planetSystem = createPlanetSystem();
    loaderScene.add(planetSystem.group);

    function createParticleTexture(size, anisotropy) {
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      const mid = size * 0.5;

      const glow = ctx.createRadialGradient(mid, mid, 0, mid, mid, mid);
      glow.addColorStop(0, "rgba(255,255,255,1)");
      glow.addColorStop(0.24, "rgba(245,248,255,0.95)");
      glow.addColorStop(0.56, "rgba(194,213,234,0.58)");
      glow.addColorStop(0.78, "rgba(151,170,192,0.2)");
      glow.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, size, size);

      const texture = new ThreeLib.CanvasTexture(canvas);
      texture.colorSpace = ThreeLib.SRGBColorSpace;
      texture.anisotropy = anisotropy;
      texture.needsUpdate = true;
      return texture;
    }

    function createPlanetSystem() {
      const group = new ThreeLib.Group();
      const textures = [];
      const materials = [];
      const geometries = [];
      let isDisposed = false;

      function trackTexture(texture) {
        texture.anisotropy = maxAnisotropy;
        texture.needsUpdate = true;
        textures.push(texture);
        return texture;
      }
      function trackMaterial(material) {
        materials.push(material);
        return material;
      }
      function trackGeometry(geometry) {
        geometries.push(geometry);
        return geometry;
      }

      const gasPivot = new ThreeLib.Group();
      gasPivot.position.set(isMobileLoader ? -4.9 : -6.2, isMobileLoader ? 2.2 : 2.8, -4.4);
      gasPivot.rotation.z = 0.27;
      group.add(gasPivot);

      const gasTextureSize = isMobileLoader ? 240 : 360;
      const gasDiffuse = trackTexture(createGasTexture(gasTextureSize));
      const gasCloudsTexture = trackTexture(createGasCloudTexture(gasTextureSize));
      gasDiffuse.colorSpace = ThreeLib.SRGBColorSpace;
      gasCloudsTexture.colorSpace = ThreeLib.SRGBColorSpace;

      const gasSphere = new ThreeLib.Mesh(
        trackGeometry(new ThreeLib.SphereGeometry(isMobileLoader ? 1.05 : 1.25, isMobileLoader ? 52 : 84, isMobileLoader ? 52 : 84)),
        trackMaterial(new ThreeLib.MeshStandardMaterial({
          map: gasDiffuse,
          roughness: 0.9,
          metalness: 0.02,
          emissive: new ThreeLib.Color(0x0c0f14),
          emissiveIntensity: 0.08
        }))
      );
      gasPivot.add(gasSphere);

      const gasClouds = new ThreeLib.Mesh(
        trackGeometry(new ThreeLib.SphereGeometry(isMobileLoader ? 1.075 : 1.275, isMobileLoader ? 40 : 72, isMobileLoader ? 40 : 72)),
        trackMaterial(new ThreeLib.MeshStandardMaterial({
          map: gasCloudsTexture,
          transparent: true,
          opacity: 0.24,
          depthWrite: false,
          roughness: 1,
          metalness: 0
        }))
      );
      gasPivot.add(gasClouds);

      const gasAtmosphere = new ThreeLib.Mesh(
        trackGeometry(new ThreeLib.SphereGeometry(isMobileLoader ? 1.12 : 1.33, isMobileLoader ? 40 : 64, isMobileLoader ? 40 : 64)),
        trackMaterial(new ThreeLib.ShaderMaterial({
          transparent: true,
          depthWrite: false,
          blending: ThreeLib.AdditiveBlending,
          uniforms: { color: { value: new ThreeLib.Color(0xc7d4e3) } },
          vertexShader: `
            varying vec3 vNormal;
            void main() {
              vNormal = normalize(normalMatrix * normal);
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
          `,
          fragmentShader: `
            varying vec3 vNormal;
            uniform vec3 color;
            void main() {
              float intensity = pow(0.68 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 3.0);
              gl_FragColor = vec4(color, intensity * 0.36);
            }
          `
        }))
      );
      gasPivot.add(gasAtmosphere);

      const ringTexture = trackTexture(createRingTexture(isMobileLoader ? 512 : 768));
      ringTexture.colorSpace = ThreeLib.SRGBColorSpace;
      const ring = new ThreeLib.Mesh(
        trackGeometry(new ThreeLib.RingGeometry(isMobileLoader ? 1.45 : 1.7, isMobileLoader ? 2.35 : 2.75, isMobileLoader ? 80 : 128)),
        trackMaterial(new ThreeLib.MeshBasicMaterial({
          map: ringTexture,
          transparent: true,
          opacity: 0.62,
          side: ThreeLib.DoubleSide,
          depthWrite: false
        }))
      );
      ring.rotation.x = Math.PI * 0.48;
      ring.rotation.z = 0.22;
      gasPivot.add(ring);

      const rockyPivot = new ThreeLib.Group();
      rockyPivot.position.set(isMobileLoader ? 4.2 : 5.5, isMobileLoader ? -2.3 : -2.9, -3.1);
      rockyPivot.rotation.z = -0.18;
      group.add(rockyPivot);

      const rockyTextureSize = isMobileLoader ? 192 : 320;
      const rockyDiffuse = trackTexture(createRockyTexture(rockyTextureSize));
      rockyDiffuse.colorSpace = ThreeLib.SRGBColorSpace;
      const rockyPlanet = new ThreeLib.Mesh(
        trackGeometry(new ThreeLib.SphereGeometry(isMobileLoader ? 0.64 : 0.78, isMobileLoader ? 42 : 62, isMobileLoader ? 42 : 62)),
        trackMaterial(new ThreeLib.MeshStandardMaterial({
          map: rockyDiffuse,
          roughness: 0.96,
          metalness: 0.01,
          emissive: new ThreeLib.Color(0x0e0f10),
          emissiveIntensity: 0.08
        }))
      );
      rockyPivot.add(rockyPlanet);

      const moonOrbit = new ThreeLib.Group();
      moonOrbit.rotation.x = 0.26;
      rockyPivot.add(moonOrbit);

      const moonDiffuse = trackTexture(createMoonTexture(isMobileLoader ? 144 : 224));
      moonDiffuse.colorSpace = ThreeLib.SRGBColorSpace;
      const moon = new ThreeLib.Mesh(
        trackGeometry(new ThreeLib.SphereGeometry(isMobileLoader ? 0.18 : 0.24, isMobileLoader ? 30 : 46, isMobileLoader ? 30 : 46)),
        trackMaterial(new ThreeLib.MeshStandardMaterial({
          map: moonDiffuse,
          roughness: 1,
          metalness: 0
        }))
      );
      moon.position.set(isMobileLoader ? 1.05 : 1.28, 0.12, 0);
      moonOrbit.add(moon);

      loadNasaPlanetMaps()
        .then((maps) => {
          if (!maps || isDisposed) return;
          gasSphere.material.map = maps.jupiterMap;
          gasSphere.material.bumpMap = maps.jupiterBump;
          gasSphere.material.bumpScale = 0.014;
          gasSphere.material.needsUpdate = true;

          rockyPlanet.material.map = maps.marsMap;
          rockyPlanet.material.bumpMap = maps.marsBump;
          rockyPlanet.material.bumpScale = 0.03;
          rockyPlanet.material.needsUpdate = true;

          moon.material.map = maps.moonMap;
          moon.material.bumpMap = maps.moonBump;
          moon.material.bumpScale = 0.02;
          moon.material.needsUpdate = true;
        })
        .catch(() => {
          // Keep procedural fallback maps when external imagery is unavailable.
        });

      function createGasTexture(size) {
        const canvas = document.createElement("canvas");
        const width = size * 2;
        const height = size;
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");

        for (let y = 0; y < height; y++) {
          const v = y / height;
          const bandA = Math.sin(v * 32) * 0.5 + 0.5;
          const bandB = Math.sin(v * 87 + 1.6) * 0.5 + 0.5;
          const drift = Math.sin(v * 14 + bandB * 2.2) * 0.5 + 0.5;
          const hue = 34 + bandA * 11 + bandB * 5 - drift * 3;
          const sat = 26 + bandB * 16;
          const light = 33 + bandA * 16 + bandB * 10;
          ctx.fillStyle = `hsl(${hue}, ${sat}%, ${light}%)`;
          ctx.fillRect(0, y, width, 1);
        }

        ctx.globalCompositeOperation = "screen";
        for (let i = 0; i < 18; i++) {
          const sx = Math.random() * width;
          const sy = Math.random() * height;
          const sw = width * (0.05 + Math.random() * 0.14);
          const sh = height * (0.015 + Math.random() * 0.045);
          const grad = ctx.createRadialGradient(sx, sy, 0, sx, sy, sw);
          grad.addColorStop(0, "rgba(255,239,215,0.26)");
          grad.addColorStop(1, "rgba(255,239,215,0)");
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.ellipse(sx, sy, sw, sh, Math.random() * Math.PI, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalCompositeOperation = "source-over";

        return new ThreeLib.CanvasTexture(canvas);
      }

      function loadNasaPlanetMaps() {
        if (typeof loadImage !== "function") {
          return Promise.reject(new Error("loadImage unavailable"));
        }

        const jupiterUrl = "https://upload.wikimedia.org/wikipedia/commons/5/5a/Jupiter_by_Cassini-Huygens.jpg";
        const marsUrl = "https://upload.wikimedia.org/wikipedia/commons/0/02/OSIRIS_Mars_true_color.jpg";
        const moonUrl = "https://upload.wikimedia.org/wikipedia/commons/e/e1/FullMoon2010.jpg";

        return Promise.all([loadImage(jupiterUrl), loadImage(marsUrl), loadImage(moonUrl)]).then(
          ([jupiterImg, marsImg, moonImg]) => {
            if (isDisposed) return null;

            const jupiterWidth = isMobileLoader ? 1024 : 1536;
            const jupiterHeight = jupiterWidth / 2;
            const marsWidth = isMobileLoader ? 768 : 1024;
            const marsHeight = marsWidth / 2;
            const moonWidth = isMobileLoader ? 512 : 768;
            const moonHeight = moonWidth / 2;

            const jupiterMap = trackTexture(createCanvasTextureFromImage(jupiterImg, jupiterWidth, jupiterHeight, true));
            const marsMap = trackTexture(createCanvasTextureFromImage(marsImg, marsWidth, marsHeight, true));
            const moonMap = trackTexture(createCanvasTextureFromImage(moonImg, moonWidth, moonHeight, true));
            const jupiterBump = trackTexture(createBumpTextureFromImage(jupiterImg, jupiterWidth, jupiterHeight, 14));
            const marsBump = trackTexture(createBumpTextureFromImage(marsImg, marsWidth, marsHeight, 24));
            const moonBump = trackTexture(createBumpTextureFromImage(moonImg, moonWidth, moonHeight, 30));

            return { jupiterMap, marsMap, moonMap, jupiterBump, marsBump, moonBump };
          }
        );
      }

      function createCanvasTextureFromImage(image, width, height, srgb) {
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(image, 0, 0, width, height);
        const texture = new ThreeLib.CanvasTexture(canvas);
        if (srgb) texture.colorSpace = ThreeLib.SRGBColorSpace;
        return texture;
      }

      function createBumpTextureFromImage(image, width, height, boost) {
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(image, 0, 0, width, height);
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
          const luma = data[i] * 0.3 + data[i + 1] * 0.59 + data[i + 2] * 0.11;
          const value = Math.max(0, Math.min(255, luma + boost));
          data[i] = value;
          data[i + 1] = value;
          data[i + 2] = value;
          data[i + 3] = 255;
        }
        ctx.putImageData(imageData, 0, 0);
        return new ThreeLib.CanvasTexture(canvas);
      }

      function createGasCloudTexture(size) {
        const canvas = document.createElement("canvas");
        const width = size * 2;
        const height = size;
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");

        ctx.clearRect(0, 0, width, height);
        for (let i = 0; i < 140; i++) {
          const x = Math.random() * width;
          const y = Math.random() * height;
          const rx = width * (0.02 + Math.random() * 0.06);
          const ry = height * (0.01 + Math.random() * 0.03);
          const alpha = 0.02 + Math.random() * 0.09;
          ctx.fillStyle = `rgba(245,247,255,${alpha})`;
          ctx.beginPath();
          ctx.ellipse(x, y, rx, ry, Math.random() * Math.PI, 0, Math.PI * 2);
          ctx.fill();
        }
        return new ThreeLib.CanvasTexture(canvas);
      }

      function createRingTexture(size) {
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        const center = size * 0.5;
        const radius = size * 0.5;

        const grad = ctx.createRadialGradient(center, center, radius * 0.32, center, center, radius);
        grad.addColorStop(0, "rgba(247,237,218,0)");
        grad.addColorStop(0.28, "rgba(247,237,218,0.12)");
        grad.addColorStop(0.52, "rgba(206,191,160,0.75)");
        grad.addColorStop(0.72, "rgba(174,156,126,0.36)");
        grad.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, size, size);

        return new ThreeLib.CanvasTexture(canvas);
      }

      function createRockyTexture(size) {
        const canvas = document.createElement("canvas");
        const width = size * 2;
        const height = size;
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        const image = ctx.createImageData(width, height);
        const data = image.data;

        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const index = (y * width + x) * 4;
            const nx = x / width;
            const ny = y / height;
            const n1 = hashNoise(nx * 9.7, ny * 11.3);
            const n2 = hashNoise(nx * 21.9 + 17.1, ny * 18.4 + 9.5);
            const n3 = hashNoise(nx * 45.7 + 3.2, ny * 39.1 + 4.8);
            const value = n1 * 0.5 + n2 * 0.33 + n3 * 0.17;
            const shade = 52 + value * 124;
            data[index] = shade * 0.92;
            data[index + 1] = shade * 0.84;
            data[index + 2] = shade * 0.74;
            data[index + 3] = 255;
          }
        }
        ctx.putImageData(image, 0, 0);

        for (let i = 0; i < 35; i++) {
          const x = Math.random() * width;
          const y = Math.random() * height;
          const r = size * (0.012 + Math.random() * 0.055);
          const crater = ctx.createRadialGradient(x, y, r * 0.15, x, y, r);
          crater.addColorStop(0, "rgba(60,44,28,0.44)");
          crater.addColorStop(0.7, "rgba(42,30,20,0.2)");
          crater.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = crater;
          ctx.beginPath();
          ctx.arc(x, y, r, 0, Math.PI * 2);
          ctx.fill();
        }

        return new ThreeLib.CanvasTexture(canvas);
      }

      function createMoonTexture(size) {
        const canvas = document.createElement("canvas");
        const width = size * 2;
        const height = size;
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        const image = ctx.createImageData(width, height);
        const data = image.data;

        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const index = (y * width + x) * 4;
            const nx = x / width;
            const ny = y / height;
            const n = hashNoise(nx * 24.2, ny * 24.2) * 0.58 + hashNoise(nx * 46.7 + 3.4, ny * 41.9 + 1.5) * 0.42;
            const shade = 108 + n * 96;
            data[index] = shade * 0.94;
            data[index + 1] = shade * 0.94;
            data[index + 2] = shade * 0.93;
            data[index + 3] = 255;
          }
        }
        ctx.putImageData(image, 0, 0);

        return new ThreeLib.CanvasTexture(canvas);
      }

      function hashNoise(x, y) {
        const v = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
        return v - Math.floor(v);
      }

      function dispose() {
        isDisposed = true;
        geometries.forEach((geometry) => geometry.dispose());
        materials.forEach((material) => material.dispose());
        textures.forEach((texture) => texture.dispose());
      }

      return { group, gasPivot, gasSphere, gasClouds, ring, rockyPivot, rockyPlanet, moonOrbit, moon, dispose };
    }

    function createCoreSprite(size) {
      const coreCanvas = document.createElement("canvas");
      const coreSize = 256;
      coreCanvas.width = coreSize;
      coreCanvas.height = coreSize;
      const ctx = coreCanvas.getContext("2d");
      const center = coreSize / 2;
      const gradient = ctx.createRadialGradient(center, center, 0, center, center, center);
      gradient.addColorStop(0, "rgba(255,247,230,0.99)");
      gradient.addColorStop(0.2, "rgba(255,214,150,0.82)");
      gradient.addColorStop(0.52, "rgba(188,207,225,0.34)");
      gradient.addColorStop(0.74, "rgba(132,151,171,0.12)");
      gradient.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, coreSize, coreSize);

      const texture = new ThreeLib.CanvasTexture(coreCanvas);
      texture.colorSpace = ThreeLib.SRGBColorSpace;
      const material = new ThreeLib.SpriteMaterial({
        map: texture,
        color: 0xffffff,
        transparent: true,
        opacity: 0.82,
        depthWrite: false,
        blending: ThreeLib.AdditiveBlending
      });
      const sprite = new ThreeLib.Sprite(material);
      sprite.scale.set(size, size, 1);
      return sprite;
    }

    function createGalaxyPoints(config) {
      const positions = new Float32Array(config.count * 3);
      const colors = new Float32Array(config.count * 3);
      const inner = new ThreeLib.Color(config.innerColor);
      const outer = new ThreeLib.Color(config.outerColor);
      const mixed = new ThreeLib.Color();

      for (let i = 0; i < config.count; i++) {
        const i3 = i * 3;
        const armIndex = i % config.arms;
        const radiusNorm = Math.pow(Math.random(), config.radiusPower);
        const distance = radiusNorm * config.radius;
        const baseAngle = (armIndex / config.arms) * Math.PI * 2;
        const swirl = distance * config.twist;
        const jitterAngle = (Math.random() - 0.5) * config.armJitter * (1 + distance * 0.12);
        const angle = baseAngle + swirl + jitterAngle;

        const spread = 1 + radiusNorm * 1.5;
        positions[i3] = Math.cos(angle) * distance + ThreeLib.MathUtils.randFloatSpread(config.noise * spread);
        positions[i3 + 1] = ThreeLib.MathUtils.randFloatSpread(config.height * (1.08 - radiusNorm));
        positions[i3 + 2] = Math.sin(angle) * distance + ThreeLib.MathUtils.randFloatSpread(config.noise * spread);

        mixed.copy(inner).lerp(outer, radiusNorm);
        mixed.offsetHSL((Math.random() - 0.5) * 0.015, 0, (Math.random() - 0.5) * 0.04);
        colors[i3] = mixed.r;
        colors[i3 + 1] = mixed.g;
        colors[i3 + 2] = mixed.b;
      }

      const geometry = new ThreeLib.BufferGeometry();
      geometry.setAttribute("position", new ThreeLib.BufferAttribute(positions, 3));
      geometry.setAttribute("color", new ThreeLib.BufferAttribute(colors, 3));

      const material = new ThreeLib.PointsMaterial({
        size: config.size,
        sizeAttenuation: true,
        map: particleTexture,
        vertexColors: true,
        transparent: true,
        opacity: config.opacity,
        alphaTest: 0.015,
        depthWrite: false,
        blending: ThreeLib.AdditiveBlending
      });

      return new ThreeLib.Points(geometry, material);
    }

    function createLoaderPoints(config) {
      const positions = new Float32Array(config.count * 3);
      const colors = new Float32Array(config.count * 3);

      for (let i = 0; i < config.count; i++) {
        const i3 = i * 3;
        const r = ThreeLib.MathUtils.randFloat(config.radiusMin, config.radiusMax);
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(ThreeLib.MathUtils.randFloatSpread(2));

        positions[i3] = r * Math.sin(phi) * Math.cos(theta);
        positions[i3 + 1] = r * Math.cos(phi);
        positions[i3 + 2] = r * Math.sin(phi) * Math.sin(theta);

        const color = new ThreeLib.Color().setHSL(
          config.hueBase + (Math.random() - 0.5) * config.hueRange,
          config.saturation ?? 0.35,
          (config.lightMin ?? 0.68) + Math.random() * (config.lightRange ?? 0.2)
        );
        colors[i3] = color.r;
        colors[i3 + 1] = color.g;
        colors[i3 + 2] = color.b;
      }

      const geo = new ThreeLib.BufferGeometry();
      geo.setAttribute("position", new ThreeLib.BufferAttribute(positions, 3));
      geo.setAttribute("color", new ThreeLib.BufferAttribute(colors, 3));

      const mat = new ThreeLib.PointsMaterial({
        size: config.size,
        map: particleTexture,
        sizeAttenuation: true,
        vertexColors: true,
        transparent: true,
        opacity: config.opacity,
        alphaTest: 0.015,
        depthWrite: false,
        blending: ThreeLib.AdditiveBlending
      });

      return new ThreeLib.Points(geo, mat);
    }

    let loaderRaf = 0;
    let loaderStart = performance.now();
    let loaderLast = loaderStart;
    let loaderExitStarted = false;
    let loaderExitAt = 0;
    let loaderHideTriggered = false;

    const loaderExitDuration = reducedMotionLoader ? 0 : 1900;
    const loaderExitScaleBoost = isMobileLoader ? 2.4 : 2.9;
    const loaderExitCameraTravel = isMobileLoader ? 12.5 : 11.2;

    function renderLoader(now) {
      loaderRaf = requestAnimationFrame(renderLoader);
      if (document.hidden) return;

      const dt = Math.min((now - loaderLast) / 1000, 0.05);
      loaderLast = now;
      const t = (now - loaderStart) / 1000;

      let exitProgress = 0;
      if (loaderExitStarted && loaderExitDuration > 0) {
        exitProgress = Math.min((now - loaderExitAt) / loaderExitDuration, 1);
      } else if (loaderExitStarted) {
        exitProgress = 1;
      }
      const exitEase = exitProgress < 0.5
        ? 4 * Math.pow(exitProgress, 3)
        : 1 - Math.pow(-2 * exitProgress + 2, 3) / 2;

      const targetTilt = (isMobileLoader ? 0.84 : 0.78) + Math.sin(t * 0.28) * 0.018;
      galaxyGroup.rotation.y += dt * (0.16 + exitEase * 0.22);
      galaxyGroup.rotation.x += (targetTilt - galaxyGroup.rotation.x) * 0.035;
      galaxyGroup.rotation.z = -0.2 + Math.sin(t * 0.45) * 0.015;
      galaxyGroup.scale.setScalar(1 + exitEase * loaderExitScaleBoost);

      const corePulse = 0.82 + Math.sin(t * 2.1) * 0.08;
      galaxyCore.material.opacity = corePulse;

      stars.rotation.y += dt * (0.01 + exitEase * 0.05);
      stars.rotation.x = Math.sin(t * 0.18) * 0.04;

      planetSystem.gasPivot.rotation.y += dt * (0.11 + exitEase * 0.18);
      planetSystem.gasSphere.rotation.y += dt * 0.18;
      planetSystem.gasClouds.rotation.y += dt * 0.24;
      planetSystem.ring.rotation.z = 0.22 + Math.sin(t * 0.32) * 0.06;

      planetSystem.rockyPivot.rotation.y -= dt * 0.14;
      planetSystem.rockyPlanet.rotation.y += dt * 0.2;
      planetSystem.moonOrbit.rotation.y += dt * 0.52;
      planetSystem.moon.rotation.y += dt * 0.16;

      loaderCamera.position.z = loaderBaseCameraZ - exitEase * loaderExitCameraTravel;
      loaderCamera.position.x = Math.sin(t * 0.1) * (isMobileLoader ? 0.18 : 0.28);
      loaderCamera.position.y = Math.cos(t * 0.12) * (isMobileLoader ? 0.12 : 0.18);
      loaderCamera.lookAt(0, 0, 0);

      if (loaderExitStarted && !loaderHideTriggered && exitProgress >= 0.76) {
        hideLoader();
      }

      if (tagline && !reducedMotionLoader) {
        tagline.style.setProperty("--tag-rx", `${14 + Math.sin(t * 1.1) * 5}deg`);
        tagline.style.setProperty("--tag-ry", `${Math.cos(t * 0.9) * 8}deg`);
        tagline.style.setProperty("--tag-z", `${-130 + Math.sin(t * 1.6) * 16}px`);
        tagline.style.setProperty("--tag-scale", `${(1 + Math.sin(t * 2.1) * 0.03).toFixed(3)}`);
      }

      loaderRenderer.render(loaderScene, loaderCamera);
    }

    function onLoaderResize() {
      const w = window.innerWidth;
      const h = window.innerHeight;
      loaderRenderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobileLoader ? 1.15 : 1.6));
      loaderRenderer.setSize(w, h, false);
      loaderCamera.aspect = w / h;
      loaderCamera.updateProjectionMatrix();
    }

    function disposeLoaderScene() {
      cancelAnimationFrame(loaderRaf);
      window.removeEventListener("resize", onLoaderResize);
      [galaxyArms, galaxyDust, stars].forEach((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) obj.material.dispose();
        loaderScene.remove(obj);
      });
      loaderScene.remove(planetSystem.group);
      planetSystem.dispose();
      if (galaxyCore.material) {
        if (galaxyCore.material.map) galaxyCore.material.map.dispose();
        galaxyCore.material.dispose();
      }
      galaxyGroup.remove(galaxyCore);
      loaderScene.remove(galaxyGroup);
      particleTexture.dispose();
      loaderRenderer.dispose();
    }

    function hideLoader() {
      if (loaderHideTriggered) return;
      loaderHideTriggered = true;
      overlay.classList.add("is-hidden");
      document.body.classList.remove("is-loading");
      window.setTimeout(() => {
        disposeLoaderScene();
        overlay.remove();
      }, 950);
    }

    function startLoaderExit() {
      if (loaderExitStarted) return;
      loaderExitStarted = true;
      loaderExitAt = performance.now();
      if (reducedMotionLoader) {
        hideLoader();
      }
    }

    window.addEventListener("resize", onLoaderResize, { passive: true });
    loaderRaf = requestAnimationFrame(renderLoader);

    const previousOnload = window.onload;
    window.onload = function onWindowLoad(event) {
      if (typeof previousOnload === "function") {
        previousOnload.call(window, event);
      }
      const minVisible = 3000;
      const elapsed = performance.now() - loaderStart;
      const delay = Math.max(0, minVisible - elapsed);
      window.setTimeout(startLoaderExit, delay);
    };

    if (document.readyState === "complete") {
      const minVisible = 3000;
      const elapsed = performance.now() - loaderStart;
      const delay = Math.max(0, minVisible - elapsed);
      window.setTimeout(startLoaderExit, delay);
    }
  }

  const canvas = document.getElementById("globe");
  const container = canvas.parentElement;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  const mobileQuery = window.matchMedia("(max-width: 640px), (hover: none) and (pointer: coarse)");
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, mobileQuery.matches ? 1.25 : 1.85));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  camera.position.z = 3.1;

  const ambient = new THREE.AmbientLight(0xffffff, 0.55);
  scene.add(ambient);

  const key = new THREE.DirectionalLight(0xffffff, 1.35);
  key.position.set(3, 2, 2);
  scene.add(key);

  const rim = new THREE.DirectionalLight(0x9ad1ff, 0.55);
  rim.position.set(-3, -1.5, -2);
  scene.add(rim);

  const globeGroup = new THREE.Group();
  scene.add(globeGroup);

  const earthSegments = mobileQuery.matches ? 96 : 160;
  const cloudSegments = mobileQuery.matches ? 72 : 128;
  const atmosphereSegments = mobileQuery.matches ? 44 : 64;
  const geo = new THREE.SphereGeometry(1, earthSegments, earthSegments);

  const earthMat = new THREE.MeshPhongMaterial({
    color: 0xffffff,
    specular: new THREE.Color(0x8fcfff),
    shininess: 16
  });
  const earth = new THREE.Mesh(geo, earthMat);
  globeGroup.add(earth);

  const cloudsMat = new THREE.MeshPhongMaterial({
    transparent: true,
    opacity: 0.65,
    depthWrite: false
  });
  const clouds = new THREE.Mesh(new THREE.SphereGeometry(1.02, cloudSegments, cloudSegments), cloudsMat);
  globeGroup.add(clouds);

  const atmosphere = new THREE.Mesh(
    new THREE.SphereGeometry(1.06, atmosphereSegments, atmosphereSegments),
    new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { color: { value: new THREE.Color(0x6bb8ff) } },
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        uniform vec3 color;
        void main() {
          float intensity = pow(0.6 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
          gl_FragColor = vec4(color, intensity);
        }
      `
    })
  );
  globeGroup.add(atmosphere);


  function resize() {
    const { width, height } = container.getBoundingClientRect();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, mobileQuery.matches ? 1.25 : 1.85));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }
  window.addEventListener("resize", resize);
  resize();

  const lebanonLat = 33.8547;
  const lebanonLon = 35.8623;
  const lebanonTarget = {
    x: THREE.MathUtils.degToRad(lebanonLat),
    y: THREE.MathUtils.degToRad(-lebanonLon - 90)
  };

  let currentX = globeGroup.rotation.x;
  let currentY = globeGroup.rotation.y;
  let spinY = currentY;
  let mobileFocus = 0;
  let hoverX = 0;
  let hoverY = 0;
  let hoverActive = false;
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const milkyway = document.querySelector(".milkyway-galaxy");
  let galaxyLoaded = false;

  initRotatingFavicon();

  // Galaxy mouse tracking
  let galaxyMouseX = 0;
  let galaxyMouseY = 0;
  let galaxyTargetX = 0;
  let galaxyTargetY = 0;
  let galaxyScrollX = 0;
  let galaxyScrollY = 0;
  let galaxyScrollRotate = -14;
  let galaxyCurrentX = 0;
  let galaxyCurrentY = 0;
  let galaxyCurrentRotate = -14;
  let lastFrameTime = 0;
  let lastScrollFrameAt = 0;
  let globeVisible = true;
  let scrollBounce = 0;
  let scrollBounceTarget = 0;
  let lastScrollTopValue = window.scrollY || window.pageYOffset || 0;
  let lastScrollSampleTime = performance.now();

  const globeObserver = new IntersectionObserver(
    (entries) => {
      globeVisible = entries.some((entry) => entry.isIntersecting);
    },
    { threshold: 0.02 }
  );
  globeObserver.observe(container);

  document.addEventListener("mousemove", (e) => {
    if (mobileQuery.matches || prefersReducedMotion) return;
    const x = (e.clientX / window.innerWidth - 0.5) * 2;
    const y = (e.clientY / window.innerHeight - 0.5) * 2;
    galaxyTargetX = x * 16;
    galaxyTargetY = y * 10;
  });

  container.addEventListener("mouseenter", () => {
    hoverActive = true;
  });

  container.addEventListener("mouseleave", () => {
    hoverActive = false;
    hoverX = 0;
    hoverY = 0;
    spinY = currentY;
  });

  container.addEventListener("mousemove", (event) => {
    if (mobileQuery.matches) return;
    const rect = container.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    hoverY = x * 1.2;
    hoverX = -y * 0.9;
  });

  function animate(frameTime = 0) {
    requestAnimationFrame(animate);
    if (document.hidden) return;

    const frameBudget = mobileQuery.matches ? 1000 / 24 : 1000 / 50;
    if (frameTime - lastFrameTime < frameBudget) return;
    lastFrameTime = frameTime;

    spinY += mobileQuery.matches ? 0.0016 : 0.0028;
    const baseX = Math.sin(frameTime * 0.0002) * 0.03;
    const baseY = spinY;

    if (mobileQuery.matches) {
      const targetX = lerpAngle(baseX, lebanonTarget.x, mobileFocus);
      const targetY = lerpAngle(baseY, lebanonTarget.y, mobileFocus);
      currentX = lerpAngle(currentX, targetX, 0.1);
      currentY = lerpAngle(currentY, targetY, 0.1);
    } else if (hoverActive) {
      const targetX = baseX + hoverX;
      const targetY = baseY + hoverY;
      currentX = lerpAngle(currentX, targetX, 0.22);
      currentY = lerpAngle(currentY, targetY, 0.22);
    } else {
      currentX = lerpAngle(currentX, baseX, 0.06);
      currentY = lerpAngle(currentY, baseY, 0.06);
    }

    globeGroup.rotation.set(currentX, currentY, 0);
    container.classList.toggle("show-label", mobileQuery.matches && mobileFocus > 0.15);
    clouds.rotation.y += mobileQuery.matches ? 0.0011 : 0.0022;

    if (milkyway && galaxyLoaded) {
      if (prefersReducedMotion) {
        milkyway.style.setProperty("--galaxy-x", "0px");
        milkyway.style.setProperty("--galaxy-y", "0px");
        milkyway.style.setProperty("--galaxy-rotate", "-14deg");
      } else {
        const mouseEase = mobileQuery.matches ? 0.02 : 0.06;
        const blend = mobileQuery.matches ? 0.05 : 0.085;

        galaxyMouseX += (galaxyTargetX - galaxyMouseX) * mouseEase;
        galaxyMouseY += (galaxyTargetY - galaxyMouseY) * mouseEase;

        const targetX = galaxyScrollX + galaxyMouseX;
        const targetY = galaxyScrollY + galaxyMouseY;
        const targetRotate = galaxyScrollRotate + galaxyMouseX * 0.04;

        galaxyCurrentX += (targetX - galaxyCurrentX) * blend;
        galaxyCurrentY += (targetY - galaxyCurrentY) * blend;
        galaxyCurrentRotate += (targetRotate - galaxyCurrentRotate) * blend;

        milkyway.style.setProperty("--galaxy-x", `${galaxyCurrentX.toFixed(2)}px`);
        milkyway.style.setProperty("--galaxy-y", `${galaxyCurrentY.toFixed(2)}px`);
        milkyway.style.setProperty("--galaxy-rotate", `${galaxyCurrentRotate.toFixed(2)}deg`);
      }
    }

    if (!prefersReducedMotion) {
      scrollBounce += (scrollBounceTarget - scrollBounce) * 0.18;
      scrollBounceTarget *= 0.86;
      if (Math.abs(scrollBounce) < 0.03 && Math.abs(scrollBounceTarget) < 0.03) {
        scrollBounce = 0;
        scrollBounceTarget = 0;
      }
      document.documentElement.style.setProperty("--scroll-bounce", `${scrollBounce.toFixed(2)}px`);
    } else {
      document.documentElement.style.setProperty("--scroll-bounce", "0px");
    }

    if (globeVisible) {
      renderer.render(scene, camera);
    }
  }
  requestAnimationFrame(animate);

  function initRotatingFavicon() {
    const favicon = document.getElementById("site-favicon");
    if (!favicon || prefersReducedMotion || mobileQuery.matches) return;

    const iconCanvas = document.createElement("canvas");
    iconCanvas.width = 64;
    iconCanvas.height = 64;
    const ctx = iconCanvas.getContext("2d");
    if (!ctx) return;

    const mapCanvas = document.createElement("canvas");
    mapCanvas.width = 128;
    mapCanvas.height = 64;
    const mapCtx = mapCanvas.getContext("2d");
    if (!mapCtx) return;

    mapCtx.clearRect(0, 0, 128, 64);
    mapCtx.fillStyle = "#3fb56f";
    drawLand(mapCtx, 18, 20, 16, 10, -0.45);
    drawLand(mapCtx, 28, 39, 20, 13, 0.25);
    drawLand(mapCtx, 48, 28, 13, 8, -0.1);
    drawLand(mapCtx, 58, 44, 12, 8, 0.28);
    drawLand(mapCtx, 84, 22, 15, 9, -0.32);
    drawLand(mapCtx, 96, 38, 18, 12, 0.24);
    drawLand(mapCtx, 112, 27, 11, 7, -0.14);
    drawLand(mapCtx, 118, 46, 10, 7, 0.35);

    let last = 0;
    const frameMs = 1000 / 4;

    const tick = (time) => {
      if (!document.hidden && time - last >= frameMs && time - lastScrollFrameAt > 180) {
        last = time;
        renderIcon(time);
      }
      requestAnimationFrame(tick);
    };

    const renderIcon = (time) => {
      const cx = 32;
      const cy = 32;
      const radius = 25;
      const shift = (time * 0.008) % 128;
      const lightDrift = Math.sin(time * 0.0008) * 4;

      ctx.clearRect(0, 0, 64, 64);

      ctx.beginPath();
      ctx.ellipse(cx + 2, cy + 3, radius + 1, radius - 1, 0, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(0, 0, 0, 0.22)";
      ctx.fill();

      const ocean = ctx.createRadialGradient(cx - 9, cy - 10, 3, cx, cy, radius + 2);
      ocean.addColorStop(0, "#4ac1ff");
      ocean.addColorStop(0.55, "#1e79cf");
      ocean.addColorStop(1, "#0a356b");
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fillStyle = ocean;
      ctx.fill();

      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.clip();

      ctx.globalAlpha = 0.96;
      ctx.drawImage(mapCanvas, -shift, 0);
      ctx.drawImage(mapCanvas, 128 - shift, 0);

      const shade = ctx.createLinearGradient(cx - radius + lightDrift, 0, cx + radius + lightDrift, 0);
      shade.addColorStop(0, "rgba(0, 10, 28, 0.5)");
      shade.addColorStop(0.42, "rgba(0, 0, 0, 0.04)");
      shade.addColorStop(1, "rgba(0, 14, 34, 0.62)");
      ctx.fillStyle = shade;
      ctx.fillRect(0, 0, 64, 64);

      const gloss = ctx.createRadialGradient(cx - 10, cy - 10, 2, cx - 10, cy - 10, radius);
      gloss.addColorStop(0, "rgba(255, 255, 255, 0.26)");
      gloss.addColorStop(1, "rgba(255, 255, 255, 0)");
      ctx.fillStyle = gloss;
      ctx.fillRect(0, 0, 64, 64);
      ctx.restore();

      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(157, 219, 255, 0.82)";
      ctx.lineWidth = 1.8;
      ctx.stroke();

      try {
        favicon.href = iconCanvas.toDataURL("image/png");
      } catch (_error) {
        // Keep static SVG fallback favicon if data URLs are blocked.
      }
    };

    requestAnimationFrame(tick);
  }

  function drawLand(ctx, x, y, w, h, rot) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.beginPath();
    ctx.ellipse(0, 0, w, h, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  const nasaDiffuseUrl = "https://upload.wikimedia.org/wikipedia/commons/c/cd/Land_ocean_ice_2048.jpg";
  const nasaCloudsUrl = "https://upload.wikimedia.org/wikipedia/commons/6/6b/Land_ocean_ice_cloud_hires.jpg";

  loadNasaTextures(nasaDiffuseUrl, nasaCloudsUrl)
    .then((textures) => {
      earthMat.map = textures.diffuse;
      earthMat.bumpMap = textures.bump;
      earthMat.bumpScale = 0.02;
      earthMat.specularMap = textures.specular;
      earthMat.needsUpdate = true;

      cloudsMat.map = textures.clouds;
      cloudsMat.needsUpdate = true;

      // Improve texture filtering for smoother appearance
      const maxAniso = renderer.capabilities.getMaxAnisotropy();
      const targetAniso = mobileQuery.matches ? 2 : 6;
      [textures.diffuse, textures.bump, textures.specular, textures.clouds].forEach((tex) => {
        tex.anisotropy = Math.min(targetAniso, maxAniso);
        tex.minFilter = THREE.LinearMipMapLinearFilter;
        tex.magFilter = THREE.LinearFilter;
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.needsUpdate = true;
      });
    })
    .catch(() => {
      const fallback = createProceduralTextures(2048, 1024);
      earthMat.map = fallback.diffuse;
      earthMat.bumpMap = fallback.bump;
      earthMat.specularMap = fallback.specular;
      earthMat.needsUpdate = true;
      cloudsMat.map = fallback.clouds;
      cloudsMat.needsUpdate = true;
    });

  function loadNasaTextures(diffuseUrl, cloudsUrl) {
    return Promise.all([loadImage(diffuseUrl), loadImage(cloudsUrl)]).then(([diffuseImg, cloudsImg]) => {
      const width = mobileQuery.matches ? 1024 : 1536;
      const height = width / 2;
      const diffuse = createCanvasTexture(diffuseImg, width, height);
      const bump = createBumpFromDiffuse(diffuse, width, height);
      const specular = createSpecularFromDiffuse(diffuse, width, height);
      const clouds = createCloudTexture(cloudsImg, width, height);
      return { diffuse, bump, specular, clouds };
    });
  }

  function loadImage(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Failed to load ${url}`));
      img.src = url;
    });
  }

  function createCanvasTexture(image, width, height) {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(image, 0, 0, width, height);
    return new THREE.CanvasTexture(canvas);
  }

  function createBumpFromDiffuse(diffuseTexture, width, height) {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(diffuseTexture.image, 0, 0, width, height);
    const data = ctx.getImageData(0, 0, width, height);
    for (let i = 0; i < data.data.length; i += 4) {
      const r = data.data[i];
      const g = data.data[i + 1];
      const b = data.data[i + 2];
      const luma = r * 0.3 + g * 0.59 + b * 0.11;
      const bump = Math.min(255, Math.max(0, luma + 25));
      data.data[i] = bump;
      data.data[i + 1] = bump;
      data.data[i + 2] = bump;
      data.data[i + 3] = 255;
    }
    ctx.putImageData(data, 0, 0);
    return new THREE.CanvasTexture(canvas);
  }

  function createSpecularFromDiffuse(diffuseTexture, width, height) {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(diffuseTexture.image, 0, 0, width, height);
    const data = ctx.getImageData(0, 0, width, height);
    for (let i = 0; i < data.data.length; i += 4) {
      const r = data.data[i];
      const g = data.data[i + 1];
      const b = data.data[i + 2];
      const water = b > g + 10 && b > r + 10;
      const value = water ? 200 : 40;
      data.data[i] = value;
      data.data[i + 1] = value;
      data.data[i + 2] = value;
      data.data[i + 3] = 255;
    }
    ctx.putImageData(data, 0, 0);
    return new THREE.CanvasTexture(canvas);
  }

  function createCloudTexture(cloudsImg, width, height) {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(cloudsImg, 0, 0, width, height);
    const data = ctx.getImageData(0, 0, width, height);
    for (let i = 0; i < data.data.length; i += 4) {
      const r = data.data[i];
      const g = data.data[i + 1];
      const b = data.data[i + 2];
      const luma = r * 0.3 + g * 0.59 + b * 0.11;
      const alpha = luma > 180 ? Math.min((luma - 180) * 2.2, 255) : 0;
      data.data[i] = 255;
      data.data[i + 1] = 255;
      data.data[i + 2] = 255;
      data.data[i + 3] = alpha;
    }
    ctx.putImageData(data, 0, 0);
    return new THREE.CanvasTexture(canvas);
  }

  function createProceduralTextures(width, height) {
    const diffuse = document.createElement("canvas");
    diffuse.width = width;
    diffuse.height = height;
    const dctx = diffuse.getContext("2d");

    dctx.fillStyle = "#0b2a4a";
    dctx.fillRect(0, 0, width, height);

    return {
      diffuse: new THREE.CanvasTexture(diffuse),
      bump: new THREE.CanvasTexture(diffuse),
      specular: new THREE.CanvasTexture(diffuse),
      clouds: new THREE.CanvasTexture(diffuse)
    };
  }

  applyRevealUtilities();
  const reveals = Array.from(document.querySelectorAll(".reveal"));

  // Fade in galaxy after load
  if (milkyway) {
    const galaxyImg = new Image();
    galaxyImg.onload = () => {
      setTimeout(() => {
        milkyway.classList.add("is-loaded");
        galaxyLoaded = true;
      }, 500);
    };
    galaxyImg.src = "assets/milkyway.svg";
  }

  if (prefersReducedMotion) {
    reveals.forEach((el) => el.classList.add("is-visible"));
  } else {
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            revealObserver.unobserve(entry.target);
          }
        });
      },
      {
        root: null,
        rootMargin: mobileQuery.matches ? "0px 0px -8% 0px" : "0px 0px -12% 0px",
        threshold: mobileQuery.matches ? 0.08 : 0.14
      }
    );
    reveals.forEach((el) => revealObserver.observe(el));
  }

  function applyRevealUtilities() {
    const revealGroups = [
      ".work-grid .card",
      ".list .list-item",
      ".media-grid .media-card",
      ".stats-bars .stat-bar",
      ".hero-actions .btn",
      "#contact .btn"
    ];

    revealGroups.forEach((selector) => {
      const items = Array.from(document.querySelectorAll(selector));
      items.forEach((el, index) => {
        el.classList.add("reveal", "u-reveal", "u-reveal-stagger");
        el.style.setProperty("--reveal-index", String(index));
      });
    });

    document.querySelectorAll(".reveal").forEach((el) => {
      el.classList.add("u-reveal");
    });
  }

  const header = document.querySelector(".site-header");
  const navLinks = Array.from(document.querySelectorAll(".nav a"));
  const sections = Array.from(document.querySelectorAll("section[id]"));
  if (sections.length && navLinks.length) {
    const sectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const id = `#${entry.target.id}`;
          navLinks.forEach((link) => {
            link.classList.toggle("is-active", link.getAttribute("href") === id);
          });
        });
      },
      { rootMargin: "-20% 0px -60% 0px", threshold: 0.1 }
    );
    sections.forEach((section) => sectionObserver.observe(section));
  }

  const heroGlobe = document.querySelector(".hero-globe");
  const heroSection = document.querySelector(".hero");
  const globeCaption = document.querySelector(".globe-caption");
  const heroLayers = Array.from(document.querySelectorAll(".hero-layer"));
  const autoParallaxEls = Array.from(
    document.querySelectorAll(".card, .list-item, .media-card, .stat-bar, .hero-actions .btn, #contact .btn")
  );
  autoParallaxEls.forEach((el, index) => {
    if (el.dataset.parallax) return;
    const base = 0.13;
    const variance = (index % 4) * 0.02;
    el.dataset.parallax = (base + variance).toFixed(2);
  });
  const parallaxTargets = Array.from(document.querySelectorAll("[data-parallax]"));
  const sectionParallaxTargets = Array.from(document.querySelectorAll("[data-section-depth]"));
  const orbs = Array.from(document.querySelectorAll(".parallax-orb"));
  const heroWords = Array.from(document.querySelectorAll(".hero-word"));
  const heroWordInners = heroWords.map((word) => word.querySelector(".hero-word-inner") || word);
  const parallaxMeta = parallaxTargets.map((el) => ({
    el,
    depth: parseFloat(el.dataset.parallax || "0.12"),
    center: 0,
    target: 0,
    current: 0,
    applied: Number.NaN
  }));
  const sectionParallaxMeta = sectionParallaxTargets.map((el) => ({
    el,
    depth: parseFloat(el.dataset.sectionDepth || "0.2"),
    center: 0,
    target: 0,
    current: 0,
    applied: Number.NaN
  }));
  const orbMeta = orbs.map((el) => ({
    el,
    depth: parseFloat(el.dataset.depth || "0.2"),
    targetX: 0,
    targetY: 0,
    currentX: 0,
    currentY: 0,
    appliedX: Number.NaN,
    appliedY: Number.NaN
  }));
  let autoRenderApplied = false;
  let scrollTicking = false;
  let resizeTicking = false;
  let scrollSettleTimer = 0;
  let lastHeavyUpdateAt = 0;
  let lastModeIsMobile = mobileQuery.matches;
  let lastHeaderScrolled = null;
  let lastRenderWordsAuto = null;
  let lastBgParallaxY = Number.NaN;
  let viewportHeight = Math.max(1, window.innerHeight || document.documentElement.clientHeight || 1);
  let viewportHalf = viewportHeight * 0.5;
  let documentScrollableHeight = Math.max(
    1,
    (document.documentElement.scrollHeight || document.body.scrollHeight || viewportHeight) - viewportHeight
  );
  let heroTop = 0;
  let heroHeight = 1;

  function refreshScrollMetrics() {
    const scrollTop = window.scrollY || window.pageYOffset || 0;
    viewportHeight = Math.max(1, window.innerHeight || document.documentElement.clientHeight || 1);
    viewportHalf = viewportHeight * 0.5;
    documentScrollableHeight = Math.max(
      1,
      (document.documentElement.scrollHeight || document.body.scrollHeight || viewportHeight) - viewportHeight
    );

    if (heroSection) {
      const heroRect = heroSection.getBoundingClientRect();
      heroTop = heroRect.top + scrollTop;
      heroHeight = Math.max(1, heroRect.height);
    }

    parallaxMeta.forEach((meta) => {
      const rect = meta.el.getBoundingClientRect();
      meta.center = rect.top + scrollTop + rect.height * 0.5;
    });

    sectionParallaxMeta.forEach((meta) => {
      const rect = meta.el.getBoundingClientRect();
      meta.center = rect.top + scrollTop + rect.height * 0.5;
    });
  }

  const updateScrollEffects = (forceHeavy = false) => {
    const scrollTop = window.scrollY || window.pageYOffset;
    const progress = Math.min(1, Math.max(0, scrollTop / documentScrollableHeight));
    const isMobile = mobileQuery.matches;
    const now = performance.now();
    const heavyInterval = isMobile ? 80 : 40;
    let runHeavy = forceHeavy || now - lastHeavyUpdateAt >= heavyInterval;
    const viewportCenter = scrollTop + viewportHalf;

    if (isMobile !== lastModeIsMobile) {
      if (isMobile) {
        parallaxMeta.forEach((meta) => {
          meta.target = 0;
          meta.current = 0;
          if (meta.applied !== 0) {
            meta.el.style.setProperty("--scroll-parallax", "0px");
            meta.applied = 0;
          }
        });
        sectionParallaxMeta.forEach((meta) => {
          meta.target = 0;
          meta.current = 0;
          if (meta.applied !== 0) {
            meta.el.style.setProperty("--section-parallax", "0px");
            meta.applied = 0;
          }
        });
      }
      lastModeIsMobile = isMobile;
      runHeavy = true;
    }

    if (!prefersReducedMotion) {
      const delta = scrollTop - lastScrollTopValue;
      const deltaTime = Math.max(16, now - lastScrollSampleTime);
      const velocity = delta / deltaTime;
      const maxBounce = isMobile ? 1.8 : 2.6;
      scrollBounceTarget = Math.max(-maxBounce, Math.min(maxBounce, velocity * 10));
      lastScrollTopValue = scrollTop;
      lastScrollSampleTime = now;
    } else {
      scrollBounceTarget = 0;
      lastScrollTopValue = scrollTop;
      lastScrollSampleTime = now;
    }

    if (header) {
      const shouldScrollClass = !isMobile && scrollTop > 12;
      if (shouldScrollClass !== lastHeaderScrolled) {
        header.classList.toggle("is-scrolled", shouldScrollClass);
        lastHeaderScrolled = shouldScrollClass;
      }
    }

    const bgParallaxTarget = prefersReducedMotion ? 0 : (0.5 - progress) * (isMobile ? 8 : 14);
    if (Math.abs(bgParallaxTarget - lastBgParallaxY) > 0.03) {
      document.documentElement.style.setProperty("--bg-parallax-y", `${bgParallaxTarget.toFixed(2)}px`);
      lastBgParallaxY = bgParallaxTarget;
    }

    if (milkyway) {
      if (prefersReducedMotion) {
        galaxyScrollX = 0;
        galaxyScrollY = 0;
        galaxyScrollRotate = -14;
        galaxyTargetX = 0;
        galaxyTargetY = 0;
      } else {
        const eased = progress * progress * (3 - 2 * progress);
        const driftY = (eased - 0.5) * (isMobile ? 10 : 18);
        const driftX = Math.sin(progress * Math.PI * 2) * (isMobile ? 3 : 7);
        const baseRotate = -14 + eased * (isMobile ? 0.8 : 1.2);
        galaxyScrollX = driftX;
        galaxyScrollY = driftY;
        galaxyScrollRotate = baseRotate;
      }
    }


    if (heroSection && heroLayers.length && !prefersReducedMotion) {
      const heroProgress = (viewportHeight - (heroTop - scrollTop)) / (viewportHeight + heroHeight);
      const clampedHero = Math.min(1, Math.max(0, heroProgress));
      const heroShift = (clampedHero - 0.5) * (isMobile ? 16 : 24);
      heroLayers.forEach((layer) => {
        const depth = parseFloat(layer.dataset.depth || "0.6");
        layer.style.setProperty("--layer-shift", `${(heroShift * depth).toFixed(2)}px`);
      });
      if (heroGlobe) {
        heroGlobe.style.setProperty("--parallax", `${(heroShift * 0.7).toFixed(2)}px`);
      }
    } else {
      heroLayers.forEach((layer) => {
        layer.style.setProperty("--layer-shift", "0px");
      });
      if (heroGlobe) {
        heroGlobe.style.setProperty("--parallax", "0px");
      }
    }

    if (isMobile && heroSection) {
      const start = heroTop - viewportHeight * 0.2;
      const end = heroTop + heroHeight * 0.7;
      const heroFocusProgress = Math.min(1, Math.max(0, (scrollTop - start) / Math.max(1, end - start)));
      const eased = heroFocusProgress * heroFocusProgress * (3 - 2 * heroFocusProgress);
      mobileFocus = Math.min(1, eased * 1.1);
    } else {
      mobileFocus = 0;
    }

    if (globeCaption) {
      if (isMobile) {
        globeCaption.style.setProperty("--caption-opacity", mobileFocus.toFixed(3));
        globeCaption.style.setProperty("--caption-shift", `${(1 - mobileFocus) * 10}px`);
      } else {
        globeCaption.style.removeProperty("--caption-opacity");
        globeCaption.style.removeProperty("--caption-shift");
      }
    }

    if (runHeavy) {
      if (!prefersReducedMotion && !isMobile) {
        const base = 230;
        parallaxMeta.forEach((meta) => {
          const distance = (meta.center - viewportCenter) / viewportHalf;
          if (Math.abs(distance) > 1.35) {
            meta.target = 0;
            return;
          }
          const clamped = Math.max(-1, Math.min(1, distance));
          const easedDistance = clamped * clamped * clamped;
          meta.target = -easedDistance * base * meta.depth;
        });
      } else {
        parallaxMeta.forEach((meta) => {
          meta.target = 0;
        });
      }

      if (!isMobile) {
        const base = 95;
        sectionParallaxMeta.forEach((meta) => {
          const distance = (meta.center - viewportCenter) / viewportHalf;
          if (Math.abs(distance) > 1.45) {
            meta.target = 0;
            return;
          }
          const clamped = Math.max(-1, Math.min(1, distance));
          meta.target = -clamped * base * meta.depth;
        });
      } else {
        sectionParallaxMeta.forEach((meta) => {
          meta.target = 0;
        });
      }

      if (!prefersReducedMotion && !isMobile) {
        const driftBase = 0.14;
        orbMeta.forEach((meta, index) => {
          const y = -scrollTop * driftBase * meta.depth;
          const sway = Math.sin(scrollTop * 0.001 + index) * 18 * meta.depth;
          const swayY = Math.cos(scrollTop * 0.0008 + index) * 8 * meta.depth;
          meta.targetX = sway;
          meta.targetY = y + swayY;
        });
      } else {
        orbMeta.forEach((meta) => {
          meta.targetX = 0;
          meta.targetY = 0;
        });
      }

      lastHeavyUpdateAt = now;
    }

    const parallaxEase = isMobile ? 1 : 0.3;
    parallaxMeta.forEach((meta) => {
      if (parallaxEase >= 1) {
        meta.current = 0;
      } else {
        meta.current += (meta.target - meta.current) * parallaxEase;
        if (Math.abs(meta.current) < 0.04 && Math.abs(meta.target) < 0.04) {
          meta.current = 0;
        }
      }
      if (Math.abs(meta.current - meta.applied) > 0.08) {
        meta.applied = meta.current;
        meta.el.style.setProperty("--scroll-parallax", `${meta.current.toFixed(2)}px`);
      }
    });

    const sectionEase = isMobile ? 1 : 0.24;
    sectionParallaxMeta.forEach((meta) => {
      if (sectionEase >= 1) {
        meta.current = 0;
      } else {
        meta.current += (meta.target - meta.current) * sectionEase;
        if (Math.abs(meta.current) < 0.03 && Math.abs(meta.target) < 0.03) {
          meta.current = 0;
        }
      }
      if (Math.abs(meta.current - meta.applied) > 0.06) {
        meta.applied = meta.current;
        meta.el.style.setProperty("--section-parallax", `${meta.current.toFixed(2)}px`);
      }
    });

    orbMeta.forEach((meta) => {
      meta.currentX += (meta.targetX - meta.currentX) * 0.18;
      meta.currentY += (meta.targetY - meta.currentY) * 0.18;
      if (Math.abs(meta.currentX) < 0.03 && Math.abs(meta.targetX) < 0.03) {
        meta.currentX = 0;
      }
      if (Math.abs(meta.currentY) < 0.03 && Math.abs(meta.targetY) < 0.03) {
        meta.currentY = 0;
      }
      if (Math.abs(meta.currentX - meta.appliedX) > 0.06) {
        meta.appliedX = meta.currentX;
        meta.el.style.setProperty("--orb-x", `${meta.currentX.toFixed(2)}px`);
      }
      if (Math.abs(meta.currentY - meta.appliedY) > 0.06) {
        meta.appliedY = meta.currentY;
        meta.el.style.setProperty("--orb-y", `${meta.currentY.toFixed(2)}px`);
      }
    });

    const shouldRenderWordsAuto = isMobile && heroWordInners.length > 0 && !prefersReducedMotion;
    if (shouldRenderWordsAuto !== lastRenderWordsAuto) {
      document.body.classList.toggle("render-words-auto", shouldRenderWordsAuto);
      lastRenderWordsAuto = shouldRenderWordsAuto;
    }

    if (isMobile && heroWordInners.length && !prefersReducedMotion) {
      if (!autoRenderApplied) {
        heroWordInners.forEach((word, index) => {
          word.style.setProperty("--word-delay", `${index * 0.22}s`);
        });
        autoRenderApplied = true;
      }
    } else {
      if (autoRenderApplied) {
        heroWordInners.forEach((word) => {
          word.style.removeProperty("--word-delay");
        });
      }
      autoRenderApplied = false;
    }
  };

  window.addEventListener(
    "scroll",
    () => {
      if (!prefersReducedMotion) {
        document.body.classList.add("is-scrolling");
        if (scrollSettleTimer) {
          window.clearTimeout(scrollSettleTimer);
        }
        scrollSettleTimer = window.setTimeout(() => {
          document.body.classList.remove("is-scrolling");
        }, 120);
      }
      lastScrollFrameAt = performance.now();
      if (scrollTicking) return;
      scrollTicking = true;
      requestAnimationFrame(() => {
        updateScrollEffects(false);
        scrollTicking = false;
      });
    },
    { passive: true }
  );

  const handleResize = () => {
    if (resizeTicking) return;
    resizeTicking = true;
    requestAnimationFrame(() => {
      resizeTicking = false;
      refreshScrollMetrics();
      updateScrollEffects(true);
    });
  };

  window.addEventListener("resize", handleResize, { passive: true });
  window.addEventListener("orientationchange", handleResize, { passive: true });
  window.addEventListener("load", handleResize, { once: true, passive: true });

  refreshScrollMetrics();
  updateScrollEffects(true);

  function lerpAngle(a, b, t) {
    const diff = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI;
    return a + diff * t;
  }

  if (!prefersReducedMotion && !mobileQuery.matches) {
    attachTilt(".card", 9, 12);
    attachTilt(".list-item", 7, 10);
  }

  function attachTilt(selector, maxTiltX, maxTiltY) {
    document.querySelectorAll(selector).forEach((el) => {
      let rafId = null;

      const onMove = (event) => {
        const rect = el.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width;
        const y = (event.clientY - rect.top) / rect.height;
        const tiltX = (0.5 - y) * maxTiltX;
        const tiltY = (x - 0.5) * maxTiltY;

        if (rafId) cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(() => {
          el.style.setProperty("--rx", `${tiltX.toFixed(2)}deg`);
          el.style.setProperty("--ry", `${tiltY.toFixed(2)}deg`);
        });
      };

      const onLeave = () => {
        if (rafId) cancelAnimationFrame(rafId);
        el.style.setProperty("--rx", "0deg");
        el.style.setProperty("--ry", "0deg");
      };

      el.addEventListener("mousemove", onMove);
      el.addEventListener("mouseleave", onLeave);
    });
  }

  const menu = document.getElementById("mobile-menu");
  const menuToggle = document.querySelector(".menu-toggle");
  const menuClose = document.querySelector(".menu-close");

  if (menu && menuToggle && menuClose) {
    const openMenu = () => {
      menu.classList.add("is-open");
      menu.setAttribute("aria-hidden", "false");
      menuToggle.setAttribute("aria-expanded", "true");
    };

    const closeMenu = () => {
      menu.classList.remove("is-open");
      menu.setAttribute("aria-hidden", "true");
      menuToggle.setAttribute("aria-expanded", "false");
    };

    menuToggle.addEventListener("click", openMenu);
    menuClose.addEventListener("click", closeMenu);
    menu.addEventListener("click", (event) => {
      if (event.target === menu) closeMenu();
    });
    menu.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", closeMenu);
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeMenu();
    });
  }

  const contactOrb = document.querySelector(".contact-orb");
  const contactPanel = document.getElementById("contact-panel");
  const contactClose = document.querySelector(".contact-close");

  if (contactOrb && contactPanel && contactClose) {
    const openContact = () => {
      contactPanel.classList.add("is-open");
      contactPanel.setAttribute("aria-hidden", "false");
      contactOrb.setAttribute("aria-expanded", "true");
    };

    const closeContact = () => {
      contactPanel.classList.remove("is-open");
      contactPanel.setAttribute("aria-hidden", "true");
      contactOrb.setAttribute("aria-expanded", "false");
    };

    contactOrb.addEventListener("click", openContact);
    contactClose.addEventListener("click", closeContact);
    contactPanel.addEventListener("click", (event) => {
      if (event.target === contactPanel) closeContact();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeContact();
    });
  }

  const moonImg = document.querySelector(".menu-moon");
  if (moonImg && moonImg.dataset.fallback) {
    moonImg.addEventListener("error", () => {
      moonImg.src = moonImg.dataset.fallback;
    }, { once: true });
  }
})();
