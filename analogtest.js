

pianalog.test();

setTimeout(() => {

  var buf = new CircularBuffer(2500);

  var i = 0;
  var lastAvg = 0;
  var lastMax = 0;
  var lastMin = 0;

  pianalog.read(1, true, 2, function(error, channel, result){
    buf.push(result);
    if( i++ > 500) {
      min = 5000;
      max = 0;
      sum = 0;
      bufarray = buf.toarray();
      wayUp = false;
      beats = 0;
      upperThreshold = (lastMax - lastAvg) / 2 + lastAvg;
      lowerThreshold = (lastMin - lastAvg) / 2 + lastAvg; 
      bufarray.forEach(element => {
      upperThreshold = (lastMax - lastAvg) / 2 + lastAvg;
        if( !wayUp && element > upperThreshold) {
            wayUp = true;
            beats++;
        } else if( wayUp && element < lowerThreshold) {
          wayUp = false;
        }

        sum += element;
        if( element < min) {
          min = element;
        }
        if( element > max) {
          max = element;
        }
      });
      avg = sum / bufarray.length;
      lastAvg = avg;
      lastMax = max;
      lastMin = min;
      bpm = beats * 12;
      console.log("min: " + min + " max: " + max + " avg: " + avg + " BPM: " + bpm);
      i = 0;
    }

    //console.log(result)
  });
  
}, 1000);