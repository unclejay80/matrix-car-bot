const raspi = require('raspi');
const I2C = require('raspi-i2c').I2C;

ADC_ADDR = 0x48

function analog(){

    console.log("analog start")

    raspi.init(() => {
        console.log("raspi init")
        this.i2c = new I2C();
    });

  this.busy = false;

}

analog.prototype.test = function() {

}

analog.prototype.read = function(channel, continuous, delay, callback){
  var self = this;

  console.log("read 1");

  // If the ADC is busy, wait for the previous operation to finish 
  if(self.busy){
    setTimeout(function(){
      self.read(channel, callback);
    },delay + 10);

    return;
  };

  console.log("read 2");


  // Assert the busy state
  self.busy = true;

  var config = 0x0003 | 0x0100 | 0x8000; // Single Shot mode

  config |= (4 - channel + 4) << 12;
  config |= 0x0000; // 6144V Programmable Gain
  config |= 0x0080; // 1600 Samples Per Second
  if( continuous) {
    config &= 0xFEFF; // Continuous mode
  }

  var data = Buffer.from([(config >> 8) & 0xff, config & 0xff]);

  console.log("read 3");


  self.i2c.write(ADC_ADDR, 0x01, data, function(error){

    if(error){
        console.log("read 4 " + error);

      self.busy = false;
      callback("Write Failed", channel, 0);
      return;
    }


    var readFunc = function() {

        self.i2c.read(ADC_ADDR, 0x00, 2, function(error, result) {
          if(error){
            console.log("readfunc error");
            self.busy = false;
            callback("Read Failed", channel, 0);
            return;
          }
  
          //var reading = (((result[0] << 8) | result[1]) >> 4) * 6144 / 2048 / 1000;
          var reading = (((result[0] << 8) | result[1]) >> 4);
  
          self.busy = false;
          callback(null, channel, reading);
        })
  
      };


    if( continuous) {
        setInterval(readFunc, delay);
    } else {
        setTimeout(readFunc, delay);
    }

  });

}

module.exports = new analog();