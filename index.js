const request = require("request");
const sdk = require("matrix-bot-sdk");
const he = require("he");
const Gpio =
  process.env.NODE_ENV !== "production"
    ? require("pigpio-mock")
    : require("pigpio");

const motorLeft = new Gpio.Gpio(10, { mode: Gpio.OUTPUT });
const motorRight = new Gpio.Gpio(11, { mode: Gpio.OUTPUT });

const MatrixClient = sdk.MatrixClient;
const SimpleFsStorageProvider = sdk.SimpleFsStorageProvider;
const AutojoinRoomsMixin = sdk.AutojoinRoomsMixin;

const homeserverUrl = "https://matrix.org"; // make sure to update this with your url
const accessToken = process.env.TOKEN;

let intervalMap = new Map();

const storage = new SimpleFsStorageProvider("bot.json");

const client = new MatrixClient(homeserverUrl, accessToken, storage);

AutojoinRoomsMixin.setupOnClient(client);

client.start().then(() => console.log("Client started!"));

client.on("room.message", (roomId, event) => {
  if (!event["content"]) return;
  const sender = event["sender"];
  const body = event["content"]["body"];
  console.log(`${roomId}: ${sender} says '${body}`);

  if (body.startsWith("!command")) {
    sendCommandPoll(roomId);
  }

  if (body.startsWith("cmd_")) {
    const expression = body.substring("cmd_".length).trim();

    let pulseWidth = 1000;

    switch (expression) {
      case "right":
        motorLeft.servoWrite(pulseWidth);
        break;
      case "left":
        motorRight.servoWrite(pulseWidth);
        break;
      case "back":
        motorLeft.servoWrite(pulseWidth);
        break;
      case "ahead":
        motorRight.servoWrite(pulseWidth);
        motorLeft.servoWrite(pulseWidth);
        break;
    }

    client.sendMessage(roomId, {
      msgtype: "m.notice",
      body: expression
    });

    sendCommandPoll(roomId);
  }

  if (body.startsWith("!cam")) {
    sendWebcamImage(roomId, "https://livespotting.com/snapshots/LS_10vJe.jpg");
  }
});

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

function sendWebcamImage(roomId, url) {
  try {
    request(url, { encoding: null }, (err, res, body) => {
      if (err) {
        return console.log(err);
      }
      client.uploadContent(body, "image/jpeg", "test.jpg").then(mxcUri => {
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
    });
  } catch (error) {
    console.log(error);
  }
}
