import json, pyproj, random
from pyproj import Transformer
random.seed(3)
pts=[(50.0875,14.4214,235.0),(49.1951,16.6068,237.0),(50.2090117,16.8497719,500.0),(49.7437,13.3736,360.2),(50.7663,15.0543,420.0),(48.9745,14.4743,381.0),(49.8209,18.2625,260.0),(50.2319,12.8717,447.0)]
pts+=[(random.uniform(48.8,50.9),random.uniform(12.6,18.6),random.uniform(150,900)) for _ in range(40)]
t=Transformer.from_crs("EPSG:4937","EPSG:5514+8357",always_xy=True); print(t.description)
ti=Transformer.from_crs("EPSG:5514+8357","EPSG:4937",always_xy=True)
out={'pts':pts,'jtsk':[t.transform(lo,la,h) for la,lo,h in pts]}
out['inv']=[ti.transform(*o) for o in out['jtsk']]
fr={}
I={'ITRF2020':9988,'ITRF2014':7789,'ITRF2008':5332}; Et={'ETRF2000':7930,'ETRF2014':8401,'ETRF2020':10569}
X=(3979316.4389,1050312.2534,4857066.9036)
for a,ca in I.items():
    for b,cb in Et.items():
        tg=pyproj.transformer.TransformerGroup(f"EPSG:{ca}",f"EPSG:{cb}",always_xy=True); tr=tg.transformers[0]
        for ep in (2026.77,2010.0,1995.5):
            fr[f"{a}>{b}@{ep}"]=[tr.transform(*X,ep)[:3], tr.transform(*X,ep,direction='INVERSE')[:3]]
out['frames']=fr; out['X']=X
mk=Transformer.from_pipeline("+proj=pipeline +step +proj=unitconvert +xy_in=deg +xy_out=rad +step +proj=mod_krovak +lat_0=49.5 +lon_0=24.8333333333333 +alpha=30.2881397222222 +k=0.9999 +x_0=5000000 +y_0=5000000 +ellps=bessel")
out['modk']=[mk.transform(lo,la) for la,lo,h in pts[:8]]
json.dump(out,open('ref2.json','w'))
