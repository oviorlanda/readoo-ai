import React, { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX, Sparkles, UserX, Loader2 } from 'lucide-react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { VRM, VRMLoaderPlugin } from '@pixiv/three-vrm';
import { createVRMAnimationClip, VRMAnimation, VRMAnimationLoaderPlugin, VRMLookAtQuaternionProxy } from '@pixiv/three-vrm-animation';

interface VrmTalkingHeadAvatarProps {
  vrmUrl?: string | null;
  bgImage?: string;
  offsetX?: number;
  offsetY?: number;
  scale?: number;
  rotation?: number;
  isMirrored?: boolean;
  enableAnimation?: boolean; // Default true: model plays idle VRMA animation automatically
  audioUrl?: string | null;
  onAudioEnded?: () => void;
  isSpeaking?: boolean;
  assistantName?: string;
  isFull?: boolean;
}

export const VrmTalkingHeadAvatar: React.FC<VrmTalkingHeadAvatarProps> = ({
  vrmUrl = null,
  bgImage = '',
  offsetX = 0,
  offsetY = 0,
  scale = 1,
  rotation = 0,
  isMirrored = false,
  enableAnimation = true,
  audioUrl = null,
  onAudioEnded,
  isSpeaking = false,
  assistantName = 'Readoo AI',
  isFull = false,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoadingModel, setIsLoadingModel] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);   // 0-100 download %
  const [vrmLoaded, setVrmLoaded] = useState(false);
  const [vrmError, setVrmError] = useState(false);
  const [bgError, setBgError] = useState(false);

  // Manual Animation Toggle State
  const [isAnimPlaying, setIsAnimPlaying] = useState(enableAnimation);
  const [isLoadingAnim, setIsLoadingAnim] = useState(false);

  // Three.js refs
  const currentVrmRef = useRef<VRM | null>(null);
  const modelObjectRef = useRef<THREE.Object3D | null>(null);
  const gltfClipsRef = useRef<THREE.AnimationClip[]>([]);
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);


  // Only head & spine for subtle ambient sway — NO arm bone locking
  const glbBonesRef = useRef<{
    head?: THREE.Object3D;
    spine?: THREE.Object3D;
  }>({});

  // Lip sync smoothing
  const lipOpenRef = useRef<number>(0);

  // Web Audio analyser
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  // ── 1. Audio Playback ──────────────────────────────────────────────────────
  useEffect(() => {
    if (audioUrl && audioRef.current) {
      audioRef.current.src = audioUrl;
      audioRef.current
        .play()
        .then(() => {
          setIsPlaying(true);
          setupAudioAnalyser();
        })
        .catch((err) => {
          console.warn('Auto-play blocked:', err);
          setIsPlaying(false);
        });
    }
  }, [audioUrl]);

  const setupAudioAnalyser = () => {
    if (!audioRef.current) return;
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

      if (!audioCtxRef.current) {
        const ctx = new AudioCtx();
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        const source = ctx.createMediaElementSource(audioRef.current);
        source.connect(analyser);
        analyser.connect(ctx.destination);
        audioCtxRef.current = ctx;
        analyserRef.current = analyser;
      } else if (audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume();
      }
    } catch (e) {
      console.warn('Web Audio API init notice:', e);
    }
  };

  // ── 2. Three.js Scene Setup & Non-Blocking Model Loader ───────────────────
  useEffect(() => {
    if (!containerRef.current || !vrmUrl) return;

    setIsLoadingModel(true);
    setVrmLoaded(false);
    setVrmError(false);
    glbBonesRef.current = {};
    currentVrmRef.current = null;
    mixerRef.current = null;

    let isUnmounted = false;
    let resizeObserver: ResizeObserver | null = null;
    let handleResize: (() => void) | null = null;

    // 80ms delay: lets React fully paint the spinner BEFORE any blocking work starts
    const timerId = setTimeout(() => {
      if (isUnmounted || !containerRef.current) return;
      const loadStartMs = performance.now();

      const container = containerRef.current;
      const width = container.clientWidth || 800;
      const height = container.clientHeight || 450;

      // ── Scene & renderer (fast, non-blocking) ────────────────────────
      const scene = new THREE.Scene();
      sceneRef.current = scene;

      const camera = new THREE.PerspectiveCamera(30, width / height, 0.1, 20.0);
      cameraRef.current = camera;

      const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
      dirLight.position.set(1.0, 2.0, 1.0).normalize();
      scene.add(dirLight);
      scene.add(new THREE.AmbientLight(0xffffff, 0.8));

      const renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
      });
      renderer.setSize(width, height);
      renderer.setPixelRatio(1);
      rendererRef.current = renderer;

      container.innerHTML = '';
      container.appendChild(renderer.domElement);

      // ── 60FPS loop starts immediately (renders background while model loads) ──
      const clock = new THREE.Clock();
      let blinkTimer = 0;

      const animate = () => {
        if (isUnmounted) return;
        animationFrameIdRef.current = requestAnimationFrame(animate);
        const delta = clock.getDelta();
        const time = clock.getElapsedTime();

        // Drive animation mixer (VRMA idle or GLB embedded anim)
        if (mixerRef.current) {
          mixerRef.current.update(delta);
        }

        // Subtle head & spine ambient sway for GLB models with no mixer
        const bones = glbBonesRef.current;
        if (!mixerRef.current && (bones.head || bones.spine)) {
          if (bones.head) {
            bones.head.rotation.y = Math.sin(time * 0.8) * 0.03;
          }
          if (bones.spine) {
            bones.spine.rotation.x = Math.sin(time * 1.2) * 0.012;
          }
        }

        // VRM procedural blink & dynamic viseme lip-sync
        const vrm = currentVrmRef.current;

        // Helper to set VRM 0.x (A, I, U, E, O) & VRM 1.0 (aa, ih, ou, ee, oh) visemes
        const setViseme = (preset: string, val: number) => {
          if (!vrm?.expressionManager) return;
          vrm.expressionManager.setValue(preset, val);
          const upper = preset.toUpperCase();
          vrm.expressionManager.setValue(upper[0], val);
        };

        if (vrm) {
          blinkTimer += delta;
          if (blinkTimer > 3.5) {
            const blinkVal = Math.sin((blinkTimer - 3.5) * Math.PI * 4);
            if (blinkVal > 0) {
              vrm.expressionManager?.setValue('blink', Math.min(blinkVal, 1.0));
              vrm.expressionManager?.setValue('Blink', Math.min(blinkVal, 1.0));
            } else {
              vrm.expressionManager?.setValue('blink', 0);
              vrm.expressionManager?.setValue('Blink', 0);
              blinkTimer = 0;
            }
          }

          const talking = isSpeaking || isPlaying;
          if (talking) {
            let volume = 0;
            if (analyserRef.current && isPlaying) {
              try {
                const buf = new Uint8Array(analyserRef.current.frequencyBinCount);
                analyserRef.current.getByteFrequencyData(buf);
                let sum = 0;
                for (let i = 3; i < 30; i++) sum += buf[i];
                volume = (sum / 27) / 255;
              } catch (e) {
                volume = 0;
              }
            }

            // Combine real audio frequency data with realistic speech wave oscillation
            const speechWave = Math.sin(time * 18) * 0.45 + Math.cos(time * 28) * 0.35 + 0.6;
            const targetLip = volume > 0.02 ? Math.min(1.0, volume * 5.0) : speechWave * 0.95;

            lipOpenRef.current += (targetLip - lipOpenRef.current) * 0.5;

            const mainLip = Math.min(1.0, Math.max(0.1, lipOpenRef.current));
            const secondaryLip = mainLip * 0.6;
            const ohLip = Math.sin(time * 10) > 0.1 ? mainLip * 0.5 : 0;

            setViseme('aa', mainLip);
            setViseme('ih', secondaryLip);
            setViseme('oh', ohLip);
            setViseme('ou', mainLip * 0.4);
          } else {
            lipOpenRef.current += (0 - lipOpenRef.current) * 0.25;
            setViseme('aa', lipOpenRef.current);
            setViseme('ih', 0);
            setViseme('oh', 0);
            setViseme('ou', 0);
            setViseme('ee', 0);
          }

          vrm.update(delta);
        }

        renderer.render(scene, camera);
      };

      animate();

      // ── VRM Model Loader ──────────────────────────────────────────────
      const loader = new GLTFLoader();
      loader.register((parser) => new VRMLoaderPlugin(parser));
      loader.register((parser) => new VRMAnimationLoaderPlugin(parser));

      loader.load(
        vrmUrl,
        (gltf) => {
          if (isUnmounted) return;
          const loadEndMs = performance.now();

          requestAnimationFrame(() => {
            if (isUnmounted) return;

            try {
              const vrm = gltf.userData.vrm as VRM | undefined;

              console.log(
                `[3D Avatar] ─────────────────────────────────────\n` +
                `  URL: ${vrmUrl}\n` +
                `  Type: ${vrm ? 'VRM (.vrm)' : 'GLTF/Non-VRM'}\n` +
                `  Load time: ${Math.round(loadEndMs - loadStartMs)}ms`
              );

              if (vrm) {
                currentVrmRef.current = vrm;
                if (vrm.lookAt) {
                  const proxy = new VRMLookAtQuaternionProxy(vrm.lookAt);
                  proxy.name = 'VRMLookAtQuaternionProxy';
                  vrm.scene.add(proxy);
                }
                const modelObject = vrm.scene;
                applyPositionAndScale(modelObject);

                requestAnimationFrame(() => {
                  if (isUnmounted) return;
                  scene.add(modelObject);

                  setVrmLoaded(true);
                  setVrmError(false);
                  setIsLoadingModel(false);
                });
              } else {
                console.warn('[3D Avatar] Warning: File is not a valid VRM model.');
                setVrmError(true);
                setIsLoadingModel(false);
              }
            } catch (err) {
              console.warn('Error processing VRM 3D model:', err);
              setVrmError(true);
              setIsLoadingModel(false);
            }
          });
        },
        (xhr) => {
          if (xhr.lengthComputable && xhr.total > 0) {
            setLoadProgress(Math.round((xhr.loaded / xhr.total) * 100));
          }
        },
        (error) => {
          if (isUnmounted) return;
          console.warn('VRM 3D model load failed:', error);
          setVrmError(true);
          setIsLoadingModel(false);
        }
      );

      // Helper: center & normalize model scale & immediately align camera
      function applyPositionAndScale(modelObject: THREE.Object3D) {
        const bbox = new THREE.Box3().setFromObject(modelObject);
        const center = bbox.getCenter(new THREE.Vector3());
        const size = bbox.getSize(new THREE.Vector3());

        modelObject.position.x = -center.x;
        modelObject.position.z = -center.z;
        if (center.y !== 0) modelObject.position.y = -bbox.min.y;

        let baseS = 1.0;
        if (size.y > 0 && (size.y > 5 || size.y < 0.5)) {
          baseS = 1.6 / size.y;
          modelObject.scale.set(baseS, baseS, baseS);
        }
        modelObject.userData.baseScale = baseS;
        modelObject.rotation.y = (rotation * Math.PI) / 180;
        const mir = isMirrored ? -1 : 1;
        modelObject.scale.set(mir * baseS, baseS, baseS);
        modelObjectRef.current = modelObject;

        // Instantly align camera position & render frame 1 so model appears immediately!
        if (cameraRef.current) {
          const camX = offsetX * 0.0035 * mir;
          const camY = 1.35 + offsetY * -0.0035;
          const camZ = 1.25 / scale;
          cameraRef.current.position.set(camX, camY, camZ);
          cameraRef.current.lookAt(camX, camY, 0);
        }
        if (rendererRef.current && sceneRef.current && cameraRef.current) {
          rendererRef.current.render(sceneRef.current, cameraRef.current);
        }
      }

      // Responsive resize handling with ResizeObserver
      handleResize = () => {
        if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
        const newW = containerRef.current.clientWidth;
        const newH = containerRef.current.clientHeight;
        if (newW > 0 && newH > 0) {
          cameraRef.current.aspect = newW / newH;
          cameraRef.current.updateProjectionMatrix();
          rendererRef.current.setSize(newW, newH);
        }
      };

      window.addEventListener('resize', handleResize);
      if (containerRef.current && window.ResizeObserver) {
        resizeObserver = new ResizeObserver(() => {
          if (handleResize) handleResize();
        });
        resizeObserver.observe(containerRef.current);
      }
    }, 80);

    // Cleanup on unmount or vrmUrl change
    return () => {
      isUnmounted = true;
      clearTimeout(timerId);
      if (resizeObserver) resizeObserver.disconnect();
      if (handleResize) window.removeEventListener('resize', handleResize);
      if (animationFrameIdRef.current) cancelAnimationFrame(animationFrameIdRef.current);
      if (mixerRef.current) {
        mixerRef.current.stopAllAction();
        mixerRef.current = null;
      }
      if (rendererRef.current) {
        rendererRef.current.dispose();
        rendererRef.current.forceContextLoss();
        rendererRef.current = null;
      }
      if (sceneRef.current) {
        sceneRef.current.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.geometry?.dispose();
            if (Array.isArray(child.material)) child.material.forEach((m) => m.dispose());
            else child.material?.dispose();
          }
        });
        sceneRef.current = null;
      }
      modelObjectRef.current = null;
      currentVrmRef.current = null;
    };
  }, [vrmUrl]);

  // ── 3. O(1) Camera & Model Transform (slider changes) ─────────────────────
  useEffect(() => {
    if (!cameraRef.current || !modelObjectRef.current) return;
    const camera = cameraRef.current;
    const model = modelObjectRef.current;
    const mir = isMirrored ? -1 : 1;

    const camX = offsetX * 0.0035 * mir;
    const camY = 1.35 + offsetY * -0.0035;
    const camZ = 1.25 / scale;

    camera.position.set(camX, camY, camZ);
    camera.lookAt(camX, camY, 0);

    model.rotation.y = (rotation * Math.PI) / 180;
    const baseS = model.userData.baseScale || 1.0;
    model.scale.set(mir * baseS, baseS, baseS);
  }, [offsetX, offsetY, scale, rotation, isMirrored]);

  // ── 4. Manual Animation Control (Start / Stop on Demand) ──────────────────
  useEffect(() => {
    if (!vrmLoaded) return;

    if (!isAnimPlaying) {
      if (mixerRef.current) {
        mixerRef.current.stopAllAction();
        mixerRef.current = null;
      }
      return;
    }

    if (mixerRef.current) return; // Already playing

    // VRM Model Animation
    if (currentVrmRef.current) {
      const activeVrm = currentVrmRef.current;
      setIsLoadingAnim(true);

      const vrmaLoader = new GLTFLoader();
      vrmaLoader.register((parser) => new VRMAnimationLoaderPlugin(parser));

      vrmaLoader.load(
        '/assets/animations/idle_loop.vrma',
        (vrmaGltf) => {
          setIsLoadingAnim(false);
          if (!activeVrm.scene) return;
          const vrmAnimations = vrmaGltf.userData.vrmAnimations as VRMAnimation[] | undefined;
          const vrmAnim = vrmAnimations?.[0];

          if (!vrmAnim) {
            console.error('[3D Avatar] VRMA ERROR: userData.vrmAnimations[0] is undefined');
            return;
          }

          try {
            const clip = createVRMAnimationClip(vrmAnim, activeVrm);
            const mixer = new THREE.AnimationMixer(activeVrm.scene);
            mixer.clipAction(clip).play();
            mixerRef.current = mixer;
            console.log('[3D Avatar] ✅ VRMA idle animation STARTED (Manual Toggle)');
          } catch (e) {
            console.error('[3D Avatar] VRMA createVRMAnimationClip FAILED:', e);
          }
        },
        undefined,
        (e) => {
          setIsLoadingAnim(false);
          console.error('[3D Avatar] VRMA HTTP load FAILED:', e);
        }
      );
    }
  }, [isAnimPlaying, vrmLoaded]);


  // Sync animation playing state when prop changes
  useEffect(() => {
    setIsAnimPlaying(enableAnimation);
  }, [enableAnimation]);

  const handleEnded = () => {
    setIsPlaying(false);
    if (onAudioEnded) onAudioEnded();
  };

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const talking = isSpeaking || isPlaying;
  const containerClass = isFull
    ? 'relative w-full h-full min-h-full overflow-hidden bg-slate-950 flex items-center justify-center select-none group'
    : 'relative w-full aspect-video rounded-2xl overflow-hidden shadow-2xl border border-gray-200 dark:border-gray-800 bg-slate-950 flex items-center justify-center select-none group';

  return (
    <div className={containerClass}>
      {/* 1. BACKGROUND LAYER */}
      {bgImage && !bgError ? (
        <img
          src={bgImage}
          alt="Avatar Background"
          onError={() => setBgError(true)}
          className="absolute inset-0 w-full h-full object-cover z-0 transition-opacity duration-300"
        />
      ) : (
        <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 z-0">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-500/15 via-transparent to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-slate-950/80 to-transparent" />
        </div>
      )}

      {/* Speaking glow aura */}
      {talking && (
        <div className="absolute inset-0 z-5 bg-blue-500/10 backdrop-blur-[1px] animate-pulse transition-all" />
      )}

      {/* 2. LOADING SPINNER OVERLAY */}
      {isLoadingModel && (
        <div className="absolute inset-0 z-15 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-sm">
          <Loader2 className="w-10 h-10 text-emerald-400 animate-spin mb-2" />
          <p className="text-xs font-semibold text-emerald-400 tracking-wide">
            Memuat 3D Avatar... {loadProgress > 0 ? `${loadProgress}%` : ''}
          </p>
        </div>
      )}

      {/* 3. 3D CANVAS or EMPTY STATE */}
      {vrmUrl && !vrmError ? (
        <div ref={containerRef} className="absolute inset-0 z-10 w-full h-full" />
      ) : (
        <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none px-4 py-6 overflow-hidden">
          <div className="relative z-10 flex flex-col items-center w-full max-w-[300px] bg-slate-900/85 backdrop-blur-md p-4 rounded-2xl border border-indigo-500/30 shadow-2xl text-center">
            <div className="w-10 h-10 rounded-full bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center mb-2.5">
              <UserX className="w-5 h-5 text-indigo-400" />
            </div>
            <h4 className="text-sm font-bold text-indigo-400 mb-1 leading-tight">
              Model 3D Belum Diunggah
            </h4>
            <p className="text-[11px] text-slate-300 leading-relaxed break-words">
              Buka <span className="font-semibold text-white">Admin &gt; Personalisasi Visual</span> lalu unggah berkas .vrm.
            </p>
          </div>
        </div>
      )}

      {/* 4. STATUS BADGE */}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-2 bg-slate-900/80 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/10 text-white text-xs shadow-lg">
        <span className="relative flex h-2.5 w-2.5">
          {talking ? (
            <>
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </>
          ) : (
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-gray-400" />
          )}
        </span>
        <span className="font-semibold">{assistantName}</span>
        {talking && (
          <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-mono px-2 py-0.5 rounded-full border border-emerald-500/30 animate-pulse flex items-center gap-1">
            <Sparkles className="w-3 h-3 animate-spin" /> VRM 3D
          </span>
        )}
      </div>

      {/* Mute Button */}
      {audioUrl && (
        <button
          onClick={toggleMute}
          className="absolute top-4 right-4 z-20 p-2 rounded-full bg-slate-900/80 backdrop-blur-md border border-white/10 text-white hover:bg-slate-800 transition-all shadow-lg pointer-events-auto"
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? (
            <VolumeX className="w-4 h-4 text-red-400" />
          ) : (
            <Volume2 className="w-4 h-4 text-emerald-400" />
          )}
        </button>
      )}

      {/* Hidden audio element */}
      {audioUrl && <audio ref={audioRef} onEnded={handleEnded} className="hidden" />}
    </div>
  );
};
