var audioContext = new(window.AudioContext || window.webkitAudioContext);

var frequency = audioContext.createConstantSource();
var harmonic = audioContext.createConstantSource();
var modulation_scale = audioContext.createConstantSource();