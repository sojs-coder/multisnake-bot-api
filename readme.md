# MultiSnake Developer Documentation

## First steps
Head over to [the developer page](/developers) to grab you API keys. Hit "Add key", then navigate your favorite code editor.
The wrapper class for managing bots is only available in nodejs as of the time of this writing. If you want to create one without the 
First, install the module using the following code

```
npm install @sojs_coder/multisnake-bot-api
```

Then, import it into your code.

```js
const { BotManager} = require("@sojs_coder/multisnake-bot-api");
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

Finally, we specify what happens when the bot needs a direction. More on this once I finish writing the docs.
