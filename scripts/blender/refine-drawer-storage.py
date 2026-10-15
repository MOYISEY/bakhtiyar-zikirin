"""Surgically revise the existing drawer, retaining other editable model scenes.
Usage: blender -b models/room/studio-furniture.blend --disable-autoexec
 --python scripts/blender/refine-drawer-storage.py -- REPO_ROOT OUTPUT_DIR
Output is a candidate .blend + drawer GLB/gzip/report; installation is separate.
"""
import bpy, ast, sys, os, json, hashlib, gzip
from mathutils import Matrix
args=sys.argv[sys.argv.index('--')+1:]
repo, output=map(os.path.abspath,args[:2]);os.makedirs(output,exist_ok=True)
import re
expected=tuple(map(int,re.search(r'(\d+)\.(\d+)\.(\d+)',json.load(open(os.path.join(repo,'models','room','assets.json'),encoding='utf-8-sig'))['blender']).groups()))
if bpy.app.version[:2]!=expected[:2] or bpy.app.version[2]<expected[2]:raise RuntimeError('Use a compatible Blender version: '+str(expected))
source=os.path.join(repo,'scripts','blender','build-studio-furniture.py')
script=ast.parse(open(source,encoding='utf-8-sig').read())
needed={'finish','box','descendants','export_optimised'}
module=ast.Module(body=[n for n in script.body if isinstance(n,ast.FunctionDef) and n.name in needed],type_ignores=[])
if len(module.body)!=len(needed):raise RuntimeError('Export helper changed')
exec(compile(module,source,'exec'),globals())
sys.path.insert(0,os.path.dirname(source))
from drawer_storage import add_document_trays

def fingerprint(root):
    rows=[]
    for o in sorted(descendants(root),key=lambda o:o.name):
        r={'name':o.name,'type':o.type,'parent':o.parent.name if o.parent else None,'location':list(o.location),'rotationMode':o.rotation_mode,'rotationEuler':list(o.rotation_euler),'rotationQuaternion':list(o.rotation_quaternion),'rotationAxisAngle':list(o.rotation_axis_angle),'scale':list(o.scale),'parentInverse':[round(x,9)for row in o.matrix_parent_inverse for x in row]}
        if o.type=='MESH':r['vertices']=[[round(x,9)for x in v.co]for v in o.data.vertices];r['faces']=[list(p.vertices)for p in o.data.polygons];r['materials']=[m.name if m else None for m in o.data.materials]
        elif o.type=='CURVE':r['splines']=[{'type':s.type,'points':[[round(x,9)for x in p.co]for p in s.points],'bezier':[[round(x,9)for x in p.co]for p in s.bezier_points]}for s in o.data.splines];r['bevel']=o.data.bevel_depth
        r['modifiers']=[{'name':m.name,'type':m.type,**({'width':m.width,'segments':m.segments}if m.type=='BEVEL'else{})}for m in o.modifiers]
        rows.append(r)
    return hashlib.sha256(json.dumps(rows,sort_keys=True,separators=(',',':')).encode()).hexdigest()
other_names=['StudioChair','StudioTaskLamp','StudioDoorLeaf','StudioCabinet','StudioReadingTable','StudioWorkbench']
others={n:bpy.data.objects.get(n)for n in other_names}
if any(o is None for o in others.values()):raise RuntimeError('Editable source root missing')
before={n:fingerprint(o)for n,o in others.items()}
root=bpy.data.objects.get('StudioDeskDrawer');tray=bpy.data.objects.get('DrawerTray')
if root is None or tray is None or tray not in root.children_recursive:raise RuntimeError('Original drawer partition missing')
if '--verify-existing' in args:
    old=json.load(open(os.path.join(output,'drawer-revision.json'),encoding='utf8'))
    passed=before==old['otherEditableBefore'] and all(bpy.data.objects.get(n)is None for n in ['Working note paper','Graphite pencil'])
    if not passed:raise RuntimeError('Saved editable source failed independent reload verification')
    with open(os.path.join(output,'source-reload-verification.json'),'w',encoding='utf8')as f:json.dump({'passed':passed,'otherEditableFingerprints':before,'oldContentsAbsent':True},f,indent=2)
    print('SOURCE_RELOAD_VERIFIED')
    raise SystemExit(0)
scene=root.users_scene[0];bpy.context.window.scene=scene
collection=root.users_collection[0]
def layer_for(lc):
    if lc.collection==collection:return lc
    for child in lc.children:
        found=layer_for(child)
        if found:return found
bpy.context.view_layer.active_layer_collection=layer_for(bpy.context.view_layer.layer_collection)
removed=[]
for name in ['Working note paper','Graphite pencil']:
    obj=bpy.data.objects.get(name)
    if obj is None or obj not in tray.children_recursive:raise RuntimeError('Expected old drawer content missing: '+name)
    removed.append({'name':name,'dimensions':list(obj.dimensions),'location':list(obj.location)})
    bpy.data.objects.remove(obj,do_unlink=True)
if any(o.name.startswith('CV tray liner')or o.name.startswith('Education tray liner')for o in tray.children_recursive):raise RuntimeError('Organizer already exists; preserve and inspect')
material=bpy.data.materials.get('Oiled walnut')
if material is None:raise RuntimeError('Existing walnut material missing')
add_document_trays(tray,material,box)
bpy.context.view_layer.update()
after={n:fingerprint(o)for n,o in others.items()}
if before!=after:raise RuntimeError('Unrelated editable geometry changed')
dest=os.path.join(output,'drawer.glb');export_optimised(root,scene,'drawer',dest)
if before!={n:fingerprint(o)for n,o in others.items()}:raise RuntimeError('Exporter changed unrelated editable roots')
raw=open(dest,'rb').read()
with gzip.GzipFile(dest+'.gz','wb',mtime=0,compresslevel=9)as f:f.write(raw)
doc=json.loads(raw[20:20+int.from_bytes(raw[12:16],'little')])
triangles=sum(doc['accessors'][p['indices']]['count']//3 if 'indices'in p else doc['accessors'][p['attributes']['POSITION']]['count']//3 for m in doc.get('meshes',[])for p in m['primitives'])
model={'id':'drawer','triangles':triangles,'webPrimitives':sum(len(m['primitives'])for m in doc.get('meshes',[])),'rawBytes':len(raw),'gzipBytes':os.path.getsize(dest+'.gz'),'sha256':hashlib.sha256(raw).hexdigest()}
notes=bpy.data.texts.get('DRAWER STORAGE REVISION')or bpy.data.texts.new('DRAWER STORAGE REVISION')
notes.clear();notes.write('Old blank note paper and pencil removed to avoid overlap with the real public documents. Two independent low-profile trays support CV and education. Runtime renders the reviewed resume/diploma/certificate surfaces. Other six editable model roots are unchanged. Source: scripts/blender/drawer_storage.py and build-studio-furniture.py.\n')
bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(output,'studio-furniture.blend'),compress=True)
report={'blender':bpy.app.version_string,'removed':removed,'otherEditableBefore':before,'otherEditableAfter':after,'otherEditableUnchanged':before==after,'model':model,'trays':[{'centerX':x,'width':.180,'depth':.305,'supportTopYGlTF':.0365}for x in [-.105,.105]]}
with open(os.path.join(output,'drawer-revision.json'),'w',encoding='utf8')as f:json.dump(report,f,indent=2)
print('DRAWER_REVISION '+json.dumps(report))
