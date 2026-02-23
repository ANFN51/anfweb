(() => {
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
    galaxyTargetX = x * 30;
    galaxyTargetY = y * 20;
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

  const reveals = document.querySelectorAll(".reveal");

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

  if (mobileQuery.matches) {
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
      { threshold: 0.2 }
    );
    reveals.forEach((el) => revealObserver.observe(el));
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

  const statBars = Array.from(document.querySelectorAll(".stat-bar"));
  if (statBars.length) {
    const statsObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            statsObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.45 }
    );
    statBars.forEach((bar) => statsObserver.observe(bar));
  }

  const heroGlobe = document.querySelector(".hero-globe");
  const heroSection = document.querySelector(".hero");
  const globeCaption = document.querySelector(".globe-caption");
  const heroLayers = Array.from(document.querySelectorAll(".hero-layer"));
  const autoParallaxEls = Array.from(
    document.querySelectorAll(".card, .list-item, .media-card, .stat-bar")
  );
  autoParallaxEls.forEach((el, index) => {
    if (el.dataset.parallax) return;
    const base = 0.1;
    const variance = (index % 5) * 0.02;
    el.dataset.parallax = (base + variance).toFixed(2);
  });
  const parallaxTargets = Array.from(document.querySelectorAll("[data-parallax]"));
  const parallaxEls = parallaxTargets;
  const sectionParallaxEls = Array.from(document.querySelectorAll("[data-section-depth]"));
  const orbs = Array.from(document.querySelectorAll(".parallax-orb"));
  const heroWords = Array.from(document.querySelectorAll(".hero-word"));
  const heroWordInners = heroWords.map((word) => word.querySelector(".hero-word-inner") || word);
  let autoRenderApplied = false;
  let scrollTicking = false;
  let lastHeavyUpdateAt = 0;
  let lastModeIsMobile = mobileQuery.matches;

  const updateScrollEffects = () => {
    const scrollTop = window.scrollY || window.pageYOffset;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const progress = docHeight > 0 ? scrollTop / docHeight : 0;
    const isMobile = mobileQuery.matches;
    const now = performance.now();
    const heavyInterval = isMobile ? 72 : 28;
    const runHeavy = now - lastHeavyUpdateAt > heavyInterval;

    if (isMobile !== lastModeIsMobile) {
      if (isMobile) {
        parallaxEls.forEach((el) => el.style.setProperty("--scroll-parallax", "0px"));
        sectionParallaxEls.forEach((section) => section.style.setProperty("--section-parallax", "0px"));
      }
      lastModeIsMobile = isMobile;
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
      header.classList.toggle("is-scrolled", !isMobile && scrollTop > 12);
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
        const driftY = (eased - 0.5) * (isMobile ? 80 : 150);
        const driftX = Math.sin(progress * Math.PI * 2) * (isMobile ? 14 : 34);
        const baseRotate = -14 + eased * (isMobile ? 4 : 6);
        galaxyScrollX = driftX;
        galaxyScrollY = driftY;
        galaxyScrollRotate = baseRotate;
      }
    }


    if (heroSection && heroLayers.length && !prefersReducedMotion) {
      const rect = heroSection.getBoundingClientRect();
      const progress = (window.innerHeight - rect.top) / (window.innerHeight + rect.height);
      const clamped = Math.min(1, Math.max(0, progress));
      const heroShift = (clamped - 0.5) * (isMobile ? 18 : 28);
      heroLayers.forEach((layer) => {
        const depth = parseFloat(layer.dataset.depth || "0.6");
        layer.style.setProperty("--layer-shift", `${heroShift * depth}px`);
      });
      if (heroGlobe) {
        heroGlobe.style.setProperty("--parallax", `${heroShift * 0.7}px`);
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
      const heroTop = heroSection.offsetTop;
      const heroHeight = heroSection.offsetHeight || 1;
      const start = heroTop - window.innerHeight * 0.2;
      const end = heroTop + heroHeight * 0.7;
      const progress = Math.min(1, Math.max(0, (scrollTop - start) / (end - start)));
      const eased = progress * progress * (3 - 2 * progress);
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

    if (parallaxEls.length && runHeavy && !isMobile) {
      if (!prefersReducedMotion) {
        const base = 260;
        parallaxEls.forEach((el) => {
          const rect = el.getBoundingClientRect();
          const center = rect.top + rect.height / 2;
          const distance = (center - window.innerHeight / 2) / (window.innerHeight / 2);
          const clamped = Math.max(-1, Math.min(1, distance));
          const eased = clamped * clamped * clamped;
          const depth = parseFloat(el.dataset.parallax || "0.12");
          const offset = -eased * base * depth;
          el.style.setProperty("--scroll-parallax", `${offset.toFixed(2)}px`);
        });
      } else {
        parallaxEls.forEach((el) => {
          el.style.setProperty("--scroll-parallax", "0px");
        });
      }
    }

    if (sectionParallaxEls.length && runHeavy && !isMobile) {
      const base = isMobile ? 50 : 110;
      sectionParallaxEls.forEach((section) => {
        const rect = section.getBoundingClientRect();
        const center = rect.top + rect.height / 2;
        const distance = (center - window.innerHeight / 2) / (window.innerHeight / 2);
        const clamped = Math.max(-1, Math.min(1, distance));
        const depth = parseFloat(section.dataset.sectionDepth || "0.2");
        const offset = -clamped * base * depth;
        section.style.setProperty("--section-parallax", `${offset.toFixed(1)}px`);
      });
    }

    if (orbs.length && runHeavy) {
      if (!prefersReducedMotion && !isMobile) {
        const driftBase = 0.14;
        orbs.forEach((orb, index) => {
          const depth = parseFloat(orb.dataset.depth || "0.2");
          const y = -scrollTop * driftBase * depth;
          const sway = Math.sin(scrollTop * 0.001 + index) * 18 * depth;
          const swayY = Math.cos(scrollTop * 0.0008 + index) * 8 * depth;
          orb.style.setProperty("--orb-x", `${sway.toFixed(2)}px`);
          orb.style.setProperty("--orb-y", `${(y + swayY).toFixed(2)}px`);
        });
      } else {
        orbs.forEach((orb) => {
          orb.style.setProperty("--orb-x", "0px");
          orb.style.setProperty("--orb-y", "0px");
        });
      }
    }

    if (runHeavy) {
      lastHeavyUpdateAt = now;
    }

    document.body.classList.toggle(
      "render-words-auto",
      isMobile && heroWordInners.length > 0 && !prefersReducedMotion
    );

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
      lastScrollFrameAt = performance.now();
      if (scrollTicking) return;
      scrollTicking = true;
      requestAnimationFrame(() => {
        updateScrollEffects();
        scrollTicking = false;
      });
    },
    { passive: true }
  );

  window.addEventListener("resize", updateScrollEffects);
  updateScrollEffects();

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
