"""Blender: source .blend -> black-cloth adaptation. Source/licence in docs/assets/b2-keeper."""
import bpy, math, sys
from pathlib import Path
args=sys.argv[sys.argv.index('--')+1:];output=Path(args[0]).resolve()
rig=next(o for o in bpy.data.objects if o.type=='ARMATURE')
rig.animation_data_clear()
for b in rig.pose.bones:
 for c in list(b.constraints):b.constraints.remove(c)
 b.location=(0,0,0);b.rotation_mode='QUATERNION';b.rotation_quaternion=(1,0,0,0);b.scale=(1,1,1)
for o in list(bpy.data.objects):
 if o.type not in {'MESH','ARMATURE'}:bpy.data.objects.remove(o,do_unlink=True)
cloth=bpy.data.materials.new('Keeper black woven cloth');cloth.use_nodes=True;bsdf=cloth.node_tree.nodes.get('Principled BSDF');bsdf.inputs['Base Color'].default_value=(.012,.014,.016,1);bsdf.inputs['Roughness'].default_value=.96
for o in [o for o in bpy.data.objects if o.type=='MESH']:
 bpy.context.view_layer.objects.active=o;o.select_set(True)
 for m in list(o.modifiers):
  if m.type=='MIRROR':bpy.ops.object.modifier_apply(modifier=m.name)
 o.data.materials.clear();o.data.materials.append(cloth)
 for polygon in o.data.polygons:polygon.material_index=0
 sub=o.modifiers.new('Soft cloth topology','SUBSURF');sub.levels=1;sub.render_levels=1
 while o.modifiers.find(sub.name)>0:bpy.ops.object.modifier_move_up(modifier=sub.name)
 bpy.ops.object.modifier_apply(modifier=sub.name)
 for p in o.data.polygons:p.use_smooth=True
 o.select_set(False)
# Folded ankle-length mantle, weighted to the source hips; source limbs retain their rig.
verts=[];faces=[];rings=24;segments=80
for j in range(rings+1):
 t=j/rings;z=.08+t*1.20;radius=.43*(1-t)+.22*t
 for i in range(segments):
  a=i/segments*math.tau;r=radius*(1+.055*math.cos(a*14+.1*math.sin(t*5)));verts.append((math.sin(a)*r,math.cos(a)*r*.82,z))
for j in range(rings):
 for i in range(segments):
  a=j*segments+i;b=j*segments+(i+1)%segments;faces.append((a,b,b+segments,a+segments))
mesh=bpy.data.meshes.new('Folded robe');mesh.from_pydata(verts,[],faces);mesh.update();robe=bpy.data.objects.new('Keeper folded robe',mesh);bpy.context.collection.objects.link(robe);robe.data.materials.append(cloth)
# Keep the rig's original world-space bind: hips at z=1.1.
vg=robe.vertex_groups.new(name='MCH-hips');vg.add(list(range(len(verts))),1,'REPLACE');modifier=robe.modifiers.new('Source rig','ARMATURE');modifier.object=rig
for p in robe.data.polygons:p.use_smooth=True
for o in bpy.data.objects:o.select_set(o.type in {'MESH','ARMATURE'})
rig['source']='https://opengameart.org/content/low-poly-hooded-character-rigged-blender';rig['author']='kednar / Pablo Lopez Soriano';rig['license']='CC-BY-SA-4.0';rig['adaptation']='Black cloth, gloves, boots, smooth topology and folded mantle for MONOCHROME B2.'
bpy.ops.export_scene.gltf(filepath=str(output),export_format='GLB',use_selection=True,export_animations=False,export_extras=True,export_def_bones=True,export_yup=True)
print('EXPORTED',output)
