

const request = require("request");
const sdk = require("matrix-bot-sdk");
const he = require("he");
const PiCamera = require("pi-camera")
const fs = require('fs');
const raspi = require('raspi');
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
  client.start().then(() => console.log("Client started!"))
  
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
        pimotor.right.forward();
        pimotor.left.forward();
        timeout = 500;
        break;
      case "right":
        pimotor.right.backward();
        pimotor.left.backward();
        timeout = 500;
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

    setTimeout(stopMotor, timeout);

    client.sendMessage(roomId, {
      msgtype: "m.notice",
      body: expression
    });

    sendCommandPoll(roomId);
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

function initButtonSubscriber() {

  raspi.init(() => {
    console.log("raspi init")
  
    let prevButtons = [];
  
    pibutton.getTouch(true, 100, function(buttons) {
      console.log( buttons);
  
      if( arraysIdentical(prevButtons, buttons)) {
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
