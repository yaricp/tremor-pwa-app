var audioContext = new AudioContext();
var game_text = null;
var measurement = null;
var gauge = null;
var myChart = null;
var acl = null;
var speedCalculator = null;
var quotes = ["Punch not detected", "Great punch!", "Roll with the punches!"];


// Calculates the *first* velocity peak about X axis, or exiting on timeout.
class MaxSpeedCalculator {
 constructor(linearAccel, onresult, onpunchdetected, timeout /*in ms*/) {
   this.accel = linearAccel;
   this.measuring = false;
   this.onresult = onresult;
   this.onpunchdetected = onpunchdetected;
   this.punchDetected = false;
   this.maxSpeed = 0;

   this.accel_data = [];
   this.vx_data = [];
   this.dt_list = [];

   this.vx = 0; // Velocity at time t.
   this.ax = 0; // Acceleration at time t.
   this.t = 0;

   this.timeoutId = 0;
   this.timeout = (timeout == null) ? 5000 : timeout;

   function onreading() {
     let dt = (this.accel.timestamp - this.t) * 0.001; // In seconds.
     this.dt_list.push(dt);
     this.accel_data.push(this.accel.x);
     let vx = this.vx + (this.accel.x + this.ax) / 2 * dt;
     this.vx_data.push(vx);
     let speed = Math.abs(vx);

     const punchTreashold = 3; // m/s
     if (this.maxSpeed < speed && speed >= punchTreashold) {
       this.maxSpeed = speed;
       if (!this.punchDetected && this.onpunchdetected) {
         this.punchDetected = true;
         this.onpunchdetected();
       }
     }

     if (this.maxSpeed > speed) {
       this.stop();
       this.onresult();
       return;
     }

     this.t = this.accel.timestamp;
     this.ax = this.accel.x;
     this.vx = vx;
   }

   function ontimeout() {
     if (this.measuring) {
       this.stop();
       this.onresult();
     }
   }

   this.onreading = onreading.bind(this);
   this.ontimeout = ontimeout.bind(this);
   this.onerror = this.stop.bind(this);
 }

 get result() {
   const kmPerHourCoef = 3.6;
   return Math.round(this.maxSpeed * kmPerHourCoef);
 }

 start() {
   if (this.accel.timestamp === null) {
     console.error("accelerometer must have initial values");
     return;
   }

   if (this.measuring) {
     console.error("already measuring");
     return;
   }

   this.measuring = true;
   this.maxSpeed = 0;
   this.punchDetected = false;

   this.vx = 0;
   this.vy = 0;
   this.vz = 0;

   this.ax = this.accel.x;
   this.ay = this.accel.y;
   this.az = this.accel.z;
   this.t = this.accel.timestamp;

   this.accel.addEventListener('reading', this.onreading);
   this.accel.addEventListener('error', this.onerror);
   this.timeoutId = setTimeout(this.ontimeout, this.timeout);
 }

 stop() {
   this.measuring = false;
   if (this.timeoutId) {
     clearTimeout(this.timeoutId);
     this.timeoutId = 0;
   }
   this.accel.removeEventListener('reading', this.onreading);
   this.accel.removeEventListener('error', this.onerror);
 }

}

function setGameText(text) {
  game_text.innerText = text;
  game_text.style.display="none";
  game_text.style.display="block";
}

function setMeasurement(val) {
  measurement.style.display="none";
  measurement.style.display="block";
}

function getQuote(val) {
  if (val < 2)
    return quotes[0];
  if (val < 15)
    return quotes[1];

  return quotes[2];
}

function setToInitialState() {
  var shaking = false;

  function onreading() {
    const shakeTreashold = 3 * 9.8;
    const stillTreashold = 1;
    let magnitude = Math.hypot(acl.x, acl.y, acl.z);
    if (magnitude > shakeTreashold) {
      shaking = true;
      setGameText(magnitude);
    } else if (magnitude < stillTreashold && shaking) {
      shaking = false;
      acl.removeEventListener('reading', onreading);
      setMeasurement(0);
      setGameText("Punch now!");
      speedCalculator.start();
    }
  }

  acl.addEventListener('reading', onreading);
}

function onresult() {
  setMeasurement(speedCalculator.result);
  setGameText(getQuote(speedCalculator.result) + " Shake to try again!");
  setTimeout(setToInitialState, 1000);
}

function generateKickSound() {
  let oscillator = audioContext.createOscillator();
  let gain = audioContext.createGain();
  oscillator.connect(gain);
  gain.connect(audioContext.destination);

  let startTime = audioContext.currentTime;
  let endTime = startTime + 0.1;

  oscillator.frequency.setValueAtTime(500, startTime);
  oscillator.frequency.exponentialRampToValueAtTime(0.05, endTime);
  gain.gain.setValueAtTime(40, startTime);
  gain.gain.exponentialRampToValueAtTime(0.05, endTime);

  oscillator.start(startTime);
  oscillator.stop(endTime);
};

function start_clicked() {
    setGameText("measuring started");
    speedCalculator.start();
};

function stop_clicked() {

    speedCalculator.stop();
    var dt = (
        speedCalculator.dt_list[speedCalculator.dt_list.length - 1]
        - speedCalculator.dt_list[0]
    );
    var freq = 1 / (speedCalculator.dt_list[10] - speedCalculator.dt_list[9]);
    setGameText(
        "measuring stopped dt:"
        + dt + ", freq: "
        + freq + ", count: "
        + speedCalculator.dt_list.length + " t2: "
        + speedCalculator.dt_list[10] + " t1: "
        + speedCalculator.dt_list[9]
    );
    var accel_data_correct = speedCalculator.accel_data.map(
        function(element) { return element * 0.05; }
    );
    var dataset_a = {
      data: accel_data_correct,
      borderColor: "red",
      fill: false
    };
    var dataset_v = {
      data: speedCalculator.vx_data,
      borderColor: "green",
      fill: false
    };
    myChart.data.datasets.pop();
    myChart.data.datasets.push(dataset_a);
    myChart.data.datasets.push(dataset_v);
    myChart.data.labels = speedCalculator.dt_list;
    myChart.update();
};

function main() {

  game_text = document.getElementById("game_text");
  start_btn = document.getElementById("start");
  console.log(start_btn);
  start_btn.addEventListener("click", start_clicked);
  stop_btn = document.getElementById("stop");
  console.log(stop_btn);
  stop_btn.addEventListener("click", stop_clicked);
  measurement = document.getElementById("measurement");
  setGameText(game_text.innerText);
  setMeasurement(0);
  function startApp() {
    acl = new LinearAccelerationSensor({frequency: 60});
    speedCalculator = new MaxSpeedCalculator(acl, onresult, generateKickSound);

    acl.addEventListener('activate', setToInitialState);
    acl.addEventListener('error', error => {
       setGameText("Cannot fetch data from sensor due to an error.");
    });
    myChart = new Chart("myChart", {
      type: "line",
      data: {
        labels: [1, 2, 3],
        datasets: [{
          data: [860, 1140, 1060],
          borderColor: "red",
          fill: false
        }]
      },
      options: {
        legend: {display: false}
      }
    });
    acl.start();
  }
  if ('LinearAccelerationSensor' in window) {

    navigator.permissions.query({ name: "accelerometer" }).then(result => {
      if (result.state != 'granted') {
        setGameText("Sorry, we're not allowed to access sensors " +
                    "on your device..");
        return;
      }
      startApp();
    }).catch(err => {
      console.log("Integration with Permissions API is not enabled, still try to start");
      startApp();
    });
  } else {
    setGameText("Your browser doesn't support sensors.");
    setMeasurement(0);
  }
}
