

const request = require("request");
const sdk = require("matrix-bot-sdk");
const he = require("he");
const PiCamera = require("pi-camera")
const fs = require('fs');
const raspi = require('raspi');
const { exec } = require("child_process");
var CircularBuffer = require("circular-buffer");

const pimotor = require("./motor.js");
const piled = require("./led.js");
const pibutton = require("./button.js");

const MatrixClient = sdk.MatrixClient;
const SimpleFsStorageProvider = sdk.SimpleFsStorageProvider;
const AutojoinRoomsMixin = sdk.AutojoinRoomsMixin;

const homeserverUrl = "https://matrix.org"; // make sure to update this with your url
const accessToken = process.env.TOKEN;

let intervalMap = new Map();
let buttonSubscriberRooms = [];

const myCamera = new PiCamera({
  mode: 'photo',
  output: `${ __dirname }/test.jpg`,
  width: 640,
  height: 480,
  nopreview: true,
  vflip: true,
  hflip: true
});

const storage = new SimpleFsStorageProvider("bot.json");

const client = new MatrixClient(homeserverUrl, accessToken, storage);




AutojoinRoomsMixin.setupOnClient(client);

initButtonSubscriber();



setTimeout((() => { 
  client.start().then(() => {
    console.log("Client started!");
    client.getJoinedRooms().then( rooms => {
      rooms.forEach( room => {
        sendTextMessage(room, "Hello I'm in :)");
      });
    });
  });
  
}).bind(this), 500);


client.on("room.join", (roomId, joinEvent) => {
  console.log(`Joined ${roomId} as ${joinEvent["state_key"]}`);
});

client.on("room.message", (roomId, event) => {
  if (!event["content"]) return;
  const sender = event["sender"];
  const body = event["content"]["body"];
  console.log(`${roomId}: ${sender} says '${body}`);

  //add each room to button subscribers
  if( !buttonSubscriberRooms.includes(roomId)) {
    buttonSubscriberRooms.push(roomId);
  }

  if (body.startsWith("!command")) {
    sendCommandPoll(roomId);
  }

  if (body.startsWith("!kitt")) {
    doKnightRider();
  }
  
  if (body.startsWith("!bt")) {
    doBTScan(roomId);
  }

  if (body.startsWith("!led")) {
    const expression = body.substring("!led".length).trim();
    switch (expression) {
      case "1":
        piled.one.toggle();
        break;
      case "2":
        piled.two.toggle();
        break;
      case "3":
        piled.three.toggle();
        break;
      case "4":
        piled.four.toggle();
        break;
    }
  }

  if (body.startsWith("cmd_")) {
    const expression = body.substring("cmd_".length).trim();

    var timeout = 2000;

    switch (expression) {
      case "left":
      case "right":
        timeout = 500;
        break;
    }

    driveMotor(expression, timeout)

    client.sendMessage(roomId, {
      msgtype: "m.notice",
      body: expression
    });

    sendCommandPoll(roomId);
  }

  if (body.startsWith("!breakdance")) {
    doMotorBreakdance();
  }

  if (body.startsWith("!cam")) {
    sendPiCameraImage(roomId);
  }
});

function doKnightRider() {
  for( var i = 0; i < 4; i++) {
    offset = i * 1400;
    setTimeout(() => piled.one.on(), 10 + offset);
    setTimeout(() => piled.two.on(), 200 + offset);
    setTimeout(() => piled.three.on(), 400 + offset);
    setTimeout(() => piled.four.on(), 600 + offset);
    setTimeout(() => piled.one.off(), 800 + offset);
    setTimeout(() => piled.two.off(), 1000 + offset);
    setTimeout(() => piled.three.off(), 1200 + offset);
    setTimeout(() => piled.four.off(), 1400 + offset);
  }
}

function sendCommandPoll(roomId) {
  const question = "Nächstes Kommando?";
  var options = [];
  var optionsStr = "";

  options = [
    {
      label: "rechts",
      value: "cmd_right"
    },
    {
      label: "links",
      value: "cmd_left"
    },
    {
      label: "geradeaus",
      value: "cmd_ahead"
    },
    {
      label: "zurück",
      value: "cmd_back"
    }
  ];

  optionsStr += "DDDD";

  client.sendMessage(roomId, {
    label: question,
    type: "org.matrix.poll",
    msgtype: "org.matrix.options",
    options: options,
    body: "[Poll] " + question + optionsStr
  });
}

function doMath(roomId, event, expression) {
  const url = "http://api.mathjs.org/v4/?expr=" + encodeURI(expression);
  request(url, (err, res, body) => {
    if (err) {
      return console.log(err);
    }
    client.replyText(roomId, event, body);
  });
}


function sendButtonMsg(button, roomId) {
  client
  .sendMessage(roomId, {
    msgtype: "m.text",
    body: "Button pressed: " + button,
  })
  .catch(err => {
    console.log("caught", err.message);
  });

}


function sendPiCameraImage(roomId) {


    myCamera.snap()
    .then((result) => {
      var data = fs.readFileSync(`${ __dirname }/test.jpg`);
      client.uploadContent(data, "image/jpeg", "test.jpg").then(mxcUri => {
        client
          .sendMessage(roomId, {
            msgtype: "m.image",
            body: "",
            url: mxcUri
          })
          .catch(err => {
            console.log("caught", err.message);
          });
      });
    })
    .catch((error) => {
      console.log(error);
    });

}


function stopMotor() {
  pimotor.left.stop();
  pimotor.right.stop();
}

function driveMotor(command, time) {

  console.log("drivemotor " + command + " " + time)

  switch (command) {
    case "left":
      pimotor.right.forward();
      pimotor.left.forward();
      break;
    case "right":
      pimotor.right.backward();
      pimotor.left.backward();
      break;
    case "back":
      pimotor.right.forward();
      pimotor.left.backward();
      break;
    case "ahead":
      pimotor.left.forward();
      pimotor.right.backward();
      break;
  }

  setTimeout(stopMotor, time);
}


function doBTScan(roomId) {
  sendTextMessage(roomId, "Starting BT Scan...");

  exec("hcitool scan", (error, stdout, stderr) => {
    if (error) {
        console.log(`error: ${error.message}`);
        return;
    }
    if (stderr) {
        console.log(`stderr: ${stderr}`);
        return;
    }
    console.log(`stdout: ${stdout}`);

    var lines = stdout.split(/\r?\n/);
    if( lines.length > 2) {
      lines.shift();
      lines.pop();
      lines.forEach( line => {
        sendTextMessage( roomId, "BT found: " + line.trim());
      });
  
    } else {
      sendTextMessage( roomId, "no BT device found");
    }

  });


}

function initButtonSubscriber() {

  raspi.init(() => {
    console.log("raspi init")
  
    var prevButtons = [];
    var timer = 0;
  
    pibutton.getTouch(true, 100, function(buttons) {
      console.log( buttons);
      clearTimeout(timer);
  
      if( arraysIdentical(prevButtons, buttons)) {
        timer = setTimeout(() => {
          prevButtons = [];
        }, 2000)
        return;
      }
  
      prevButtons = buttons;
  
      buttonSubscriberRooms.forEach(room => {
        buttons.forEach(button => {
          sendButtonMsg(button - 4, room);
        });
        
      });
    });
    
  });
  


}


function arraysIdentical(a, b) {
  var i = a.length;
  if (i != b.length) return false;
  while (i--) {
      if (a[i] !== b[i]) return false;
  }
  return true;
};

function sendTextMessage(roomId, text) {
  client
  .sendMessage(roomId, {
    msgtype: "m.text",
    body: text,
  })
  .catch(err => {
    console.log("caught", err.message);
  });
}

function doMotorBreakdance() {
  setTimeout( () => driveMotor("ahead", 1000), 0);
  setTimeout( () => driveMotor("back", 1000), 2000);
  setTimeout( () => driveMotor("left", 500), 5000);
  setTimeout( () => driveMotor("ahead", 1000), 7000);
  setTimeout( () => driveMotor("back", 1000), 9000);
  setTimeout( () => driveMotor("right", 500), 11000);
  setTimeout( () => driveMotor("ahead", 1000), 13000);
  setTimeout( () => driveMotor("back", 1000), 15000);

}
