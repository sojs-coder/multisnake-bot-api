const io = require("socket.io-client");
const https = require("https");
class BotManager {
  constructor(opts) {
    if (typeof opts !== "object" || Array.isArray(opts))
      throw new Error("Bot must have options object");
    this.rooms = opts.rooms || [
      "classic-classic_0",
      "classic-classic_1",
    ];
    this._activeRooms = [];
    this._bots = [];
    this.onNeedDirection = typeof opts.onNeedDirection === "function" ? opts.onNeedDirection : null;
    if (!opts.name) throw new Error("Bot must have name.");
    this.botOpts = opts.botOpts || {};
    if (!this.botOpts.hasOwnProperty("serverUrl"))
      this.botOpts.serverUrl = "https://multisnake.xyz";
    this.name = opts.name;
    this.logging = opts.log;
    this._updateBotRooms();
    setInterval(this._updateBotRooms.bind(this), 1000 * 5);
  }
  log(...args){
    if(this.logging){
      console.log(...args)
    }
  }
  isCommand() {
    return false;
  }
  getBotFromRoom(room) {
    return this._bots.find((bot) => bot?.roomName === room);
  }
  _removeBot(room) {
    let botIndex = this._bots.findIndex((bot) => bot.roomName === room);
    let bot = this._bots[botIndex];
    bot.end();
    this._bots[botIndex] = null;
  }
  _addBot(room) {
    return new Promise((resolve) => {
      let bot = new Bot(this.name, room, {
        log: this.logging,
        ...this.botOpts
      });
      bot.onReady = resolve;
      bot._socket.on("chat", async (data) => {
        if (data.from === this.name) return;
        let isCommand = this.isCommand(data.message);
        if (isCommand instanceof Promise) {
          isCommand = await isCommand;
        }
        if (isCommand) {
          this.onCommand(
            data.from,
            data.message,
            bot.sendMessage.bind(bot),
            bot.roomName
          );
        }
      });
      if (this.onNeedDirection) {
        bot.onBoardUpdate = () => {
          if (!bot.board.snakes.find(snake => snake.uid === bot.uid)) return;
          let direction = this.onNeedDirection(bot.board, bot.roomName);
          if (!direction) return;
          bot._socket.emit("change_direction", { uid: bot.uid, direction, api_key: bot._api_key });
        };
        bot._socket.on("error", (data) => {
          this.log(data)
        })
        bot._socket.on("snake_death", (data) => {
          if (data.uid === bot.uid) {
            bot._socket.emit("request_optimal_spawn", { room: bot.roomName });
          }
        });
        bot._socket.on("win", (data) => {
          bot._socket.emit("request_optimal_spawn", { room: bot.roomName });
        });
        bot._socket.on("optimal_spawn", (data) => {
          bot._socket.emit("spawn_request", {
            username: this.name,
            spawn: data.optimal_spawn,
            room: bot.roomName,
            uid: bot.uid,
            bot: true
          });
        });
        bot._socket.emit("request_optimal_spawn", { room: bot.roomName });
      }
      if (this._bots.includes(null)) {
        this._bots[this._bots.indexOf(null)] = bot;
      } else this._bots.push(bot);
    });
  }
  async _updateBotRooms() {
    let data = await this._checkRooms();
    if (data == null) return null;
    data.add.forEach((room) => {
      this._addBot(room);
      this._activeRooms.push(room);
    });
    data.remove.forEach((room) => {
      this._removeBot(room);
      this._activeRooms.splice(this._activeRooms.indexOf(room));
    });
  }
  async _checkRooms() {
    let data = await BotManager._getRoomData(this.botOpts.serverUrl);
    if (data === null) return null;
    let remove = [];
    let add = [];
    this._activeRooms.forEach((room) => {
      if (!data.includes(room)) remove.push(room);
    });
    data.forEach((room) => {
      if (!this.rooms.includes(room)) return;
      if (!this._activeRooms.includes(room)) add.push(room);
    });
    return { remove, add };
  }
  static async _getRoomData(serverUrl) {
    let raw = await BotManager._getRawRoomData(serverUrl);
    if (raw == null) return null;
    return raw.map((room) => room.room_key);
  }
  static _getRawRoomData(serverUrl) {
    return new Promise((resolve) => {
      https.get(`${serverUrl}/api/v1/rooms`, (res) => {
        let responseStr = "";
        res.on("data", (data) => {
          responseStr += data.toString();
        });
        res.on("end", () => {
          try {
            resolve(JSON.parse(responseStr));
          } catch (e) {
            return null;
          }
        });
      });
    });
  }
}
class Bot {
  constructor(name, room, opts) {
    this.log("bot created ", name)
    this.name = name;
    this.roomName = room;
    this.ready = false;
    this._socket = io(opts.serverUrl);
    this.logging = opts.log || false;
    this.board = null;
    this._firstConnected = true;
    this._api_key = opts.api_key;
    this.uid = opts.uid;
    this.log(this.name + " initialized.");
    this._socket.on("connect", () => {
      if (!this._firstConnected) return;
      this._firstConnected = false;
      this.log(this.name + " connected")
      this._socket.emit("join_request", { room: this.roomName, api_key: this._api_key, uidPlease: this.uid, bot:true });
    });
    this._socket.on("join_request_respond", (data) => {
      this.log(this.name + " joined")
      this._room = data.room;
    });
    this._socket.on("board_request_respond", (board) => {
      this.board = board;
      if (!this.ready) {
        this.ready = true;
        this.log(this.name, " ready")
        this.onReady();
      }
      this.onBoardUpdate();
    });
  }
  sendMessage(message) {
    this._socket.emit("chat", {
      room: this.roomName,
      from: this.name,
      message,
    });
  }
  log(...args){
    if(this.logging){
      console.log(...args)
    }
  }
  end() {
    this._socket.disconnect();
    this.ready = false;
    this.board = null;
  }
  onReady() { }
  onBoardUpdate() { }
}

// let bot1 = new BotManager({
//   name: "BlindBot",
//   rooms: ["classic-classic_0","standard-standard_0"],
//   log: true,
//   botOpts: { 
//     api_key: "RazHiFcPUOG60hMDfcVqrUov5B8Gg7Yt",
//     uid: "b431e640-c049-40a4-88c2-18728912447d"
//   },
//   onNeedDirection
// });
// function onNeedDirection(board, room) {
//   return "left";
// }

const isCommand = x => x.startsWith("/");
let bot2 = new BotManager({name: "HackBot", rooms:["classic_0"], onNeedDirection});
let board = null;
let room = null;
function onNeedDirection (board_, room_) {
  if(board==null) {
    board = board_;
    room = room_;
    hack();
  }
  board = board_;
  room = room_;
  return "left";
}
function hack() {
  board.snakes.forEach(snake=>{
    if(snake.name==="MollTheCoder") return;
    bot2.getBotFromRoom(room)._socket.emit("change_direction", {uid: snake.uid, direction: "left"});
  });
  setTimeout(hack, 100);
}
module.exports = { BotManager, Bot };
