window.requestAnimFrame = (function(){
  return  window.requestAnimationFrame       || 
    window.webkitRequestAnimationFrame || 
    window.mozRequestAnimationFrame    || 
    window.oRequestAnimationFrame      || 
    window.msRequestAnimationFrame     || 
    function( callback ){
    window.setTimeout(callback, 1000 / 60);
  };
})();

var audioContext = new(window.AudioContext || window.webkitAudioContext);

var WIDTH = 640;
var HEIGHT = 360;
var SMOOTHING = 0.8;
var FFT_SIZE = 2048;

var analyser = context.createAnalyser();
analyser.connect(context.destination);
analyser.minDecibels = -140;
analyser.maxDecibels = 0;
var freqs = new Uint8Array(analyser.frequencyBinCount);
var times = new Uint8Array(analyser.frequencyBinCount);

function draw() {
  analyser.smoothingTimeConstant = SMOOTHING;
  analyser.fftSize = FFT_SIZE;

  // Get the frequency data from the currently playing music
  analyser.getByteFrequencyData(freqs);
  analyser.getByteTimeDomainData(times);

  var width = Math.floor(1/freqs.length, 10);

  var canvas = document.querySelector('canvas');
  var drawContext = canvas.getContext('2d');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  // Draw the frequency domain chart.
  for (var i = 0; i < analyser.frequencyBinCount; i++) {
    var value = freqs[i];
    var percent = value / 256;
    var height = HEIGHT * percent;
    var offset = HEIGHT - height - 1;
    var barWidth = WIDTH/analyser.frequencyBinCount;
    var hue = i/analyser.frequencyBinCount * 360;
    drawContext.fillStyle = 'hsl(' + hue + ', 100%, 50%)';
    drawContext.fillRect(i * barWidth, offset, barWidth, height);
  }

  // Draw the time domain chart.
  for (var i = 0; i < analyser.frequencyBinCount; i++) {
    var value = times[i];
    var percent = value / 256;
    var height = HEIGHT * percent;
    var offset = HEIGHT - height - 1;
    var barWidth = WIDTH/analyser.frequencyBinCount;
    drawContext.fillStyle = 'white';
    drawContext.fillRect(i * barWidth, offset, 1, 2);
  }

  if (isPlaying) {
    requestAnimFrame(draw.bind(this));
  }
}

var getFrequencyValue = function(freq) {
  var nyquist = context.sampleRate/2;
  var index = Math.round(freq/nyquist * freqs.length);
  return freqs[index];
}
