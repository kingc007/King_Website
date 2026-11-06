// GPU chroma key for the full-screen green-screen videos.
//
// `filter: url(#chromakey)` on a <video> is an SVG reference filter: the browser
// reads every decoded frame back to the CPU, filters it there and re-uploads it.
// On a full-screen (or 3.4x-scaled) video that is what made transitions stutter.
// This draws the same key (alpha = 8R - 8G + 2B + 1, see #chromakey in index.html)
// in a WebGL shader onto a canvas laid over the video. The canvas mirrors the
// video's classes and inline style, so all existing CSS keeps positioning it.
// If WebGL is unavailable nothing changes and the SVG filter stays in use.
(function () {
  const TARGETS = [
    // [id, is the key active right now?, brightness]
    ['transition-out', (v) => v.classList.contains('chroma'), (v) => (v.classList.contains('darkred') ? 0.73 : 1)],
    ['explosion-fx', () => true, () => 1],
    ['start-gate-sting', () => true, () => 1],
  ];

  const VS = 'attribute vec2 p;varying vec2 uv;void main(){uv=vec2(p.x*.5+.5,.5-p.y*.5);gl_Position=vec4(p,0.,1.);}';
  const FS = 'precision mediump float;varying vec2 uv;uniform sampler2D t;uniform float k;' +
    'void main(){vec3 c=texture2D(t,uv).rgb;float a=clamp(8.*c.r-8.*c.g+2.*c.b+1.,0.,1.);' +
    'gl_FragColor=vec4(c*k*a,a);}';

  function setup(video, keyOn, gain) {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl', { premultipliedAlpha: true, alpha: true, antialias: false, preserveDrawingBuffer: false })
      || canvas.getContext('experimental-webgl');
    if (!gl) return;

    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
    const prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    gl.useProgram(prog);

    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const uK = gl.getUniformLocation(prog, 'k');

    gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.clearColor(0, 0, 0, 0);

    canvas.setAttribute('aria-hidden', 'true');
    video.after(canvas);

    // Mirror the video's classes and inline style so every existing rule
    // (position, z-index, opacity, transforms, .show / .is-playing) applies.
    const sync = () => {
      const on = keyOn(video);
      canvas.className = video.className.replace(/\bglk-src\b/g, '') + ' glk-canvas' + (on ? '' : ' glk-off');
      canvas.style.cssText = video.style.cssText;
      video.classList.toggle('glk-src', on);
      gl.uniform1f(uK, gain(video));
    };
    new MutationObserver(sync).observe(video, { attributes: true, attributeFilter: ['class', 'style'] });
    sync();

    function draw() {
      if (video.readyState < 2 || !video.videoWidth) return;
      if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        gl.viewport(0, 0, canvas.width, canvas.height);
      }
      try {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, video);
      } catch (e) { return; }
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }

    if ('requestVideoFrameCallback' in video) {
      const onFrame = () => { if (video.classList.contains('glk-src')) draw(); video.requestVideoFrameCallback(onFrame); };
      video.requestVideoFrameCallback(onFrame);
    } else {
      let raf = 0;
      const loop = () => { draw(); raf = video.paused || video.ended ? 0 : requestAnimationFrame(loop); };
      video.addEventListener('play', () => { if (!raf) raf = requestAnimationFrame(loop); });
      video.addEventListener('seeked', draw);
    }
    video.addEventListener('loadeddata', draw);
    video.addEventListener('seeked', draw);
  }

  TARGETS.forEach(([id, keyOn, gain]) => {
    const v = document.getElementById(id);
    if (v) { try { setup(v, keyOn, gain); } catch (e) {} }
  });
})();
