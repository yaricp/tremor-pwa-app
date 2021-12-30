var fft = require("fft-js").fft,
fftUtil = require('fft-js').util;
var list_axis = ["x", "y", "z"];
var list_indicators = ["a", "v", "l"];
var filter_value = 3;
var pause_measuring = 500;
var game_text = null;
var result_text = null;
var measurement = null;
var charts = {};
var fft_charts = {};
var resultsa = {};
var resultsv = {};
var resultsl = {};
var acl = null;
var speedCalculator = null;
var quotes = ["Punch not detected", "Great punch!", "Roll with the punches!"];
const average = (array) => array.reduce((a, b) => a + b) / array.length;

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
   setGameText("Stopped measuring" + this.list_data_axis.a.x.length);
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

function calcLocaleExtremums(signal) {
    let loc_extremums = {
        max: [],
        min: []
    }
    let last_value = 0;
    let last_time  = 0;
    let up = false;
    let down = false;
    for (let idx = 0; idx <= signal.value.length; idx++) {
        if (last_value < signal.value[idx]) {
            if (down) {
                loc_extremums.min.push({
                    value: last_value,
                    time: last_time
                });
            }
            up = true;
            down = false;

        } else if (last_value > signal.value[idx]) {
            if (up) {
                loc_extremums.max.push({
                    value: last_value,
                    time: last_time
                });
            }
            up = false;
            down = true;
        }
        last_value = signal.value[idx];
        last_time = signal.time[idx];
    }
    return loc_extremums;
};

function calcDiffExt(ext_list) {
    let list_diff = [];
    let last_value;
    for (let el of ext_list.max) {
        if (last_value) {
            list_diff.push((el.value - last_value).toFixed(2));
        }
       last_value = el.value;
    }
    return list_diff;
}

function prepareDataForFFT(signal) {
    while (signal.length > 64) {
        signal.pop();
      }
    return signal;
}

function getFFT(signal) {
    setGameText("Signal Length: " + signal.length);
    signal = prepareDataForFFT(signal);
    let phasors = fft(signal);
    let freq = fftUtil.fftFreq(phasors, 60)
    let magnitudes = fftUtil.fftMag(phasors);
    setGameText("freq length: " + freq.length);
    return [freq, magnitudes]
};

function filterFFT(values, filter_value) {
    let res_freq = [];
    let res_magn = [];
    for (let idx = 0 ; idx <= values[0].length; idx++) {
        if (values[0][idx] > filter_value) {
            res_freq.push(values[0][idx]);
            res_magn.push(values[1][idx]);
        }
    };
    return [res_freq, res_magn]
};

function searchFreqMaxMagn(values) {
    let res_magn = values[1];
    let res_freq = values[0];
    let max = res_magn[0];
    let max_idx = null;
    for (let idx = 1; idx < res_magn.length; idx++) {
      if (res_magn[idx] > max) {
        max = res_magn[idx];
        max_idx = idx;
      }
    };
    if (!res_freq[max_idx] || !max) {
        return null;
    }
    return [res_freq[max_idx], max]
}

function getMagnitude(signal) {
  let values = getFFT(signal);
  values = filterFFT(values, filter_value);
  let res = searchFreqMaxMagn(values);
  if (!res) {
    return null;
  };
  return res[1];
}

function getAverageFreq(signal) {
  let values = getFFT(signal);
  values = filterFFT(values, filter_value);
  let res = searchFreqMaxMagn(values);
  if (!res) {
    return null;
  };
  return res[0];
}

function setGameText(text) {
  game_text.innerText = text;
  game_text.style.display="none";
  game_text.style.display="block";
}

function setResultText(text, element) {
  element.innerText = text;
  element.style.display="none";
  element.style.display="block";
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
    setGameText("Ready to measure");
}

function clear_clicked() {
  for (let axis of list_axis) {
    let len_datasets = charts[axis].data.datasets.length;
    for (var i = 0; i <= len_datasets - 1; i++ ) {
        charts[axis].data.datasets.pop();
    }
    charts[axis].update();
  };
  for (let axis of list_axis) {
    let len_datasets = fft_charts[axis].data.datasets.length;
    for (var i = 0; i <= len_datasets - 1; i++ ) {
        fft_charts[axis].data.datasets.pop();
    }
    fft_charts[axis].update();
  };
  for (let axis of list_axis) {
    setResultText("", resultsa[axis]);
    setResultText("", resultsv[axis]);
    setResultText("", resultsl[axis]);
  };
  setGameText("Ready to measure");
}

function start_measuring() {
    speedCalculator.start()
};

function start_clicked() {
    setGameText("Pause");
    timeoutId = setTimeout(start_measuring, pause_measuring);
};

function show_curves() {
    for (let axis of list_axis) {
        let accel_data_correct = speedCalculator.list_data_axis.a[axis].map(
            function(element) { return element * 0.005; }
        );
        let velocity_data_correct = speedCalculator.list_data_axis.v[axis].map(
            function(element) { return element * 0.1; }
        );
        let dataset_a = {
          data: accel_data_correct,
          borderColor: "red",
          fill: false
        };
        let dataset_v = {
          data: velocity_data_correct,
          borderColor: "green",
          fill: false
        };
        let dataset_l = {
          data: speedCalculator.list_data_axis.l[axis],
          borderColor: "blue",
          fill: false
        };
        charts[axis].data.datasets.push(dataset_a);
        charts[axis].data.datasets.push(dataset_v);
        charts[axis].data.datasets.push(dataset_l);
        charts[axis].data.labels = speedCalculator.dt_list.map(
            el => ((el - speedCalculator.dt_list[0]) * 0.001).toFixed(2)
        );
        charts[axis].update();
    };
};

function show_fft() {

    for (let ind of list_indicators) {
//        const av = average(speedCalculator.list_data_axis.l[axis]);
//        let signal = speedCalculator.list_data_axis.l[axis].map(el => el - av);
//        let fft_l = getFFT(signal);
        for (let axis of list_axis) {
            let fft = getFFT(speedCalculator.list_data_axis[ind][axis]);
            fft = filterFFT(fft, filter_value);
            let dataset = {
              data: fft,
              borderColor: "red",
              fill: false
            };
            fft_charts[ind].data.datasets.push(dataset);
        }
        
        fft_charts[axis].data.labels = fft_l[0].map(el => el.toFixed(2));
        fft_charts[axis].update();
    }
};

function show_results() {

    for (let axis of list_axis) {
        let magn_a = getMagnitude(speedCalculator.list_data_axis.a[axis]);
        if (magn_a) {
            magn_a = magn_a.toFixed(2);
        } else {
            magn_a = "-";
        };
        let freq_a = getAverageFreq(speedCalculator.list_data_axis.a[axis]);
        if (freq_a) {
            freq_a = freq_a.toFixed(2);
        } else {
            freq_a = "-";
        };
        let magn_v = getMagnitude(speedCalculator.list_data_axis.v[axis]);
        if (magn_v) {
            magn_v = magn_v.toFixed(2);
        } else {
            magn_v = "-";
        };
        let freq_v = getAverageFreq(speedCalculator.list_data_axis.v[axis]);
        if (freq_v) {
            freq_v = freq_v.toFixed(2);
        } else {
            freq_v = "-";
        };
        let magn_l = getMagnitude(speedCalculator.list_data_axis.l[axis]);
        if (magn_l) {
            magn_l = magn_l.toFixed(2);
        } else {
            magn_l = "-";
        };;
        let freq_l = getAverageFreq(speedCalculator.list_data_axis.l[axis]);
        if (freq_l) {
            freq_l = freq_l.toFixed(2);
        } else {
            freq_l = "-";
        };
        setResultText(
            "magn_a" + axis +
            ": " + magn_a +
            " freq_a" + axis +
            ": " + freq_a,
            resultsa[axis]
        );
        setResultText(
            "magn_v" + axis +
            ": " + magn_v +
            " freq_v" + axis +
            ": " + freq_v,
            resultsv[axis]
        );
        setResultText(
            "magn_l" + axis +
            ": " + magn_l +
            " freq_l" + axis +
            ": " + freq_l,
            resultsl[axis]
        );
    }
};


function onresult() {
    clear_clicked();
    setGameText("measuring stopped: " + speedCalculator.dt_list.length);

    show_curves();
    show_fft();
    show_results();
};

function main() {
  game_text = document.getElementById("game_text");
  for (let axis of list_axis) {
    resultsa[axis] = document.getElementById("resa" + axis);
    resultsv[axis] = document.getElementById("resv" + axis);
    resultsl[axis] = document.getElementById("resl" + axis);
  };
  start_btn = document.getElementById("start");
  console.log(start_btn);
  start_btn.addEventListener("click", start_clicked);
  clear_btn = document.getElementById("clear");
  clear_btn.addEventListener("click", clear_clicked);
  measurement = document.getElementById("measurement");
  setGameText(game_text.innerText);
  setMeasurement(0);
  function startApp() {
    acl = new LinearAccelerationSensor({frequency: 60});
    speedCalculator = new MainCalculator(acl, onresult, 1070);
    acl.addEventListener('activate', setToInitialState);
    acl.addEventListener('error', error => {
       setGameText("Cannot fetch data from sensor due to an error.");
    });
    for (let ind of list_indicators) {
        let chart = new Chart("chart" + ind, {
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
        charts[ind] = chart;
    };
    for (let axis of list_axis) {
        let chart = new Chart("fft" + axis, {
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
        fft_charts[axis] = chart;
    };
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

module.exports = main;