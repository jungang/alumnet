<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { useThemeStore } from '@/stores/theme';

// --- Props ---
const props = defineProps<{
  alumni: Array<{
    id: string;
    name: string;
    graduation_year?: number;
    industry?: string;
    category?: string;
    achievement?: string;
  }>;
}>();

const emit = defineEmits<{
  (e: 'selectAlumni', alumni: any): void;
}>();

const themeStore = useThemeStore();
const isDark = computed(() => themeStore.isDark);

const containerRef = ref<HTMLDivElement>();
let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let controls: OrbitControls;
let starGroup: THREE.Group;
let animationId: number;
let raycaster: THREE.Raycaster;
let mouse: THREE.Vector2;
let hoveredStar: THREE.Mesh | null = null;
let starMeshes: THREE.Mesh[] = [];
let tooltipEl: HTMLDivElement | null = null;

// --- 行业色板 ---
const industryColors: Record<string, number> = {
  科技: 0x14b8a6, // teal
  教育: 0x6366f1, // indigo
  医疗: 0xf43f5e, // rose
  金融: 0xf59e0b, // amber
  文化: 0xec4899, // pink
  政府: 0x3b82f6, // blue
  军事: 0x64748b, // slate
  其他: 0x8b5cf6, // violet
};

function getStarColor(alumni: any): number {
  const industry = alumni.industry || alumni.category || '其他';
  for (const [key, color] of Object.entries(industryColors)) {
    if (industry.includes(key)) return color;
  }
  return industryColors['其他'];
}

// --- 年份 → 3D 位置映射 ---
function alumniToPosition(alumni: any): THREE.Vector3 {
  const year = alumni.graduation_year || 1980;
  // 年份映射到半径（越早越远，越近越近中心）
  const minYear = 1920;
  const maxYear = 2025;
  const t = (year - minYear) / (maxYear - minYear); // 0..1
  const radius = 12 - t * 8; // 外圈12 → 内圈4

  // 行业映射到角度扇区
  const industry = alumni.industry || alumni.category || '其他';
  const industryKeys = Object.keys(industryColors);
  const sectorIndex = industryKeys.findIndex(k => industry.includes(k));
  const sectorAngle = sectorIndex >= 0 ? (sectorIndex / industryKeys.length) * Math.PI * 2 : Math.random() * Math.PI * 2;

  // 在扇区内添加随机偏移
  const angleSpread = (Math.PI * 2) / industryKeys.length;
  const angle = sectorAngle + (Math.random() - 0.5) * angleSpread * 0.8;

  // Y轴随机偏移（形成星云感）
  const y = (Math.random() - 0.5) * 4;

  return new THREE.Vector3(
    radius * Math.cos(angle),
    y,
    radius * Math.sin(angle)
  );
}

// --- 创建发光星点 ---
function createStar(alumni: any): THREE.Mesh {
  const color = getStarColor(alumni);
  const position = alumniToPosition(alumni);

  // 星点球体
  const geometry = new THREE.SphereGeometry(0.15, 8, 8);
  const material = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.9,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.copy(position);
  (mesh as any).userData = { alumni, baseColor: color };

  // 外发光
  const glowGeometry = new THREE.SphereGeometry(0.35, 8, 8);
  const glowMaterial = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.15,
  });
  const glow = new THREE.Mesh(glowGeometry, glowMaterial);
  mesh.add(glow);

  return mesh;
}

// --- 初始化场景 ---
function initScene() {
  if (!containerRef.value) return;

  const width = containerRef.value.clientWidth;
  const height = containerRef.value.clientHeight;

  // 场景
  scene = new THREE.Scene();
  scene.background = new THREE.Color(isDark.value ? 0x020608 : 0xf8fafc);
  scene.fog = new THREE.Fog(isDark.value ? 0x020608 : 0xf8fafc, 15, 30);

  // 相机
  camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 100);
  camera.position.set(0, 8, 16);
  camera.lookAt(0, 0, 0);

  // 渲染器
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  containerRef.value.appendChild(renderer.domElement);

  // 轨道控制
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.minDistance = 5;
  controls.maxDistance = 30;
  controls.maxPolarAngle = Math.PI * 0.85;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.3;

  // 射线检测（鼠标悬停）
  raycaster = new THREE.Raycaster();
  mouse = new THREE.Vector2(-999, -999);

  // 环境光
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
  scene.add(ambientLight);

  // 星群组
  starGroup = new THREE.Group();
  scene.add(starGroup);

  // 创建校友星点
  rebuildStars();

  // 年代环（参考线）
  createDecadeRings();

  // 创建 tooltip DOM
  tooltipEl = document.createElement('div');
  tooltipEl.style.cssText = 'position:absolute;pointer-events:none;padding:8px 12px;border-radius:8px;font-size:13px;color:#f8fafc;background:rgba(15,23,42,0.9);backdrop-filter:blur(8px);border:1px solid rgba(20,184,166,0.3);display:none;z-index:100;white-space:nowrap;transform:translate(-50%,-120%);';
  containerRef.value.appendChild(tooltipEl);

  // 事件
  renderer.domElement.addEventListener('pointermove', onPointerMove);
  renderer.domElement.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('resize', onResize);

  // 动画
  animate();
}

function rebuildStars() {
  // 清除旧星点
  while (starGroup.children.length > 0) {
    const child = starGroup.children[0];
    starGroup.remove(child);
    if (child instanceof THREE.Mesh) {
      child.geometry.dispose();
      if (child.material instanceof THREE.Material) child.material.dispose();
    }
  }
  starMeshes = [];

  // 创建新星点
  for (const alumni of props.alumni) {
    const star = createStar(alumni);
    starGroup.add(star);
    starMeshes.push(star);
  }
}

function createDecadeRings() {
  const decades = [1920, 1940, 1960, 1980, 2000, 2020];
  for (const decade of decades) {
    const t = (decade - 1920) / (2025 - 1920);
    const radius = 12 - t * 8;
    const ringGeometry = new THREE.RingGeometry(radius - 0.02, radius + 0.02, 64);
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: isDark.value ? 0x1e293b : 0xe2e8f0,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = -2;
    scene.add(ring);
  }
}

// --- 动画循环 ---
function animate() {
  animationId = requestAnimationFrame(animate);
  controls.update();

  // 星点呼吸效果
  const time = Date.now() * 0.001;
  for (let i = 0; i < starMeshes.length; i++) {
    const mesh = starMeshes[i];
    const scale = 1 + Math.sin(time * 2 + i * 0.5) * 0.1;
    mesh.scale.setScalar(scale);
  }

  // 悬停检测
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(starMeshes);

  // 重置之前悬停的星点
  if (hoveredStar && (!intersects.length || intersects[0].object !== hoveredStar)) {
    const mat = hoveredStar.material as THREE.MeshBasicMaterial;
    mat.opacity = 0.9;
    hoveredStar.scale.setScalar(1);
    hoveredStar = null;
    if (tooltipEl) tooltipEl.style.display = 'none';
  }

  if (intersects.length > 0) {
    const hit = intersects[0].object as THREE.Mesh;
    if (starMeshes.includes(hit)) {
      hoveredStar = hit;
      const mat = hit.material as THREE.MeshBasicMaterial;
      mat.opacity = 1;
      hit.scale.setScalar(1.5);

      const alumni = (hit as any).userData.alumni;
      if (tooltipEl && alumni) {
        tooltipEl.innerHTML = `<strong>${alumni.name}</strong><br/>${alumni.graduation_year || ''}届 ${alumni.industry || alumni.category || ''}`;
        tooltipEl.style.display = 'block';

        // 3D → 2D 投影
        const pos = hit.position.clone().project(camera);
        const x = (pos.x * 0.5 + 0.5) * renderer.domElement.clientWidth;
        const y = (-pos.y * 0.5 + 0.5) * renderer.domElement.clientHeight;
        tooltipEl.style.left = `${x}px`;
        tooltipEl.style.top = `${y}px`;
      }
    }
  }

  renderer.render(scene, camera);
}

// --- 事件处理 ---
function onPointerMove(event: PointerEvent) {
  if (!containerRef.value) return;
  const rect = containerRef.value.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
}

function onPointerDown(_event: PointerEvent) {
  if (!hoveredStar) return;
  const alumni = (hoveredStar as any).userData.alumni;
  if (alumni) {
    emit('selectAlumni', alumni);
  }
}

function onResize() {
  if (!containerRef.value) return;
  const width = containerRef.value.clientWidth;
  const height = containerRef.value.clientHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
}

// --- 主题切换 ---
watch(isDark, (dark) => {
  if (!scene) return;
  scene.background = new THREE.Color(dark ? 0x020608 : 0xf8fafc);
  if (scene.fog instanceof THREE.Fog) {
    scene.fog.color = new THREE.Color(dark ? 0x020608 : 0xf8fafc);
  }
});

// --- 数据更新 ---
watch(() => props.alumni, () => {
  if (starGroup) rebuildStars();
}, { deep: true });

// --- 生命周期 ---
onMounted(() => {
  initScene();
});

onUnmounted(() => {
  if (animationId) cancelAnimationFrame(animationId);
  if (renderer) {
    renderer.domElement.removeEventListener('pointermove', onPointerMove);
    renderer.domElement.removeEventListener('pointerdown', onPointerDown);
    window.removeEventListener('resize', onResize);
    renderer.dispose();
  }
  if (controls) controls.dispose();
});
</script>

<template>
  <div ref="containerRef" class="galaxy-3d-container w-full h-full relative" />
</template>

<style scoped>
.galaxy-3d-container {
  touch-action: none;
  cursor: grab;
}
.galaxy-3d-container:active {
  cursor: grabbing;
}
</style>
