(() => {
  const canvas = document.getElementById("globe");
  const container = canvas.parentElement;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  const mobileQuery = window.matchMedia("(max-width: 640px), (hover: none) and (pointer: coarse)");
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
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

  const geo = new THREE.SphereGeometry(1, 160, 160);

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
  const clouds = new THREE.Mesh(new THREE.SphereGeometry(1.02, 128, 128), cloudsMat);
  globeGroup.add(clouds);

  const atmosphere = new THREE.Mesh(
    new THREE.SphereGeometry(1.06, 64, 64),
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
  let focusLebanon = false;
  let mobileFocus = 0;

  container.addEventListener("mouseenter", () => {
    focusLebanon = true;
  });

  container.addEventListener("mouseleave", () => {
    focusLebanon = false;
    spinY = currentY;
  });

  function animate() {
    spinY += 0.0016;
    const baseX = Math.sin(Date.now() * 0.0002) * 0.03;
    const baseY = spinY;

    if (mobileQuery.matches) {
      const targetX = lerpAngle(baseX, lebanonTarget.x, mobileFocus);
      const targetY = lerpAngle(baseY, lebanonTarget.y, mobileFocus);
      currentX = lerpAngle(currentX, targetX, 0.1);
      currentY = lerpAngle(currentY, targetY, 0.1);
    } else if (!focusLebanon) {
      currentX = lerpAngle(currentX, baseX, 0.06);
      currentY = lerpAngle(currentY, baseY, 0.06);
    } else {
      currentX = lerpAngle(currentX, lebanonTarget.x, 0.08);
      currentY = lerpAngle(currentY, lebanonTarget.y, 0.08);
    }

    globeGroup.rotation.set(currentX, currentY, 0);
    container.classList.toggle("show-label", focusLebanon || mobileFocus > 0.15);
    clouds.rotation.y += 0.0022;
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }
  animate();

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
      [textures.diffuse, textures.bump, textures.specular, textures.clouds].forEach((tex) => {
        tex.anisotropy = Math.min(8, maxAniso);
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
      const width = 2048;
      const height = 1024;
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

  const starfield = document.querySelector(".starfield");
  const progressBar = document.getElementById("scroll-progress-bar");
  const heroGlobe = document.querySelector(".hero-globe");
  const heroSection = document.querySelector(".hero");
  const heroLayers = Array.from(document.querySelectorAll(".hero-layer"));
  const parallaxEls = Array.from(document.querySelectorAll(".reveal, [data-parallax]"));
  const orbs = Array.from(document.querySelectorAll(".parallax-orb"));
  const heroWords = Array.from(document.querySelectorAll(".hero-word"));
  const heroWordInners = heroWords.map((word) => word.querySelector(".hero-word-inner") || word);
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let autoRenderApplied = false;
  let scrollTicking = false;

  const updateScrollEffects = () => {
    const scrollTop = window.scrollY || window.pageYOffset;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const progress = docHeight > 0 ? scrollTop / docHeight : 0;
    const isMobile = mobileQuery.matches;

    if (starfield) {
      const base = isMobile ? 0.22 : 0.16;
      const shift = scrollTop * base;
      const slow = shift * 0.5;
      const fast = shift * 1.05;
      starfield.style.setProperty("--star-shift", `${Math.min(shift, isMobile ? 200 : 140)}px`);
      starfield.style.setProperty("--star-shift-slow", `${Math.min(slow, isMobile ? 120 : 90)}px`);
      starfield.style.setProperty("--star-shift-fast", `${Math.min(fast, isMobile ? 240 : 160)}px`);
    }

    if (progressBar) {
      progressBar.style.transform = `scaleX(${progress})`;
    }

    if (heroSection && heroLayers.length && !prefersReducedMotion) {
      const rect = heroSection.getBoundingClientRect();
      const progress = (window.innerHeight - rect.top) / (window.innerHeight + rect.height);
      const clamped = Math.min(1, Math.max(0, progress));
      const heroShift = (clamped - 0.5) * (isMobile ? 44 : 28);
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
      const heroHeight = heroSection.offsetHeight;
      const start = heroTop - window.innerHeight * 0.3;
      const end = heroTop + heroHeight * 0.6;
      const progress = Math.min(1, Math.max(0, (scrollTop - start) / (end - start)));
      const eased = progress * progress * (3 - 2 * progress);
      mobileFocus = Math.min(1, eased * 1.15);
    } else {
      mobileFocus = 0;
    }

    if (parallaxEls.length) {
      if (!prefersReducedMotion) {
        const base = isMobile ? 160 : 220;
        parallaxEls.forEach((el) => {
          const rect = el.getBoundingClientRect();
          const start = window.innerHeight;
          const end = -rect.height * 0.2;
          const raw = (start - rect.top) / (start - end);
          const clamped = Math.min(1, Math.max(0, raw));
          const eased = clamped * clamped * (3 - 2 * clamped);
          const depth = parseFloat(el.dataset.parallax || "0.12");
          const offset = (1 - eased) * base * depth;
          el.style.setProperty("--scroll-parallax", `${offset.toFixed(2)}px`);
        });
      } else {
        parallaxEls.forEach((el) => {
          el.style.setProperty("--scroll-parallax", "0px");
        });
      }
    }

    if (orbs.length) {
      if (!prefersReducedMotion) {
        const driftBase = isMobile ? 0.2 : 0.14;
        orbs.forEach((orb, index) => {
          const depth = parseFloat(orb.dataset.depth || "0.2");
          const y = -scrollTop * driftBase * depth;
          const sway = Math.sin(scrollTop * 0.0016 + index) * 26 * depth;
          const swayY = Math.cos(scrollTop * 0.0011 + index) * 12 * depth;
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

    document.body.classList.toggle(
      "render-words-auto",
      isMobile && heroWordInners.length > 0 && !prefersReducedMotion
    );

    if (isMobile && heroWordInners.length && !prefersReducedMotion) {
      if (!autoRenderApplied) {
        heroWordInners.forEach((word, index) => {
          word.style.setProperty("--word-delay", `${index * 0.12}s`);
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

  window.addEventListener("scroll", () => {
    if (scrollTicking) return;
    scrollTicking = true;
    requestAnimationFrame(() => {
      updateScrollEffects();
      scrollTicking = false;
    });
  });

  window.addEventListener("resize", updateScrollEffects);
  updateScrollEffects();

  function lerpAngle(a, b, t) {
    const diff = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI;
    return a + diff * t;
  }

  if (!prefersReducedMotion) {
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
      document.body.classList.add("no-scroll");
    };

    const closeMenu = () => {
      menu.classList.remove("is-open");
      menu.setAttribute("aria-hidden", "true");
      menuToggle.setAttribute("aria-expanded", "false");
      document.body.classList.remove("no-scroll");
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
      document.body.classList.add("contact-open");
    };

    const closeContact = () => {
      contactPanel.classList.remove("is-open");
      contactPanel.setAttribute("aria-hidden", "true");
      contactOrb.setAttribute("aria-expanded", "false");
      document.body.classList.remove("contact-open");
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
