import * as T from 'three';
import {CAMCORDER_PROFILE} from './camcorder.js';
// A single low-resolution HDR pass: optical aberration/bloom first, tape grade
// and noise after. Text/controls are composed separately and stay readable.
export function createCamcorderPost(renderer){
 const target=new T.WebGLRenderTarget(640,480,{type:renderer.extensions.has('EXT_color_buffer_float')?T.HalfFloatType:T.UnsignedByteType,minFilter:T.LinearFilter,magFilter:T.LinearFilter,depthBuffer:true});
 const scene=new T.Scene(),camera=new T.OrthographicCamera(-1,1,1,-1,0,1),geometry=new T.PlaneGeometry(2,2);
 const material=new T.ShaderMaterial({depthTest:false,depthWrite:false,uniforms:{picture:{value:target.texture},resolution:{value:new T.Vector2(640,480)},tapeTime:{value:0},desaturation:{value:CAMCORDER_PROFILE.desaturation}},vertexShader:`varying vec2 uvTape;void main(){uvTape=uv;gl_Position=vec4(position.xy,0.,1.);}`,fragmentShader:`
 varying vec2 uvTape;uniform sampler2D picture;uniform vec2 resolution;uniform float tapeTime;uniform float desaturation;
 float noise(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
 vec3 bright(vec2 p){vec3 c=texture2D(picture,clamp(p,vec2(.002),vec2(.998))).rgb;return max(c-vec3(1.05),vec3(0.));}
 void main(){
  vec2 p=uvTape,centred=p-.5;float r=dot(centred,centred);p=centred*(1.+r*.018)+.5;
  float frame=floor(tapeTime*24.);float line=floor(p.y*480.);p.x+=(noise(vec2(line,frame))-.5)*.00065;
  vec2 fringe=centred*r*.009;vec3 color=vec3(texture2D(picture,p+fringe).r,texture2D(picture,p).g,texture2D(picture,p-fringe).b);
  vec2 blur=vec2(2.4)/resolution;vec3 bloom=bright(p+vec2(blur.x,0.))+bright(p-vec2(blur.x,0.))+bright(p+vec2(0.,blur.y))+bright(p-vec2(0.,blur.y));
  bloom+=bright(p+blur)+bright(p-blur)+bright(p+vec2(blur.x,-blur.y))+bright(p+vec2(-blur.x,blur.y));color+=bloom*.022;
  float luminance=dot(color,vec3(.2126,.7152,.0722));color=mix(color,vec3(luminance),desaturation);
  float l=clamp(luminance,0.,1.);float mid=4.*l*(1.-l);color+=vec3(.028,.034,-.026)*mid;
  color*=1.-r*.34;float grain=noise(floor(p*resolution)+vec2(frame*17.,frame*3.))-.5;
  color*=.991+.009*sin(p.y*resolution.y*3.14159265);gl_FragColor=vec4(max(color,vec3(0.)),1.);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  gl_FragColor.rgb=clamp(gl_FragColor.rgb+grain*.04,0.,1.);
 }`});
 scene.add(new T.Mesh(geometry,material));let disposed=false;
 return {resize(width,height){if(disposed)return;target.setSize(width,height);material.uniforms.resolution.value.set(width,height);},render(source,view,time,{reducedMotion=false}={}){if(disposed)return;material.uniforms.tapeTime.value=reducedMotion?0:time;const previous=renderer.getRenderTarget();renderer.setRenderTarget(target);renderer.render(source,view);renderer.setRenderTarget(previous);renderer.render(scene,camera);},dispose(){if(disposed)return;disposed=true;target.dispose();geometry.dispose();material.dispose();scene.clear();}};
}
