import "dotenv/config";
import Discord, { TextChannel } from "discord.js";
import fetch from "node-fetch";
import { JSDOM } from "jsdom";
import fs from "fs";

const baseURL = "https://www.mythicspoiler.com/";

const startBot = () => {
  const client = new Discord.Client({
    intents: ["Guilds", "GuildMessages", "MessageContent"],
  });

  client.on("ready", () => {
    console.log(`Logged in as ${client.user!.tag}!`);

    // Fetch and post images every 15 minutes
    setInterval(
      () => {
        fetchSpoilers()
          .then((imageUrls) => {
            // Get the channel ID where you want to post the images
            const channelId = process.env["CHANNEL_ID"]!;

            // Find the channel by its ID
            const channel = client.channels.cache.get(channelId);

            if (channel instanceof TextChannel) {
              // Post each image to the channel
              imageUrls.forEach((url) => {
                void channel.send({ files: [`${baseURL}${url}`] });
              });
            }
          })
          .catch((error) => {
            console.error("Error fetching or posting images:", error);
          });
      },
      10 * 60 * 1000,
    ); // 15 minutes in milliseconds
  });

  void client.login(process.env["BOT_TOKEN"]);
};

const fetchSpoilers = async () => {
  const spoiledCardsPath = "spoiledCards.txt";
  const response = await fetch(
    "https://www.mythicspoiler.com/newspoilers.html",
  );
  const html = await response.text();
  const dom = new JSDOM(html);

  const dateDiv = dom.window.document.querySelector(
    'div.grid-span > font[size="6"][color="FFFFFF"]',
  )?.parentElement;

  const dateString = dateDiv?.textContent
    ?.trim() // Remove leading and trailing whitespace
    ?.replace(/\n+/g, "\n") // Replace multiple newlines with a single newline
    ?.split("\n")[0] // Get the first line
    ?.toLocaleLowerCase(); // Convert to lowercase

  if (!dateString) throw new Error("couldn't parse datestring");
  const latestDate = parseDateString(dateString);
  const todayDate = new Date();

  if (
    latestDate.getDate() === todayDate.getDate() &&
    latestDate.getMonth() === todayDate.getMonth()
  ) {
    const cardGrid = dateDiv?.nextElementSibling; // card-grid for date
    const cardImgs = cardGrid?.querySelectorAll("div.grid-card a img");
    const cardSrcs = Array.from(cardImgs!)
      .map((element) => element.getAttribute("src"))
      .filter((src) => !!src) // Filter out null values
      .map((src) => src!.toLowerCase().trim());
    const spoiledCards = readSpoiledCards(spoiledCardsPath);

    const newCards = cardSrcs.filter((src) => !spoiledCards.includes(src)); // array of todays cards not in spoiledCards.txt

    if (newCards.length > 0) {
      try {
        fs.appendFileSync("spoiledCards.txt", newCards.join("\n") + "\n");
        console.log("New image sources added to spoiledCards.txt:", newCards);
      } catch (err) {
        console.error("Error appending new images to spoiledCards.txt:", err);
      }
    } else {
      console.log("No new image sources found.");
    }
    return newCards;
  } else {
    fs.writeFileSync(spoiledCardsPath, "");
    return [];
  }
};

function readSpoiledCards(spoiledCardsPath: string) {
  try {
    const content = fs.readFileSync(spoiledCardsPath, "utf8");
    return content
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line !== "");
  } catch (err) {
    throw new Error("Error reading spoiledCards.txt");
  }
}

function parseDateString(dateString: string) {
  const [monthAbbreviation, day] = dateString.split(" ");

  const months: Record<string, number> = {
    jan: 0,
    feb: 1,
    mar: 2,
    april: 3,
    may: 4,
    jun: 5,
    jul: 6,
    aug: 7,
    sep: 8,
    oct: 9,
    nov: 10,
    dec: 11,
  };

  if (monthAbbreviation && monthAbbreviation in months) {
    const monthNumber = months[monthAbbreviation];
    const currentYear = new Date().getFullYear();
    return new Date(currentYear, monthNumber!, parseInt(day!));
  } else {
    throw new Error("Invalid month abbreviation");
  }
}

startBot();
