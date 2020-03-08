const raspi = require('raspi');
const I2C = require('raspi-i2c').I2C;

BUTTON_ADDR = 0x28
BUTTON_CONTROL_REGISTER = 0x00;
BUTTON_STATUS_REGISTER = 0x03;

function button(){

    console.log("button start")

    this.i2c = new I2C();

  this.busy = false;

}


button.prototype._detectTouch = async function(i2c) {
  var resultControl = i2c.readSync(BUTTON_ADDR, BUTTON_CONTROL_REGISTER, 1);

  var control = resultControl[0];

  //touch detected?
  if( control & 0x01) {
      var resultStatus = i2c.readSync(BUTTON_ADDR, BUTTON_STATUS_REGISTER, 1);
      var status = resultStatus[0];

      //reset touch interrupt
      resultControl[0] = resultControl[0] & 0xFE;
      i2c.writeSync(BUTTON_ADDR, BUTTON_CONTROL_REGISTER, resultControl);

      var buttons = [];
      for( var i = 0; i<8; i++) {
        if( status & (1 << i)) {
          buttons.push( i + 1);
        }
      }

      return buttons;

  }

  return [];

}


button.prototype._isTouch = async function(i2c) {
  var resultControl = i2c.readSync(BUTTON_ADDR, BUTTON_CONTROL_REGISTER, 1);

  var control = resultControl[0];

  //touch detected?
  if( control & 0x01) {
      return true;

  }

  return false;

}

button.prototype.getTouch = function(continuous, delay, callback){
  var self = this;

  // If the ADC is busy, wait for the previous operation to finish 
  if(self.busy){
    setTimeout(function(){
      self.read(continuous, delay, callback);
    },delay + 10);

    return;
  };


  // Assert the busy state
  self.busy = true;

  var readFunc = async function(self, i2c) {

    var isTouch = await self._isTouch(i2c);
    if( isTouch) {
      var buttons = await self._detectTouch(i2c);
      self.busy = false;
      callback(buttons);
    }

  };


  if( continuous) {
      setInterval(readFunc, delay, this, this.i2c);
  } else {
      setTimeout(readFunc, delay, this,this.i2c);
  }


}

module.exports = new button();