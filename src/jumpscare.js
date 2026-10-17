import * as THREE from 'three';
import {createCreature} from './creature.js';

// The eyes appear on the very first capture frame; the face then strikes
// within a fraction of a second, without a delayed intro or flashing strobe.
export const JUMPSCARE_DURATION = 1.85;
export const JUMPSCARE_MOUTH_URL = '/images/jumpscare-mouth.png';
const clamp01 = value => THREE.MathUtils.clamp(value, 0, 1);
const ease = (value, start, end) => THREE.MathUtils.smoothstep(value, start, end);

export function createJumpscare({mouthTexture} = {}) {
 const scene = new THREE.Scene();
 scene.background = new THREE.Color(0x080305);
 const camera = new THREE.PerspectiveCamera(52, 1, .025, 40);

 // Dim red mist above and below the almost invisible head, as in the reference.
 // No document/canvas dependency, so this also works in headless unit tests.
 const backdrop = new THREE.Mesh(
  new THREE.PlaneGeometry(36, 36),
  new THREE.ShaderMaterial({
   depthWrite: false,
   depthTest: false,
   uniforms: {uTime: {value: 0}, uAttack: {value: 0}},
   vertexShader: `varying vec2 vUv;
    void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
   fragmentShader: `varying vec2 vUv;
    uniform float uTime;
    uniform float uAttack;
    void main(){
      vec2 p=vUv-.5;
      float top=smoothstep(.45,1.,vUv.y);
      float bottom=1.-smoothstep(0.,.46,vUv.y);
      float red=(top*.85+bottom*.72)*(1.+uAttack*.35);
      float center=1.-smoothstep(.05,.82,length(p*vec2(.78,1.)));
      float noise=fract(sin(dot(floor(vUv*vec2(210.,180.)+uTime*2.),vec2(12.9898,78.233)))*43758.5453)-.5;
      vec3 col=vec3(.009,.003,.005)+vec3(.089,.005,.012)*red;
      col*=1.-center*.73;
      col+=noise*.003;
      gl_FragColor=vec4(max(col,vec3(0.)),1.);
    }`
  })
 );
 backdrop.position.z = -5;
 backdrop.renderOrder = -10;
 scene.add(backdrop);

 const face = createCreature().head;
 face.removeFromParent();
 face.position.set(0, 0, 0);
 scene.add(face);
 const eyes = [], darkSurfaces = [];
 face.traverse(mesh => {
  if(!mesh.isMesh) return;
  const isEye = mesh.material?.color?.r > .5;
  mesh.material = new THREE.MeshBasicMaterial({
   color: isEye ? 0xffffff : 0x040204,
   toneMapped: false
  });
  (isEye ? eyes : darkSurfaces).push(mesh);
 });

 if(mouthTexture) mouthTexture.colorSpace = THREE.SRGBColorSpace;
 const mouth = new THREE.Mesh(
  new THREE.PlaneGeometry(.32, .25),
  new THREE.MeshBasicMaterial({
   map: mouthTexture ?? null, transparent: true, alphaTest: .025,
   depthWrite: false, side: THREE.DoubleSide, toneMapped: false
  })
 );
 mouth.position.set(0, .235, .218);
 mouth.renderOrder = 2;
 mouth.userData.jumpscareMouth = true;
 mouth.visible = false;
 face.add(mouth);

 // The first frame fits the horns even on portrait screens; the near-instant
 // subsequent push-in deliberately crops the silhouette for impact.
 const bounds = new THREE.Box3().setFromObject(face);
 const center = bounds.getCenter(new THREE.Vector3());
 const size = bounds.getSize(new THREE.Vector3());
 let active = false, elapsed = 0, borderOpacity = 0, impactOpacity = 0, glitch = 0;

 function pose(){
  const rush = ease(elapsed, 0, .24);
  const shock = Math.exp(-Math.max(0, elapsed-.20)*7.5) * rush;
  const withdraw = ease(elapsed, 1.15, JUMPSCARE_DURATION);
  const darkness = 1-withdraw;
  const open = ease(elapsed, .035, .17);

  eyes.forEach(eye => eye.material.color.setScalar(darkness));
  darkSurfaces.forEach(mesh => mesh.material.color.setRGB(
   (.008 + .026*rush + .007*Math.sin(elapsed*4))*darkness,
   (.004 + .004*rush)*darkness,
   (.010 + .010*rush)*darkness
  ));
  backdrop.material.uniforms.uTime.value = elapsed;
  backdrop.material.uniforms.uAttack.value = rush*darkness;

  const textureReady = !!mouthTexture?.image?.width && !!mouthTexture?.image?.height;
  mouth.visible = active && textureReady && elapsed >= .04 && withdraw < .98;
  mouth.scale.set(1+.25*open, .18+1.0*open, 1);
  mouth.material.opacity = clamp01(open*2) * darkness;
  mouth.material.color.setScalar(darkness);

  const roll = rush * darkness;
  face.rotation.set(
   -roll*.085 + Math.sin(elapsed*28)*shock*.033,
   Math.sin(elapsed*24)*shock*.075,
   Math.sin(elapsed*22)*shock*.055
  );
  face.position.set(Math.sin(elapsed*35)*shock*.014, -rush*.06+Math.sin(elapsed*29)*shock*.012, 0);

  const tangent = Math.tan(THREE.MathUtils.degToRad(camera.fov/2));
  const radius = Math.max(size.x/(2*tangent*camera.aspect), size.y/(2*tangent));
  const fittingDistance = bounds.max.z + radius * 1.28;
  const distance = fittingDistance * (1-.50*rush);
  const wobble = shock*.018;
  camera.position.set(
   center.x + Math.sin(elapsed*77)*wobble,
   center.y + Math.sin(elapsed*63)*wobble,
   Math.max(bounds.max.z+.30, distance)
  );
  camera.lookAt(center.x, center.y-.035*rush, 0);

  borderOpacity = clamp01((.83+.15*rush) * darkness);
  impactOpacity = clamp01(Math.exp(-Math.pow((elapsed-.22)/.085,2))*.58);
  glitch = clamp01(shock*.55);
 }
 function start(){
  if(active) return false;
  active=true;elapsed=0;pose();return true;
 }
 function update(delta){
  if(!active) return;
  elapsed += Math.max(0, Math.min(delta,.2));
  pose();
  if(elapsed >= JUMPSCARE_DURATION){
   active=false;borderOpacity=0;impactOpacity=0;glitch=0;mouth.visible=false;
  }
 }
 function resize(aspect){
  if(!Number.isFinite(aspect)||aspect<=0) return;
  camera.aspect=aspect;camera.updateProjectionMatrix();
  if(active) pose();
 }
 function render(renderer){
  const dimensions=renderer.getSize(new THREE.Vector2());
  if(camera.aspect!==dimensions.x/dimensions.y) resize(dimensions.x/dimensions.y);
  renderer.render(scene,camera);
 }
 return {
  scene,camera,face,eyes,mouth,start,update,resize,render,
  get active(){return active;},
  get elapsed(){return elapsed;},
  get borderOpacity(){return borderOpacity;},
  get impactOpacity(){return impactOpacity;},
  get glitch(){return glitch;}
 };
}
