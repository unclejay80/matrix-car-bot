

const request = require("request");
const sdk = require("matrix-bot-sdk");
const he = require("he");
const PiCamera = require("pi-camera")
const fs = require('fs');

const pimotor = require("./motor.js");
const piled = require("./led.js");
const pianalog = require("./analog.js");

const MatrixClient = sdk.MatrixClient;
const SimpleFsStorageProvider = sdk.SimpleFsStorageProvider;
const AutojoinRoomsMixin = sdk.AutojoinRoomsMixin;

const homeserverUrl = "https://matrix.org"; // make sure to update this with your url
const accessToken = process.env.TOKEN;

let intervalMap = new Map();

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


pianalog.test();

setTimeout(() => {
  pianalog.read(1, true, 100, function(error, channel, result){
    console.log(result)
  });
  
}, 1000);


AutojoinRoomsMixin.setupOnClient(client);

function stopMotor() {
  pimotor.left.stop();
  pimotor.right.stop();
}



setTimeout((() => { 
  client.start().then(() => console.log("Client started!"))
  
  }).bind(this), 500);


client.on("room.message", (roomId, event) => {
  if (!event["content"]) return;
  const sender = event["sender"];
  const body = event["content"]["body"];
  console.log(`${roomId}: ${sender} says '${body}`);

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
  setTimeout(() => piled.one.on(), 10);
  setTimeout(() => piled.two.on(), 200);
  setTimeout(() => piled.three.on(), 400);
  setTimeout(() => piled.four.on(), 600);
  setTimeout(() => piled.one.off(), 800);
  setTimeout(() => piled.two.off(), 1000);
  setTimeout(() => piled.three.off(), 1200);
  setTimeout(() => piled.four.off(), 1400);
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

