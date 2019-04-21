var isOn = false;
function buttonHandler() {
  if (isOn) {
    isOn = false;
    StartStop.value = "Start";
    stopIt();
  }
  else {
    isOn = true;
    StartStop.value = "Stop";
    startIt();
  }
}