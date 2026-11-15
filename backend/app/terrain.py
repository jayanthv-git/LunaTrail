import hashlib
import numpy as np
import rasterio
from rasterio.windows import Window
from pyproj import CRS, Transformer

def fingerprint(path):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        for block in iter(lambda: f.read(1024*1024), b''): h.update(block)
    return h.hexdigest()

def metadata(path):
    with rasterio.open(path) as ds:
        if ds.count != 1 or not ds.crs or ds.transform.b or ds.transform.d:
            raise ValueError('A north-up, single-band projected lunar DEM is required')
        crs = CRS(ds.crs)
        if not crs.is_projected or not 1700000 < crs.ellipsoid.semi_major_metre < 1800000:
            raise ValueError('Expected a lunar projected CRS')
        return dict(width=ds.width, height=ds.height, bounds=list(ds.bounds), resolution=list(ds.res),
                    crs=ds.crs.to_wkt(), transform=list(ds.transform), units='meters',
                    scales=list(ds.scales), offsets=list(ds.offsets), nodata=str(ds.nodata),
                    radius_m=crs.ellipsoid.semi_major_metre)

class Terrain:
    def __init__(self, path):
        self.metadata = metadata(path)
        self.fingerprint = fingerprint(path)
        with rasterio.open(path) as ds:
            # Full source is supported without allocating its entire elevation band.
            w, h = min(ds.width, 256), min(ds.height, 256)
            window = Window((ds.width-w)//2, (ds.height-h)//2, w, h)
            self.z = ds.read(1, window=window, masked=True).filled(np.nan).astype(float)*ds.scales[0]+ds.offsets[0]
            self.transform = ds.window_transform(window)
            self.crs = CRS(ds.crs)
        self.radius = self.crs.ellipsoid.semi_major_metre
        self.geo = Transformer.from_crs(self.crs, self.crs.geodetic_crs, always_xy=True)
        self.h, self.w = self.z.shape
        a,b = self.pixel_to_world(0, self.h-1); c,d = self.pixel_to_world(self.w-1,0)
        self.bounds = [a,b,c,d]
        left,bottom = self.transform @ (0,self.h)
        right,top = self.transform @ (self.w,0)
        self.metadata.update(active_bounds=[left,bottom,right,top], sample_center_bounds=self.bounds, active_shape=list(self.z.shape),
                             valid_pixels=int(np.isfinite(self.z).sum()), fingerprint=self.fingerprint)
    def pixel_to_world(self, col, row):
        return self.transform @ (np.asarray(col)+.5, np.asarray(row)+.5)
    def world_to_pixel(self, x, y):
        c,r = ~self.transform @ (np.asarray(x), np.asarray(y))
        return c-.5,r-.5
    def sample(self, x, y):
        c,r = self.world_to_pixel(x,y)
        c,r = np.broadcast_arrays(c,r)
        valid = (c>=0)&(r>=0)&(c<self.w-1)&(r<self.h-1)
        ci = np.clip(np.floor(c).astype(int),0,self.w-2); ri = np.clip(np.floor(r).astype(int),0,self.h-2)
        u,v = c-ci,r-ri
        out = self.z[ri,ci]*(1-u)*(1-v)+self.z[ri,ci+1]*u*(1-v)+self.z[ri+1,ci]*(1-u)*v+self.z[ri+1,ci+1]*u*v
        return np.where(valid,out,np.nan)
    def usable(self, radius):
        a,b,c,d = self.bounds
        return [a+radius+1,b+radius+1,c-radius-1,d-radius-1]
    def position(self,x,y):
        lon,lat = self.geo.transform(x,y)
        return dict(x=float(x),y=float(y),lat=lat,lon=lon)
