var fft = require('fft-js').fft;
var audioContext = new AudioContext();
var game_text = null;
var measurement = null;
var gauge = null;
var chartAxis = null;
var chartMod = null;
var acl = null;
var speedCalculator = null;
var quotes = ["Punch not detected", "Great punch!", "Roll with the punches!"];


// Calculates the *first* velocity peak about X axis, or exiting on timeout.
class MainCalculator {
 constructor(linearAccel, onresult, timeout /*in ms*/) {
   this.accel = linearAccel;
   this.measuring = false;
   this.onresult = onresult;
   this.maxSpeed = 0;

   this.dt_list = [];

   this.ax_data = [];
   this.vx_data = [];

   this.ay_data = [];
   this.vy_data = [];

   this.az_data = [];
   this.vz_data = [];

   this.ax = 0;
   this.vx = 0; // Velocity at time t.
   this.lx = 0;

   this.ay = 0;
   this.vy = 0; // Velocity at time t.
   this.ly = 0;

   this.az = 0;// Acceleration at time t.
   this.vz = 0; // Velocity at time t.
   this.lz = 0;

   this.mod_a = 0;
   this.mod_v = 0;
   this.t = 0;
   this.list_data_axis = {
    a: {x:[], y:[], z:[]},
    v: {x:[], y:[], z:[]},
    l: {x:[], y:[], z:[]}
   }
   this.accel_mod = [];
   this.velocity_mod = [];

   this.timeoutId = 0;
   this.timeout = (timeout == null) ? 5000 : timeout;

   function measure_axis(axis, dt) {
     //setGameText(axis+ " - "+ this.accel[axis]+ " - "+ this['v'+axis]);
     this.list_data_axis.a[axis].push(this.accel[axis]);
     let v = this['v' + axis] + (this.accel[axis] + this['a' + axis]) / 2 * dt;
     let l  = this['l' + axis] + (v + this['v' + axis]) / 2 * dt;
     this.list_data_axis.v[axis].push(v);
     this.list_data_axis.l[axis].push(l);
     this['a'+axis] = this.accel[axis];
     this['v'+axis] = v;
     this['l'+axis] = l;
   }

   function onreading() {
     let dt = (this.accel.timestamp - this.t) * 0.001; // In seconds.
     this.dt_list.push(this.accel.timestamp);
     this.measure_axis('x', dt);
     this.measure_axis('y', dt);
     this.measure_axis('z', dt);
     let mod_a = calcVectorMod(
        this.accel.x, this.accel.y, this.accel.z
     )
     this.accel_mod.push(mod_a);
     let mod_v = this.mod_v + (mod_a + this.mod_a) / 2 * dt;
     this.velocity_mod.push(mod_v);
     this.mod_a = mod_a;
     this.mod_v = mod_v;
     this.t = this.accel.timestamp;
   }

   function ontimeout() {
     if (this.measuring) {
       this.stop();
       this.onresult();
     }

   }
   this.measure_axis = measure_axis.bind(this);
   this.onreading = onreading.bind(this);
   this.ontimeout = ontimeout.bind(this);
   this.onerror = this.stop.bind(this);
 }

 get result() {
   const kmPerHourCoef = 3.6;
   return Math.round(this.maxSpeed * kmPerHourCoef);
 }

 init_measuring() {
   this.maxSpeed = 0;

   this.ax = this.accel.x;
   this.ay = this.accel.y;
   this.az = this.accel.z;

   this.vx = 0;
   this.vy = 0;
   this.vz = 0;

   this.lx = 0;
   this.ly = 0;
   this.lz = 0;

   this.mod_v = 0;

   this.mod_a = calcVectorMod(
        this.accel.x, this.accel.y, this.accel.z
     );
   this.t = this.accel.timestamp;
   this.list_data_axis = {
     a: {x:[], y:[], z:[]},
     v: {x:[], y:[], z:[]},
     l: {x:[], y:[], z:[]}
   };
   this.accel_mod = [];
   this.dt_list = [];
 }

 start() {
   setGameText("Started measuring");
   if (this.timeoutId) {
     clearTimeout(this.timeoutId);
     this.timeoutId = 0;
   }

   if (this.timeoutId) {
     clearTimeout(this.timeoutId);
     this.timeoutId = 0;
   };
   if (this.accel.timestamp === null) {
     setGameText("accelerometer must have initial values");
     return;
   };

   if (this.measuring) {
     setGameText("already measuring");
     return;
   };
   // setGameText("start measuring1"+this.accel );
   this.measuring = true;
   this.accel.addEventListener('reading', this.onreading);
   this.accel.addEventListener('error', this.onerror);
   this.timeoutId = setTimeout(this.ontimeout, this.timeout);
   this.init_measuring();
 }

 stop() {
   setGameText("Stopped measuring");
   this.measuring = false;
   if (this.timeoutId) {
     clearTimeout(this.timeoutId);
     this.timeoutId = 0;
   }
   this.accel.removeEventListener('reading', this.onreading);
   this.accel.removeEventListener('error', this.onerror);
 }

}

function calcVectorMod(x, y, z) {
    return Math.sqrt(x * x + y * y + z * z);
};

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
    setGameText("Ready measure");
}

function clear_clicked() {
  let len_datasets = chartAxis.data.datasets.length;
  for (var i = 0; i <= len_datasets - 1; i++ ) {
    chartAxis.data.datasets.pop();
  };
  len_datasets = chartMod.data.datasets.length;
  for (var i = 0; i <= len_datasets - 1; i++ ) {
    chartMod.data.datasets.pop();
  };
  chartAxis.update();
  chartMod.update();
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

function start_measuring() {
    speedCalculator.start()
};

function start_clicked() {
    setGameText("Pause");
    timeoutId = setTimeout(start_measuring, 1000);
};

function onresult() {
    setGameText(
        "measuring stopped"
    );
    let len_datasets = chartAxis.data.datasets.length;
    for (var i = 0; i <= len_datasets - 1; i++ ) {
        chartAxis.data.datasets.pop();
    }
    len_datasets = chartMod.data.datasets.length;
    for (var i = 0; i <= len_datasets - 1; i++ ) {
        chartMod.data.datasets.pop();
    }
    //speedCalculator.stop();
    var dt = (
        speedCalculator.dt_list[speedCalculator.dt_list.length - 1]
        - speedCalculator.dt_list[0]
    ) * 0.001;
    var freq = 1 / (dt / speedCalculator.dt_list.length);

    var accel_data_correct = speedCalculator.az_data.map(
        function(element) { return element * 0.05; }
    );
    var dataset_ax = {
      data: speedCalculator.list_data_axis.a.x,
      borderColor: "red",
      fill: false
    };
    var dataset_vx = {
      data: speedCalculator.list_data_axis.v.x,
      borderColor: "green",
      fill: false
    };

    var dataset_lx = {
      data: speedCalculator.list_data_axis.l.x,
      borderColor: "red",
      fill: false
    };
    var dataset_ly = {
      data: speedCalculator.list_data_axis.l.y,
      borderColor: "green",
      fill: false
    };
    var dataset_lz = {
      data: speedCalculator.list_data_axis.l.z,
      borderColor: "blue",
      fill: false
    };

    var dataset_ay = {
      data: speedCalculator.list_data_axis.v.y,
      borderColor: "green",
      fill: false
    };
    var dataset_az = {
      data: speedCalculator.list_data_axis.v.z,
      borderColor: "blue",
      fill: false
    };

    var dataset_a = {
      data: speedCalculator.accel_mod,
      borderColor: "red",
      fill: false
    };
    var dataset_v = {
      data: speedCalculator.velocity_mod,
      borderColor: "green",
      fill: false
    };
    chartAxis.data.datasets.push(dataset_lx);
    //  chartAxis.data.datasets.push(dataset_ly);
    // chartAxis.data.datasets.push(dataset_lz);
    chartAxis.data.labels = speedCalculator.dt_list;
    chartAxis.update();

    chartMod.data.datasets.push(dataset_a);
    // chartMod.data.datasets.push(dataset_v);
    chartMod.data.labels = speedCalculator.dt_list;
    chartMod.update();
};

function main() {
  console.log(fft);
  game_text = document.getElementById("game_text");
  start_btn = document.getElementById("start");
  console.log(start_btn);
  start_btn.addEventListener("click", start_clicked);
  clear_btn = document.getElementById("clear");
  clear_btn.addEventListener("click", clear_clicked);
  measurement = document.getElementById("measurement");
  setGameText(game_text.innerText);
  setMeasurement(0);
  function startApp() {
    acl = new LinearAccelerationSensor({frequency: 100});
    speedCalculator = new MainCalculator(acl, onresult, 1000);
    acl.addEventListener('activate', setToInitialState);
    acl.addEventListener('error', error => {
       setGameText("Cannot fetch data from sensor due to an error.");
    });
    chartAxis = new Chart("chartAxis", {
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
    chartMod = new Chart("chartMod", {
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
