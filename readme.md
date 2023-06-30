# MultiSnake Bot Tutorial
(/docs/tutorial)

## First steps
Head over to [the developer page](/developers) to grab you API keys. Hit "Add key", then navigate your favorite code editor.
The wrapper class for managing bots is only available in nodejs as of the time of this writing. If you want to create one without the 
First, install the module using the following code

```
npm install multisnake-bot-api
```

Then, import it into your code.

```js
const { BotManager} = require("multisnake-bot-api");
```
You can then create a new bot using the `BotManager` class.

```js
let myBot = new BotManager({
	name: "My Super Cool Bot",
	rooms: ["classic-classic_0","classic-classic_1"a,"standard-standard_0"],
	log: false,
	botOpts: {
		api_key: "<your api key from the developer page>", // remember to keep this private
		uid: "<your bot's uid from the developer page>"
	}
	onNeedDirection: handleDirection
});
```

First, we give the bot a name, in this case `My Super Cool Bot` (it can be anything), then we define what rooms we want to allow it to join. In this case, 3 rooms, two classic room and one standard room. The room names are the same as the name on the play screen, (classic_0, small_1, etc), except the name of the mod is added before. Eg. classic-classic_0, etc. 
Then we specify whether we want to log things to the console or not. This will log when the bot is connected, and other things like that.
Next, you specify your credentials that we acquired from the developer page. Paste them into their respective spots, but make sure to keep the api_key secret (use environment variables- if you are doing this on replit, click on the secrets tab)

Finally, we need to specify how the bot move. We do this using the `handleDirection` function specified earlier.
It takes two parameters, `board` and `room`, `board` being an object representing the room, and `room` being the name of the room.
For more information, see the [full documentation](/docs). 
For now, we will just create a simple bot that goes towards the apple.

```js
function handleDirection(board,room){
	let apple = board.apple;
	let snake = board.snakes.find(snake => snake.uid == uid);
	let head= snake.body[0];
	let dirToGo = "";
	if(head[0] > apple[0]){
      dirToGo = "left"
    }else if(head[0] < apple[0]){
      dirToGo = "right";
    }else if(head[1] > apple[1]){
      dirToGo = "down";
    }else if(head[1] < apple[1]){
      dirToGo = "up";
    }
	return dirToGo
}
```

This bot is very bare bones, and will turn onto itself, not avoid other snakes, and run into walls, but, its a start. For further reading on the board object, see [the room docs](/docs/room).

For the full code, check out https://replit.com/@sojs/MultiSnake-API-test#index.js.
