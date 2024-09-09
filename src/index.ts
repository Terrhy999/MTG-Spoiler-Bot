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
          .then(async (cards) => {
            // Get the channel ID where you want to post the images
            const channelId = process.env["CHANNEL_ID"]!;

            // Find the channel by its ID
            const channel = client.channels.cache.get(channelId);

            if (channel instanceof TextChannel) {
              const cardChunks = [];
              for (let i = 0; i < cards.length; i += 10) {
                cardChunks.push(cards.slice(i, i + 10));
              }

              for (const chunk of cardChunks) {
                const files = chunk.map((card) => card.src);
                const links = chunk.map((card) => card.href);

                const spoilerMessage = await channel.send({
                  files: files.map((file) => `${baseURL}${file}`),
                });

                const spoilerThread = await spoilerMessage.startThread({
                  autoArchiveDuration: 60,
                  name: "Fresh Spoilers",
                });

                void spoilerThread.send(
                  links.map((link) => `${baseURL}${link}`).join("\n"),
                );
              }
            }
          })
          .catch((error) => {
            console.error("Error fetching or posting images:", error);
          });
      },
      15 * 60 * 1000,
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

  console.log(dateDiv);
  console.log(dateDiv?.textContent);

  const dateString = dateDiv?.textContent
    ?.trim() // Remove leading and trailing whitespace
    ?.replace(/\n+/g, "\n") // Replace multiple newlines with a single newline
    ?.split("\n")[0] // Get the first line
    ?.toLocaleLowerCase(); // Convert to lowercase

  console.log(dateString);

  if (!dateString) throw new Error("couldn't parse datestring");
  const latestDate = parseDateString(dateString);
  console.log(latestDate);
  const todayDate = new Date();

  if (
    latestDate.getDate() === todayDate.getDate() &&
    latestDate.getMonth() === todayDate.getMonth()
  ) {
    const cardGrid = dateDiv?.nextElementSibling; // card-grid for date
    const cardImgs = cardGrid?.querySelectorAll("div.grid-card a img");

    const cards = Array.from(cardImgs!)
      .map((element) => {
        const href = element.parentElement
          ?.getAttribute("href")
          ?.toLowerCase()
          .trim();
        const src = element.getAttribute("src")?.toLowerCase().trim();

        if (href && src) {
          return { href, src };
        } else {
          return null;
        }
      })
      .filter((card): card is { href: string; src: string } => card !== null);

    const spoiledCards = readSpoiledCards(spoiledCardsPath);

    const newCards = cards.filter((card) => !spoiledCards.includes(card.href));
    console.log(newCards);

    if (newCards.length > 0) {
      try {
        fs.appendFileSync(
          "spoiledCards.txt",
          newCards.map((card) => card.href).join("\n") + "\n",
        );
        console.log(
          "New image sources added to spoiledCards.txt:",
          newCards.map((card) => card.href),
        );
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
    june: 5,
    july: 6,
    aug: 7,
    sept: 8,
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
