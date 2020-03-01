const Gpio = require("pigpio");

function pimotor(pin1, pin2) {
  this.pin1 = pin1;
  this.pin2 = pin2;
  this.reverse = false;
  this.gpio1 = new Gpio.Gpio(pin1, { mode: Gpio.OUTPUT });
  this.gpio2 = new Gpio.Gpio(pin2, { mode: Gpio.OUTPUT });

  this.gpio1.digitalWrite(0);
  this.gpio2.digitalWrite(0);
}

pimotor.prototype.forward = function() {
  this.gpio1.digitalWrite(!this.reverse ? 1 : 0);
  this.gpio2.digitalWrite(this.reverse ? 1 : 0);
};

pimotor.prototype.backward = function() {
  this.gpio1.digitalWrite(this.reverse ? 1 : 0);
  this.gpio2.digitalWrite(!this.reverse ? 1 : 0);
};

pimotor.prototype.stop = function() {
  this.gpio1.digitalWrite(0);
  this.gpio2.digitalWrite(0);
};

module.exports = {
  right: new pimotor(19, 20),
  left: new pimotor(21, 26)
};
