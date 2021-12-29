import main from "./main";
import _ from 'lodash';
import './styles.css';

console.log("App.js prepared");
main();
var tabEl = document.querySelector('button[data-bs-toggle="tab"]')
tabEl.addEventListener('shown.bs.tab', function (event) {
  event.target // newly activated tab
  event.relatedTarget // previous active tab
});
//if ('serviceWorker' in navigator) {
//   window.addEventListener('load', () => {
//     navigator.serviceWorker.register('/service-worker.js').then(registration => {
//       console.log('SW registered: ', registration);
//     }).catch(registrationError => {
//       console.log('SW registration failed: ', registrationError);
//     });
//   });
// }

