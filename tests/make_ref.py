import json, pyproj
from pyproj import Transformer, Geod, CRS
pts=[(50.0875,14.4214,235.0),(49.2,16.6,300.0),(50.2090117,16.8497719,500.0),(48.1486,17.1077,134.0),(-33.9,151.2,10.0),(78.2,15.6,0.0)]
out={}
g=Transformer.from_crs("EPSG:4979","EPSG:4978",always_xy=True)
out['ecef']=[g.transform(lo,la,h) for la,lo,h in pts]
def utm(la,lo):
    z=int((lo+180)//6)+1; e=(32600 if la>=0 else 32700)+z
    return [z]+list(Transformer.from_crs("EPSG:4326",f"EPSG:{e}",always_xy=True).transform(lo,la))
out['utm']=[utm(la,lo) for la,lo,h in pts]
out['laea']=[Transformer.from_crs("EPSG:4258","EPSG:3035",always_xy=True).transform(lo,la) for la,lo,h in pts[:4]]
out['lcc']=[Transformer.from_crs("EPSG:4258","EPSG:3034",always_xy=True).transform(lo,la) for la,lo,h in pts[:4]]
out['wm']=[Transformer.from_crs("EPSG:4326","EPSG:3857",always_xy=True).transform(lo,la) for la,lo,h in pts]
# Krovak only (Bessel geographic EPSG:4156 -> 5514), no datum shift
out['krovak']=[Transformer.from_crs("EPSG:4156","EPSG:5514",always_xy=True).transform(lo,la) for la,lo,h in pts[:4]]
# datum: explicit helmert pipeline with the towgs84 set used in the app
pipe=("+proj=pipeline +step +proj=unitconvert +xy_in=deg +xy_out=rad +step +proj=cart +ellps=GRS80 "
 "+step +inv +proj=helmert +x=570.8 +y=85.7 +z=462.8 +rx=4.998 +ry=1.587 +rz=5.261 +s=3.56 +convention=position_vector "
 "+step +inv +proj=cart +ellps=bessel +step +proj=krovak +lat_0=49.5 +lon_0=24.8333333333333 +alpha=30.2881397527778 +k=0.9999 +x_0=0 +y_0=0 +ellps=bessel")
t=Transformer.from_pipeline(pipe)
out['jtsk']=[t.transform(lo,la,h) for la,lo,h in pts[:4]]
# what PROJ itself picks for ETRS89->S-JTSK
tg=pyproj.transformer.TransformerGroup("EPSG:4258","EPSG:5514",always_xy=True)
out['proj_ops']=[(x.description,x.accuracy) for x in tg.transformers]+[("UNAVAILABLE "+x.name,x.accuracy) for x in tg.unavailable_operations]
out['jtsk_proj']=[[list(x.transform(lo,la)) for la,lo,h in pts[:4]] for x in tg.transformers]
gd=Geod(ellps="WGS84"); pairs=[(50.0875,14.4214,49.2,16.6),(50,14,49,17),(48.1486,17.1077,40.7128,-74.006),(10,20,-35,140),(50,14,50,15),(0,0,0.5,179.5)]
out['inv']=[gd.inv(a[1],a[0],a[3],a[2]) for a in pairs]
out['dir']=[gd.fwd(14.4214,50.0875,63.0,250000.0)]
gb=Geod(ellps="bessel"); out['inv_bessel']=[gb.inv(14,50,17,49)]
json.dump({'pts':pts,'pairs':pairs,**out},open('ref.json','w'))
for o in out['proj_ops']: print(o)
