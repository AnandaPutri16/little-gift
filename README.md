# A Little World for You

A frontend-only, static love letter in the form of a tiny interactive room. It uses procedural Three.js geometry, so no model files or build step are needed.

## Run locally

Open this folder with VS Code and serve it with a static server (for example, the Live Server extension). The Three.js module is loaded from jsDelivr, so an internet connection is needed for the 3D scene. The CSS room fallback remains available if WebGL cannot start.

## Make it yours

At the top of `script.js`, edit the `loveData` object:

- Set `boyfriendName` and `yourName`.
- Rewrite the intro, letter, star notes, and final message.
- The configured Spotify track is `6dBUzqjtbnIa1TwYbyw5CM`. Replace `spotify.url` in `script.js` to use another Open.spotify.com track, album, or playlist. The official Spotify iFrame API attempts autoplay when ready and retries from the Enter tap; browsers may still require that gesture. Playback stays under Spotify's controls, and the corner indicator and room effects follow Spotify playback events.
- Change each image in `photos` to your own file, for example `assets/images/photo1.jpg` through `photo5.jpg`, and add those files to `assets/images`. The included scrapbook illustration is used until you replace the paths.

## Publish

The project is plain HTML, CSS, and JavaScript and can be published directly from a GitHub Pages branch. Keep `index.html`, `style.css`, and `script.js` at the published root. The Three.js import map points to a versioned CDN URL.