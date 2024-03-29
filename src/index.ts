import "dotenv/config";
import Discord from "discord.js";
import fetch from "node-fetch";
import { JSDOM } from "jsdom";

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
  const baseURL = "https://www.mythicspoiler.com/";
  const response = await fetch(
    "https://www.mythicspoiler.com/newspoilers.html",
  );
  const html = await response.text();
  const dom = new JSDOM(html);
  // dom.window.document
  //   .querySelectorAll('div.grid-span > font[size="6"][color="FFFFFF"]')
  //   .forEach((element) => {
  //     console.log(element.textContent?.toLowerCase().trim().replace(/\n/g, ""));
  //   });
  const latest = dom.window.document.querySelector(
    'div.grid-span > font[size="6"][color="FFFFFF"]',
  );

  const div = latest?.parentElement;
  const table = div?.nextElementSibling;
  const cardImgs = table?.querySelectorAll("div.grid-card a img");
  cardImgs?.forEach((card) => {
    console.log(
      card.getAttribute("src")?.toLocaleLowerCase().trim().replace(/\n/g, ""),
    );
  });
  // console.log(latest?.textContent?.toLowerCase().trim().replace(/\n/g, ""));
};

startBot;
void fetchSpoilers();
