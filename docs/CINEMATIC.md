## Cinematic video

The source is the user-provided `LunaTrail_8K_UHD_No_Logo.mp4`, downloaded from the supplied Google Drive link. It is a 10-second 7680×4320 H.264 video at 24 fps.

The default media config in `src/config/scenes.ts` uses:

- `public/media/journey-desktop.mp4`: 1920×1080, H.264, all-intra, 24 fps, no audio, fast-start metadata.
- `public/media/journey-mobile.mp4`: 1280×720, same seeking structure, selected on mobile at initial load.
- `public/media/video-still-01.jpg` through `08.jpg`: extracted frames for reduced-motion layouts.

The full selected clip downloads to a browser blob before the scroll sequence activates. The progress indicator reflects download progress. Native scroll sets target progress; the GSAP ticker interpolates video time while allowing pending seeks to finish. The video is paused, muted, inline, and does not autoplay. The final frame holds before the cinematic viewport releases. The logo/title is semantic HTML over the clean final video frame.

All scene boundaries are centralized in `src/config/scenes.ts` and follow the supplied footage. Local stored storyboard overrides are not automatically restored in this preview, so the requested video is selected on every new load. Media settings can still change the current session.

The original PNG assets remain available for the interchangeable storyboard implementation, but are not the active scroll media.

