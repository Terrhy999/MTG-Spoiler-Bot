import Discord = require("discord.js");
import fetch from "node-fetch";
import "dotenv/config";

const startBot = () => {
  const client = new Discord.Client({
    intents: ["Guilds", "GuildMessages", "MessageContent"],
  });

  const prefix = "!mtg";

  client.on("messageCreate", async function (message) {
    console.log(message.content);

    if (message.author.bot) {
      return;
    }
    if (!message.content.toLowerCase().startsWith(prefix)) {
      return;
    }

    const commandBody = message.content.slice(prefix.length).trim();

    if (!commandBody) {
      console.log("empty command");
      await message.channel.send(
        "Please provide a 3-letter set code as an argument for the command.",
      );
      return;
    }

    const args = commandBody.split(/\s+/);

    const command = args.shift()?.toLowerCase();

    await message.reply(`Now tracking spoilers for set ${command}`);
  });

  void client.login(process.env["BOT_TOKEN"]);
};

const fetchSpoilers = async () => {
  const response = await fetch(
    "https://www.mythicspoiler.com/newspoilers.html",
  );
  const body = await response.text();
  console.log(body);
};

startBot;
void fetchSpoilers();
