(() => {
  const canvas = document.getElementById("globe");
  const container = canvas.parentElement;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
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

  function animate() {
    globeGroup.rotation.y += 0.0012;
    globeGroup.rotation.x = Math.sin(Date.now() * 0.0002) * 0.03;
    clouds.rotation.y += 0.0018;
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
  let starTicking = false;
  window.addEventListener("scroll", () => {
    if (starTicking) return;
    starTicking = true;
    requestAnimationFrame(() => {
      const shift = Math.min(window.scrollY * 0.08, 120);
      starfield.style.setProperty("--star-shift", `${shift}px`);
      starTicking = false;
    });
  });
})();
