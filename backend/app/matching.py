import numpy as np
from time import perf_counter

def match(observed, profiles, mode, geometry, reference_geometry, top_k=5, algorithm='angular-rmse'):
    start = perf_counter()
    if geometry != reference_geometry: raise ValueError('Incompatible profile geometry')
    obs, refs = np.asarray(observed), np.asarray(profiles)
    n = geometry['samples']
    if obs.shape != (n,) or refs.ndim != 2 or refs.shape[1]!=n or not len(refs): raise ValueError('Complete uniformly sampled circular profiles required')
    if not np.isfinite(obs).all() or not np.isfinite(refs).all() or np.max(np.abs(obs))>90: raise ValueError('Invalid angular values')
    if mode not in ('known','unknown'): raise ValueError('Invalid heading mode')
    raw_refs=refs.copy()
    if algorithm == 'normalized-correlation':
        obs=obs-obs.mean(); refs=refs-refs.mean(axis=1,keepdims=True)
        norm=np.linalg.norm(obs); norms=np.linalg.norm(refs,axis=1,keepdims=True)
        if norm<1e-10 or (norms<1e-10).any(): raise ValueError('Flat profiles cannot be normalized')
        obs=obs/norm; refs=refs/norms
    elif algorithm != 'angular-rmse': raise ValueError('Unsupported similarity algorithm')
    if mode == 'known':
        shifts = np.zeros(len(refs),dtype=int)
        scores = np.sqrt(np.mean((refs-obs)**2,axis=1))
    else:
        # corr[s] = sum refs[i+s] * obs[i]; positive heading looks clockwise from +Y.
        corr = np.fft.irfft(np.fft.rfft(refs,axis=1)*np.conj(np.fft.rfft(obs)),n=n,axis=1)
        shifts = corr.argmax(axis=1)
        scores = np.sqrt(np.maximum(0,(refs**2).mean(axis=1)+(obs**2).mean()-2*corr.max(axis=1)/n))
    similarities = 1 - n*scores**2/2 if algorithm=='normalized-correlation' else 1/(1+scores)
    order = np.argsort(scores,kind='stable')[:top_k]
    rows = [dict(candidate=int(i),score=float(scores[i]),similarity=float(np.clip(similarities[i],-1,1)),heading=float(shifts[i]*360/n),
                 values=np.roll(raw_refs[i],-int(shifts[i])).tolist()) for i in order]
    return dict(candidates=rows,processingMs=(perf_counter()-start)*1000,
                score_gap_deg=float(np.sort(scores)[1]-np.min(scores)) if len(scores)>1 and algorithm=='angular-rmse' else None,
                algorithm=algorithm,searched=len(refs),heading_steps=n if mode=='unknown' else 1)
