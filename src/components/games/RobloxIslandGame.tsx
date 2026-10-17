import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { Trophy, Play, RotateCcw, Zap, Heart, ArrowLeft, ArrowRight, ArrowUp, ArrowDown, Sparkles, Flame, Smile } from 'lucide-react';
import confetti from 'canvas-confetti';

interface RobloxIslandGameProps {
  currentUserId: string;
  currentUserName: string;
  partnerName: string;
  currentUserAvatar?: string;
  partnerAvatar?: string;
  isPlayer1?: boolean;
  onBroadcastAction: (actionData: any) => void;
  incomingAction?: any;
  isDark?: boolean;
}

export const RobloxIslandGame: React.FC<RobloxIslandGameProps> = ({
  currentUserId,
  currentUserName,
  partnerName,
  isPlayer1 = true,
  onBroadcastAction,
  incomingAction,
  isDark = true,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [heartsCollected, setHeartsCollected] = useState(0);
  const [partnerHearts, setPartnerHearts] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const [activeEmote, setActiveEmote] = useState<string | null>(null);
  const [partnerEmote, setPartnerEmote] = useState<string | null>(null);

  const myPosRef = useRef({ x: 0, z: 0, y: 0, vy: 0, rot: 0 });
  const partnerPosRef = useRef({ x: 3, z: 3, y: 0, rot: 0 });
  const crystalsRef = useRef<Array<{ id: number; mesh: THREE.Mesh; x: number; z: number; collected: boolean }>>([]);

  const sendPosition = useCallback((x: number, z: number, y: number, emote?: string) => {
    onBroadcastAction({
      type: 'roblox-pos',
      userId: currentUserId,
      x,
      z,
      y,
      hearts: heartsCollected,
      emote,
    });
  }, [currentUserId, heartsCollected, onBroadcastAction]);

  useEffect(() => {
    if (!incomingAction) return;
    if (incomingAction.type === 'roblox-pos' && incomingAction.userId !== currentUserId) {
      partnerPosRef.current = { x: incomingAction.x, z: incomingAction.z, y: incomingAction.y || 0, rot: 0 };
      setPartnerHearts(incomingAction.hearts || 0);
      if (incomingAction.emote) {
        setPartnerEmote(incomingAction.emote);
        setTimeout(() => setPartnerEmote(null), 2500);
      }
    }
  }, [incomingAction, currentUserId]);

  const triggerEmote = (emote: string) => {
    setActiveEmote(emote);
    sendPosition(myPosRef.current.x, myPosRef.current.z, myPosRef.current.y, emote);
    setTimeout(() => setActiveEmote(null), 2500);
  };

  useEffect(() => {
    if (!gameStarted || !containerRef.current) return;
    const container = containerRef.current;

    // 1. Three.js Scene Setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050811);
    scene.fog = new THREE.FogExp2(0x050811, 0.03);

    const camera = new THREE.PerspectiveCamera(65, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.set(0, 10, 14);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 2. Dynamic Lighting & Glowing Ambience
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xff758c, 1.4);
    dirLight.position.set(15, 25, 15);
    dirLight.castShadow = true;
    scene.add(dirLight);

    // Campfire Point Light
    const fireLight = new THREE.PointLight(0xff5500, 2.5, 12);
    fireLight.position.set(0, 1.5, 0);
    scene.add(fireLight);

    // 3. Floating Romantic Island (Roblox Style)
    const islandGeo = new THREE.BoxGeometry(24, 2.5, 24);
    const islandMat = new THREE.MeshStandardMaterial({ color: 0x1e1b4b, roughness: 0.7 });
    const island = new THREE.Mesh(islandGeo, islandMat);
    island.position.y = -1.25;
    island.receiveShadow = true;
    scene.add(island);

    // Glowing Neon Top Grass Layer
    const grassGeo = new THREE.BoxGeometry(23.6, 0.4, 23.6);
    const grassMat = new THREE.MeshStandardMaterial({ color: 0x312e81, roughness: 0.5, emissive: 0x4f46e5, emissiveIntensity: 0.2 });
    const grass = new THREE.Mesh(grassGeo, grassMat);
    grass.position.y = 0.2;
    scene.add(grass);

    // Central Campfire
    const logGeo = new THREE.CylinderGeometry(0.15, 0.15, 1.2, 6);
    const logMat = new THREE.MeshStandardMaterial({ color: 0x78350f });
    for (let i = 0; i < 4; i++) {
      const log = new THREE.Mesh(logGeo, logMat);
      log.rotation.z = Math.PI / 2;
      log.rotation.y = (i * Math.PI) / 4;
      log.position.set(0, 0.3, 0);
      scene.add(log);
    }

    const fireGeo = new THREE.ConeGeometry(0.5, 1.2, 6);
    const fireMat = new THREE.MeshBasicMaterial({ color: 0xf97316 });
    const campfireMesh = new THREE.Mesh(fireGeo, fireMat);
    campfireMesh.position.set(0, 0.8, 0);
    scene.add(campfireMesh);

    // 4. Create Detailed Blocky Roblox-Style 3D Avatar
    const createBlockyAvatar = (color: number) => {
      const group = new THREE.Group();

      // Torso
      const torsoGeo = new THREE.BoxGeometry(1, 1.2, 0.6);
      const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.3 });
      const torso = new THREE.Mesh(torsoGeo, mat);
      torso.position.y = 1.2;
      torso.castShadow = true;
      group.add(torso);

      // Head
      const headGeo = new THREE.BoxGeometry(0.8, 0.8, 0.8);
      const headMat = new THREE.MeshStandardMaterial({ color: 0xfde047, roughness: 0.2 });
      const head = new THREE.Mesh(headGeo, headMat);
      head.position.y = 2.1;
      head.castShadow = true;
      group.add(head);

      // Arms
      const armGeo = new THREE.BoxGeometry(0.35, 1.1, 0.35);
      const leftArm = new THREE.Mesh(armGeo, mat);
      leftArm.position.set(-0.7, 1.2, 0);
      group.add(leftArm);

      const rightArm = new THREE.Mesh(armGeo, mat);
      rightArm.position.set(0.7, 1.2, 0);
      group.add(rightArm);

      // Legs
      const legGeo = new THREE.BoxGeometry(0.38, 1.1, 0.38);
      const legMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.4 });
      const leftLeg = new THREE.Mesh(legGeo, legMat);
      leftLeg.position.set(-0.25, 0.55, 0);
      group.add(leftLeg);

      const rightLeg = new THREE.Mesh(legGeo, legMat);
      rightLeg.position.set(0.25, 0.55, 0);
      group.add(rightLeg);

      return group;
    };

    const myAvatar = createBlockyAvatar(0xf43f5e); // Pink/Rose
    scene.add(myAvatar);

    const partnerAvatar = createBlockyAvatar(0x6366f1); // Indigo
    scene.add(partnerAvatar);

    // 5. Floating Glowing Crystal Hearts
    const crystals: Array<{ id: number; mesh: THREE.Mesh; x: number; z: number; collected: boolean }> = [];
    const crystalGeo = new THREE.OctahedronGeometry(0.55);
    const crystalMat = new THREE.MeshStandardMaterial({ color: 0xf43f5e, emissive: 0xf43f5e, emissiveIntensity: 0.9, roughness: 0.1 });

    for (let i = 0; i < 10; i++) {
      const mesh = new THREE.Mesh(crystalGeo, crystalMat);
      const x = (Math.random() - 0.5) * 18;
      const z = (Math.random() - 0.5) * 18;
      mesh.position.set(x, 1.2, z);
      scene.add(mesh);
      crystals.push({ id: i, mesh, x, z, collected: false });
    }
    crystalsRef.current = crystals;

    // 6. Keyboard Controls & Physics Loop
    const keys: Record<string, boolean> = {};
    const handleKeyDown = (e: KeyboardEvent) => {
      keys[e.key.toLowerCase()] = true;
      if (e.key === ' ' && myPosRef.current.y <= 0) {
        myPosRef.current.vy = 0.22; // Jump
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => { keys[e.key.toLowerCase()] = false; };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    let animId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const delta = clock.getDelta();

      // Movement Physics
      let moved = false;
      const speed = 0.14;
      if (keys['w'] || keys['arrowup']) { myPosRef.current.z -= speed; moved = true; }
      if (keys['s'] || keys['arrowdown']) { myPosRef.current.z += speed; moved = true; }
      if (keys['a'] || keys['arrowleft']) { myPosRef.current.x -= speed; moved = true; }
      if (keys['d'] || keys['arrowright']) { myPosRef.current.x += speed; moved = true; }

      // Jump gravity physics
      myPosRef.current.y += myPosRef.current.vy;
      if (myPosRef.current.y > 0) {
        myPosRef.current.vy -= 0.015; // Gravity
      } else {
        myPosRef.current.y = 0;
        myPosRef.current.vy = 0;
      }

      // Clamp to island boundaries
      myPosRef.current.x = Math.max(-10, Math.min(10, myPosRef.current.x));
      myPosRef.current.z = Math.max(-10, Math.min(10, myPosRef.current.z));

      myAvatar.position.set(myPosRef.current.x, myPosRef.current.y, myPosRef.current.z);
      partnerAvatar.position.set(partnerPosRef.current.x, partnerPosRef.current.y || 0, partnerPosRef.current.z);

      if (moved || myPosRef.current.y > 0) {
        sendPosition(myPosRef.current.x, myPosRef.current.z, myPosRef.current.y);
      }

      // Rotate crystals & flame flicker
      campfireMesh.scale.y = 1 + Math.sin(Date.now() * 0.01) * 0.15;
      crystalsRef.current.forEach((c) => {
        if (!c.collected) {
          c.mesh.rotation.y += 0.04;
          c.mesh.position.y = 1.2 + Math.sin(Date.now() * 0.005 + c.id) * 0.3;

          const dist = Math.hypot(myPosRef.current.x - c.x, myPosRef.current.z - c.z);
          if (dist < 1.3 && myPosRef.current.y < 0.8) {
            c.collected = true;
            c.mesh.visible = false;
            setHeartsCollected((h) => {
              const next = h + 1;
              if (next >= 10) {
                confetti({ particleCount: 200, spread: 100, origin: { y: 0.5 } });
              }
              return next;
            });
          }
        }
      });

      // Smooth camera follow
      camera.position.x = THREE.MathUtils.lerp(camera.position.x, myPosRef.current.x, 0.06);
      camera.position.z = THREE.MathUtils.lerp(camera.position.z, myPosRef.current.z + 12, 0.06);
      camera.position.y = THREE.MathUtils.lerp(camera.position.y, 8 + myPosRef.current.y * 0.5, 0.06);
      camera.lookAt(myPosRef.current.x, 1, myPosRef.current.z);

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      renderer.dispose();
    };
  }, [gameStarted, currentUserName, sendPosition]);

  return (
    <div className={`w-full max-w-lg mx-auto rounded-3xl p-6 border shadow-2xl ${
      isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-500 text-white flex items-center justify-center font-bold shadow-lg shadow-indigo-500/30">
            🧊
          </div>
          <div>
            <h2 className="text-base font-bold">Haven 3D Metaverse Island</h2>
            <p className="text-xs text-slate-400">Interactive 3D Roblox world with {partnerName}</p>
          </div>
        </div>
      </div>

      {!gameStarted ? (
        <div className="text-center py-8 space-y-4">
          <div className="text-6xl mb-2 animate-bounce">🏝️</div>
          <h3 className="text-xl font-bold font-serif text-indigo-400">Enter the 3D Metaverse</h3>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            Walk, jump, and emote as a 3D blocky avatar, explore the floating romantic island, and collect crystal hearts together!
          </p>
          <button
            type="button"
            onClick={() => setGameStarted(true)}
            className="py-3 px-8 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-sm shadow-xl shadow-indigo-600/30 flex items-center justify-center gap-2 mx-auto cursor-pointer transition transform hover:scale-105"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>Launch 3D Metaverse</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Stats Bar */}
          <div className="grid grid-cols-2 gap-3 text-center text-xs font-bold">
            <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700">
              <span className="text-slate-400 block text-[10px]">Your Crystals</span>
              <span className="font-mono text-rose-400 text-sm">💖 {heartsCollected} / 10</span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700">
              <span className="text-slate-400 block text-[10px]">{partnerName}'s Crystals</span>
              <span className="font-mono text-indigo-400 text-sm">💎 {partnerHearts} / 10</span>
            </div>
          </div>

          {/* 3D Canvas Container with Emote Overlays */}
          <div className="relative w-full h-[380px] rounded-2xl overflow-hidden border border-slate-800 shadow-2xl bg-black">
            <div ref={containerRef} className="w-full h-full" />

            {/* Active Emote Bubbles */}
            {activeEmote && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-rose-600 text-white px-4 py-1.5 rounded-full text-xs font-bold shadow-2xl animate-bounce z-20">
                You: {activeEmote}
              </div>
            )}
            {partnerEmote && (
              <div className="absolute top-14 left-1/2 -translate-x-1/2 bg-indigo-600 text-white px-4 py-1.5 rounded-full text-xs font-bold shadow-2xl animate-pulse z-20">
                {partnerName}: {partnerEmote}
              </div>
            )}
          </div>

          {/* Interactive Emotes & Jump Bar */}
          <div className="flex items-center justify-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => { myPosRef.current.vy = 0.22; }}
              className="py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-bold text-xs text-white shadow-md active:scale-95 cursor-pointer flex items-center gap-1"
            >
              🚀 Jump (Space)
            </button>
            <button
              type="button"
              onClick={() => triggerEmote('👋 Hello!')}
              className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 font-bold text-xs text-white shadow-md active:scale-95 cursor-pointer"
            >
              👋 Wave
            </button>
            <button
              type="button"
              onClick={() => triggerEmote('💖 Love you!')}
              className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 font-bold text-xs text-rose-400 shadow-md active:scale-95 cursor-pointer"
            >
              💖 Love
            </button>
            <button
              type="button"
              onClick={() => triggerEmote('🎉 Yay!')}
              className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 font-bold text-xs text-amber-400 shadow-md active:scale-95 cursor-pointer"
            >
              🎉 Yay
            </button>
          </div>

          {/* Controls Instructions */}
          <div className="text-center text-[11px] text-slate-400 bg-slate-800/50 p-2.5 rounded-xl border border-slate-700">
            Use <strong className="text-white">WASD</strong> / <strong className="text-white">Arrows</strong> to walk & <strong className="text-white">Space</strong> to jump!
          </div>
        </div>
      )}
    </div>
  );
};
