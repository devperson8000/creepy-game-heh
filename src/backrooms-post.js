import * as T from 'three';
export function createBackroomsPost(renderer){
 const target=new T.WebGLRenderTarget(1,1,{minFilter:T.LinearFilter,magFilter:T.LinearFilter,type:renderer.extensions.has('EXT_color_buffer_float')?T.HalfFloatType:T.UnsignedByteType}),scene=new T.Scene(),screenCamera=new T.OrthographicCamera(-1,1,1,-1,0,1);
 const geometry=new T.PlaneGeometry(2,2),material=new T.ShaderMaterial({depthTest:false,depthWrite:false,uniforms:{picture:{value:target.texture},t:{value:0},amount:{value:1},size:{value:new T.Vector2(1,1)}},vertexShader:'varying vec2 v;void main(){v=uv;gl_Position=vec4(position.xy,0.,1.);}',fragmentShader:`
 varying vec2 v;uniform sampler2D picture;uniform float t;uniform float amount;uniform vec2 size;
 float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
 void main(){
  vec2 p=v,c=p-.5;float frame=floor(t*29.97);float radius=dot(c,c);
  p=c*(1.+radius*.038*amount)+.5;
  float line=floor(p.y*480.);float jitter=(hash(vec2(line,frame))-.5)*.0009;
  float tracking=(1.-smoothstep(0.,.025,abs(p.y-fract(t*.031))))*.0018*sin(t*5.);
  p.x+=(jitter+tracking)*amount;
  vec2 pixel=1./size;float bleed=.0018*amount;
  vec3 color=vec3(texture2D(picture,p+vec2(bleed,0.)).r,texture2D(picture,p).g,texture2D(picture,p-vec2(bleed,0.)).b);
  vec3 glow=vec3(0.);for(int i=1;i<=3;i++){vec2 off=vec2(float(i)*2.)*pixel;glow+=max(texture2D(picture,p+off).rgb-.78,0.);glow+=max(texture2D(picture,p-off).rgb-.78,0.);}color+=glow*.055;
  float lum=dot(color,vec3(.299,.587,.114));color=mix(color,vec3(lum),.055*amount);
  color*=1.-radius*.55;float grain=hash(floor(p*vec2(720.,480.))+frame)-.5;
  float head=1.-smoothstep(0.,.013,p.y);color+=grain*.055*amount+head*(hash(vec2(line,frame))-.5)*.14*amount;
  color*=1.-.022*amount*(.5+.5*sin(p.y*480.*3.14159));
  gl_FragColor=vec4(max(color,0.),1.);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
 }`});scene.add(new T.Mesh(geometry,material));
 return {resize(w,h){const width=Math.min(1280,w),height=Math.max(1,Math.round(width*h/w));target.setSize(width,height);material.uniforms.size.value.set(width,height);},render(world,camera,time,{vhs=true,reduced=false}={}){if(!vhs){renderer.render(world,camera);return;}material.uniforms.t.value=reduced?0:time;material.uniforms.amount.value=vhs?1:0;renderer.setRenderTarget(target);renderer.render(world,camera);renderer.setRenderTarget(null);renderer.render(scene,screenCamera);},dispose(){target.dispose();geometry.dispose();material.dispose();}};
}
