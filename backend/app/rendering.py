import numpy as np
from .schemas import Geometry

def render(terrain, x, y, geometry: Geometry):
    ground = terrain.sample(x,y)
    if not np.isfinite(ground): raise ValueError('Invalid observer location')
    a,b,c,d = terrain.usable(geometry.radius)
    if not (a<=x<=c and b<=y<=d): raise ValueError('Viewpoint does not support complete horizon radius')
    az = np.arange(geometry.samples)*2*np.pi/geometry.samples
    distances = np.unique(np.append(np.arange(geometry.step,geometry.radius,geometry.step),geometry.radius))
    elevations = terrain.sample(x+np.sin(az[:,None])*distances, y+np.cos(az[:,None])*distances)
    if not np.isfinite(elevations).all(): raise ValueError('Incomplete ray coverage: NoData or raster boundary')
    # Spherical drop relative to the observer tangent plane, lunar radius from CRS.
    angle = distances / terrain.radius
    vertical = (terrain.radius+elevations)*np.cos(angle)-(terrain.radius+ground+geometry.height)
    horizontal = (terrain.radius+elevations)*np.sin(angle)
    profile = np.degrees(np.arctan2(vertical,horizontal)).max(axis=1)
    if not np.isfinite(profile).all(): raise ValueError('Nonfinite skyline')
    return profile
