const io = require("socket.io-client");
const https = require("https");
class BotManager {
  constructor(opts) {
    if (typeof opts !== "object" || Array.isArray(opts))
      throw new Error("Bot must have options object");
    this.rooms = opts.rooms || [
      "classic_0",
      "classic_1",
      "classic_2",
      "classic_3",
      "classic_4",
    ];
    this._activeRooms = [];
    this._bots = [];
    this.onNeedDirection = typeof opts.onNeedDirection === "function"? opts.onNeedDirection : null;
    if (!opts.name) throw new Error("Bot must have name.");
    this.botOpts = opts.botOpts || {};
    if (!this.botOpts.hasOwnProperty("serverUrl"))
      this.botOpts.serverUrl = "https://multisnake.xyz";
    this.name = opts.name;
    this._updateBotRooms();
    setInterval(this._updateBotRooms.bind(this), 1000 * 5);
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
      let bot = new Bot(this.name, room, this.botOpts);
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
          if(!bot.board.snakes.find(snake=>snake.uid===bot.uid)) return;
          let direction = this.onNeedDirection(bot.board, bot.roomName);
          if (!direction) return;
          bot._socket.emit("change_direction", {uid: bot.uid, direction, api_key: bot._api_key});
        };
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
    this.name = name;
    this.roomName = room;
    this.ready = false;
    this._socket = io(opts.serverUrl);
    this.board = null;
    this._firstConnected = true;
    this._api_key = opts.api_key;
    this.uid = opts.uid;
    this._socket.on("connect", () => {
      if (!this._firstConnected) return;
      this._firstConnected = false;
      this._socket.emit("join_request", { room: this.roomName, api_key: this._api_key, uidPlease: this.uid });
    });
    this._socket.on("join_request_respond", (data) => {
      this._room = data.room;
    });
    this._socket.on("board_request_respond", (board) => {
      this.board = board;
      if (!this.ready) {
        this.ready = true;
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
  end() {
    this._socket.disconnect();
    this.ready = false;
    this.board = null;
  }
  onReady() {}
  onBoardUpdate() {}
}

let bot = new BotManager({name: "BlindBot", rooms:["classic_0"], onNeedDirection});
function onNeedDirection (board, room) {
  return "left";
}
module.exports = { BotManager, Bot };
