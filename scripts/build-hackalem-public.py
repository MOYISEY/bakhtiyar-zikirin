"""Render the user-provided participation certificate as a privacy-safe public copy.
Requires PyMuPDF. No certificate text, logos or achievements are generated.
Usage: python scripts/build-hackalem-public.py ORIGINAL_PDF OUTPUT_DIRECTORY
"""
from pathlib import Path
import sys,hashlib,json
import pymupdf as pdf
source,out=Path(sys.argv[1]),Path(sys.argv[2]);raw=source.read_bytes()
expected='3b3c665af93d6a2385e3b8102aef2ea359bc52f71b20606203101f687b34f0e4'
assert hashlib.sha256(raw).hexdigest()==expected,'Source differs from the visually reviewed user-provided certificate'
doc=pdf.open(stream=raw,filetype='pdf');assert len(doc)==1
page=doc[0];assert abs(page.rect.width-841.8762)<.01 and abs(page.rect.height-650.3494)<.01
page.add_redact_annot(pdf.Rect(86,508,173,595),fill=(1,1,1));page.apply_redactions();page.insert_textbox(pdf.Rect(87,599,250,613),'QR hidden in public copy',fontsize=7,fontname='helv',color=(.4,.4,.4))
out.mkdir(parents=True,exist_ok=True);files=[]
for suffix,width in [('public',1600),('preview',640)]:
 path=out/('hackalem-2026-'+suffix+'.png');pix=page.get_pixmap(matrix=pdf.Matrix(width/page.rect.width,width/page.rect.width),alpha=False);pix.save(path);files.append({'file':path.name,'width':pix.width,'height':pix.height,'bytes':path.stat().st_size,'sha256':hashlib.sha256(path.read_bytes()).hexdigest()})
report={'sourceSha256':expected,'sourceBytes':len(raw),'sourcePages':1,'kind':'User-provided certificate of participation','event':'HackAlem AI','date':'2026-10-14','place':'Astana, Kazakhstan','redactions':[{'type':'QR verification identifier','pdfRect':[86,508,173,595]}],'notes':'Original participant name retained with user authorization. No handwritten signature seen. Printed logos do not establish their issuance or endorsement. The source Guinness wording is not independently verified or repeated in portfolio copy. Public outputs are raster derivatives, not a regenerated certificate.','outputs':files}
(out/'hackalem-2026-provenance.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8');print(json.dumps(report))
