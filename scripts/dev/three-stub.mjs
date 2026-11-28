// A tiny, dependency-free stand-in for three.js, used ONLY by headless smoke tests when the real package
// is not installed. It records scene-graph structure and transforms; it renders nothing.
export class Vector3{constructor(x=0,y=0,z=0){this.x=x;this.y=y;this.z=z;}set(x,y,z){this.x=x;this.y=y;this.z=z;return this;}copy(v){return this.set(v.x,v.y,v.z);}clone(){return new Vector3(this.x,this.y,this.z);}add(v){this.x+=v.x;this.y+=v.y;this.z+=v.z;return this;}sub(v){this.x-=v.x;this.y-=v.y;this.z-=v.z;return this;}lerp(v,t){this.x+=(v.x-this.x)*t;this.y+=(v.y-this.y)*t;this.z+=(v.z-this.z)*t;return this;}distanceTo(v){return Math.hypot(this.x-v.x,this.y-v.y,this.z-v.z);}length(){return Math.hypot(this.x,this.y,this.z);}normalize(){const l=this.length()||1;return this.set(this.x/l,this.y/l,this.z/l);}multiplyScalar(k){this.x*=k;this.y*=k;this.z*=k;return this;}addScaledVector(v,k){this.x+=v.x*k;this.y+=v.y*k;this.z+=v.z*k;return this;}setFromMatrixPosition(){return this;}applyQuaternion(){return this;}}
export class Euler{constructor(x=0,y=0,z=0){this.x=x;this.y=y;this.z=z;}set(x,y,z){this.x=x;this.y=y;this.z=z;return this;}copy(e){return this.set(e.x,e.y,e.z);}}
export class Quaternion{constructor(){this.x=0;this.y=0;this.z=0;this.w=1;}set(x,y,z,w){Object.assign(this,{x,y,z,w});return this;}copy(q){return this.set(q.x,q.y,q.z,q.w);}setFromUnitVectors(){return this;}setFromEuler(){return this;}}
export class Color{constructor(c=0){this.r=0;this.g=0;this.b=0;this.hex=c;}set(c){this.hex=c;return this;}setHex(c){return this.set(c);}setRGB(r,g,b){this.r=r;this.g=g;this.b=b;return this;}copy(c){this.r=c.r;this.g=c.g;this.b=c.b;this.hex=c.hex;return this;}clone(){return new Color(this.hex).copy(this);}lerp(c,t){this.r+=(c.r-this.r)*t;this.g+=(c.g-this.g)*t;this.b+=(c.b-this.b)*t;return this;}lerpColors(a,b,t){return this.copy(a).lerp(b,t);}multiplyScalar(k){this.r*=k;this.g*=k;this.b*=k;return this;}}
export class Object3D{constructor(){this.position=new Vector3();this.rotation=new Euler();this.scale=new Vector3(1,1,1);this.quaternion=new Quaternion();this.children=[];this.parent=null;this.visible=true;this.name='';this.userData={};}
 add(...o){for(const c of o){c.parent?.remove(c);c.parent=this;this.children.push(c);}return this;}remove(c){const i=this.children.indexOf(c);if(i>=0){this.children.splice(i,1);c.parent=null;}return this;}removeFromParent(){this.parent?.remove(this);return this;}
 traverse(fn){fn(this);for(const c of this.children)c.traverse(fn);}updateMatrixWorld(){}lookAt(){}getWorldPosition(v=new Vector3()){let p=this,x=0,y=0,z=0;while(p){x+=p.position.x;y+=p.position.y;z+=p.position.z;p=p.parent;}return v.set(x,y,z);}localToWorld(v){return v;}worldToLocal(v){return v;}}
export class Group extends Object3D{}
export class Scene extends Object3D{}
export class Mesh extends Object3D{constructor(geometry,material){super();this.geometry=geometry;this.material=material;this.isMesh=true;}}
export class Line extends Mesh{}
export class LineSegments extends Mesh{}
const geometry=class{constructor(...args){this.args=args;this.attributes={position:{setXYZ(){},needsUpdate:false}};}dispose(){}setFromPoints(){return this;}computeBoundingSphere(){}clone(){return this;}};
export class BoxGeometry extends geometry{}export class CylinderGeometry extends geometry{}export class TorusGeometry extends geometry{}export class BufferGeometry extends geometry{}export class SphereGeometry extends geometry{}export class PlaneGeometry extends geometry{}export class EdgesGeometry extends geometry{}
const material=class{constructor(p={}){Object.assign(this,p);this.color=new Color(p.color??0);this.emissive=new Color(p.emissive??0);}clone(){const m=new this.constructor();Object.assign(m,this);m.color=this.color.clone();m.emissive=this.emissive.clone();return m;}dispose(){}};
export class MeshStandardMaterial extends material{}export class MeshBasicMaterial extends material{}export class LineBasicMaterial extends material{}
const light=class extends Object3D{constructor(color,intensity=1){super();this.color=new Color(color);this.intensity=intensity;this.target=new Object3D();}};
export class SpotLight extends light{}export class PointLight extends light{}export class HemisphereLight extends light{}
export class Raycaster{intersectObject(){return [];}}
export const MathUtils={clamp:(v,a,b)=>Math.max(a,Math.min(b,v))};
export const SRGBColorSpace='srgb';
