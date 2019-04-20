var audioContext = new(window.AudioContext || window.webkitAudioContext);

const ana = audioContext.createAnalyser();
var frequency = audioContext.createConstantSource();
var harmonic = audioContext.createConstantSource();
var modulation_scale = audioContext.createConstantSource();
var multiply_1 = audioContext.createGain();
var multiply_2 = audioContext.createGain();
var multiply_3 = audioContext.createGain();
var multiply_4 = audioContext.createGain();
multiply_1.gain.value = 0;
multiply_2.gain.value = 0;
multiply_3.gain.value = 0;
multiply_4.gain.value = 0;

var add_1 = audioContext.createGain();
var add_2 = audioContext.createGain();
var const_one = audioContext.createConstantSource();
var const_half = audioContext.createConstantSource();

frequency.start();
harmonic.start();
modulation_scale.start();
const_one.start();
const_half.start();

const_one.offset.value = 1;
const_half.offset.value = 0.5;

frequency.connect(multiply_1);
harmonic.connect(multiply_1.gain);

const_one.connect(add_1);
add_1.connect(multiply_2);
const_half.connect(multiply_2.gain);
modulation_scale.connect(multiply_3);
multiply_2.connect(multiply_3.gain);
multiply_3.connect(add_2);
const_one.connect(add_2);
add_2.connect(multiply_4.gain);
multiply_4.connect(audioContext.destination);
multiply_4.connect(ana);

let carrier;
let modulator;
window.onload = () => {
  var start = 0;

  function paly() {
    if (start === 0) {
      carrier = audioContext.createOscillator();
      modulator = audioContext.createOscillator();
      carrier.frequency.value = 0;
      modulator.frequency.value = 0;

      _connect_oscillator();
      frequency.offset.value = frequency_Slide.value;
      harmonic.offset.value = harmonic_Slide.value;
      modulation_scale.offset.value = m_idx_Slide.value;
      carrier.start();
      modulator.start();
      start = 1;
    }
  }
  
  function stop() {
    if (start === 1) {
      carrier.stop();
      modulator.stop();
      _remove_old_oscillator();
      start = 0;
    }
  }
  
  function _connect_oscillator() {
    frequency.connect(carrier.frequency);
    carrier.connect(multiply_4);
    multiply_1.connect(modulator.frequency);
    modulator.connect(add_1);
  }

  function _remove_old_oscillator() {
    multiply_1.disconnect(modulator.frequency);
    modulator.disconnect(add_1);
    frequency.disconnect(carrier.frequency);
    carrier.disconnect(multiply_4);
  }

  var playBtn = document.getElementById('start-btn');
  var stopBtn = document.getElementById('stop-btn');
  var frequency_Slide = document.getElementById('frequency');
  var harmonic_Slide = document.getElementById('harmonicity');
  var m_idx_Slide = document.getElementById('modulationScale');
  var frequency_value = document.getElementById('frequency-value');
  var harmonic_value = document.getElementById('harmonicity-value');
  var m_idx_value = document.getElementById('modulationScale-value');

  playBtn.addEventListener('click', () => {
    paly();
  });

  stopBtn.addEventListener('click', () => {
    stop();
  });

  frequency_Slide.addEventListener('change', (ev) => {
    frequency.offset.value = frequency_Slide.value;
    frequency_value.innerText = frequency_Slide.value;
  });
  harmonic_Slide.addEventListener('change', (ev) => {
    harmonic.offset.value = harmonic_Slide.value;
    harmonic_value.innerText = harmonic_Slide.value;
  });
  m_idx_Slide.addEventListener('change', (ev) => {
    modulation_scale.offset.value = m_idx_Slide.value;
    m_idx_value.innerText = m_idx_Slide.value;
  });

  const canvas = (document.getElementById('waveform'));
  const capturebuf = new Float32Array(512);
  const canvasctx = canvas.getContext('2d');
  function DrawGraph() {
    ana.getFloatTimeDomainData(capturebuf);
    canvasctx.fillStyle = "#222222";
    canvasctx.fillRect(0, 0, 512, 512);
    canvasctx.fillStyle = "#00ff44";
    canvasctx.fillRect(0, 256, 512, 1);
    for(let i = 0; i < 512; ++i) {
      const v = 256 - capturebuf[i] * 128;
      canvasctx.fillRect(i, v, 1, 256 - v);
    }
    window.requestAnimationFrame(DrawGraph);
  }
  window.requestAnimationFrame(DrawGraph);
}






