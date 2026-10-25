"""Run with Blender --background --python ... -- /absolute/Needle.fbx.
Exports the supplied skinned model and its source animation, with the supplied texture maps embedded when available.
"""
import bpy, sys, os, json
source=sys.argv[sys.argv.index('--')+1]
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.fbx(filepath=source)
rig=next(o for o in bpy.context.scene.objects if o.type=='ARMATURE')
action=rig.animation_data.action
action.name='Needlelimbs_Walk'
# The supplied Rigify metarig uses numbered spine bones for its neck and head.
rig.data.bones['spine.006'].name='Head'
rig.data.bones['spine.005'].name='Neck'
# Source maps extracted from the user-supplied textures.docx.
texture_dir=os.path.join(os.path.dirname(os.path.abspath(__file__)),'needlelimbs')
# Missing source texture must not become a broken image in the browser.
for o in bpy.context.scene.objects:
 if o.type!='MESH': continue
 for m in o.data.materials:
  m.use_nodes=True
  for n in list(m.node_tree.nodes):
   if n.type=='TEX_IMAGE': m.node_tree.nodes.remove(n)
  bsdf=next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
  bsdf.inputs['Base Color'].default_value=(.065,.075,.061,1)
  bsdf.inputs['Roughness'].default_value=.87
  bsdf.inputs['Metallic'].default_value=0
  def image_node(filename,colorspace):
   image=bpy.data.images.load(os.path.join(texture_dir,filename),check_existing=True)
   image.colorspace_settings.name=colorspace
   node=m.node_tree.nodes.new('ShaderNodeTexImage');node.image=image
   return node
  if os.path.exists(os.path.join(texture_dir,'base-color.jpg')):
   color=image_node('base-color.jpg','sRGB')
   m.node_tree.links.new(color.outputs['Color'],bsdf.inputs['Base Color'])
   rough=image_node('roughness.jpg','Non-Color')
   m.node_tree.links.new(rough.outputs['Color'],bsdf.inputs['Roughness'])
   normal=image_node('normal.png','Non-Color')
   normal_node=m.node_tree.nodes.new('ShaderNodeNormalMap')
   m.node_tree.links.new(normal.outputs['Color'],normal_node.inputs['Color'])
   m.node_tree.links.new(normal_node.outputs['Normal'],bsdf.inputs['Normal'])
# Export only the real skeleton/model and its one reviewed source action.
for a in list(bpy.data.actions):
 if a!=action: bpy.data.actions.remove(a)
bpy.context.scene.frame_start=int(action.frame_range[0]);bpy.context.scene.frame_end=int(action.frame_range[1])
bpy.context.scene.frame_set(bpy.context.scene.frame_start)
out=os.path.abspath('public/models/teaser/needlelimbs.glb')
bpy.ops.export_scene.gltf(filepath=out,export_format='GLB',export_animations=True,export_animation_mode='ACTIVE_ACTIONS',export_frame_range=True,export_force_sampling=True)
# Blender's merged active-action export uses a generic name; give the reviewed clip a stable identity.
import struct
raw=open(out,'rb').read(); length=struct.unpack_from('<I',raw,12)[0]
doc=json.loads(raw[20:20+length]);doc['animations'][0]['name']='Needlelimbs_Walk'
payload=json.dumps(doc,separators=(',',':')).encode();payload+=b' '*((-len(payload))%4)
rest=raw[20+length:]
open(out,'wb').write(struct.pack('<III',0x46546c67,2,20+len(payload)+len(rest))+struct.pack('<II',len(payload),0x4e4f534a)+payload+rest)
print('EXPORTED',out,os.path.getsize(out))
