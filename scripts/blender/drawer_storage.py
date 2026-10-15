"""Two separated, low-profile functional document trays inside the existing drawer.
Blender metres/Z-up. No paper or decorative pencil is authored in the GLB:
reviewed public-document surfaces are supplied by the runtime.
"""
def add_document_trays(tray, material, box):
    for label, x in [('CV', -.105), ('Education', .105)]:
        box(label+' tray liner',(.176,.301,.002),(x,-.005,.0355),material,tray,.0006,2)
        for side in [-1,1]:
            box(label+' tray side',(.002,.305,.012),(x+side*.089,-.005,.0415),material,tray,.0006,2)
            box(label+' tray end',(.176,.002,.012),(x,-.005+side*.1515,.0415),material,tray,.0006,2)
