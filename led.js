const Gpio = require("pigpio");

function piled(pin1) {
  this.pin1 = pin1;
  this.gpio1 = new Gpio.Gpio(pin1, { mode: Gpio.OUTPUT });

  this.gpio1.digitalWrite(0);
}

piled.prototype.on = function() {
  this.gpio1.digitalWrite(1);
};

piled.prototype.off = function() {
  this.gpio1.digitalWrite(0);
};

piled.prototype.toggle = function() {
  this.gpio1.digitalWrite(this.gpio1.digitalRead() ? 0 : 1);
};

module.exports = {
  one: new piled(4),
  two: new piled(17),
  three: new piled(27),
  four: new piled(5)
};
