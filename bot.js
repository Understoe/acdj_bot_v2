const fetch = require("node-fetch");
const { Client, GatewayIntentBits } = require("discord.js");
const { JSDOM } = require("jsdom");

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });

const TAGS = {
    "MTG : Commander Multi": "<@&1067857193673699429>",
    "MTG : Modern": "<@&1067857029470896178>",
    "MTG : Standard": "<@&1067857092561608764>",
    "MTG : Pioneer": "<@&1067857419369205951>",
    "MTG : Duel Commander": "<@&1067857231288217681>",
    "MTG : Pauper": "<@&1067857461417099314>",
    "MTG : Limité": "<@&1067857130176118855>"
};

const TARGET_TAG = "Magic The Gathering";

async function scrapeEvents() {
    const res = await fetch("https://au-coin-du-jeu.odoo.com/event");
    const html = await res.text();
    const dom = new JSDOM(html);
    const document = dom.window.document;

    const eventDivs = Array.from(document.querySelectorAll("div.col-md-6.col-lg-4.col-xl-3"));
    const events = [];

    for (const div of eventDivs) {
        const tags = Array.from(div.querySelectorAll("span.badge")).map(e => e.textContent.trim());
        if (!tags.includes(TARGET_TAG)) continue;

        const specificTag = tags.find(tag => TAGS[tag]);
        if (!specificTag) continue;

        const title = div.querySelector("span[itemprop='name']")?.textContent.trim();
        const month = div.querySelector(".o_wevent_event_month")?.textContent.trim();
        const day = div.querySelector(".o_wevent_event_day")?.textContent.trim();
        const link = div.querySelector("a")?.href;
        const fullLink = "https://au-coin-du-jeu.odoo.com" + link;
        const imgDiv = div.querySelector(".o_record_cover_image");
        const imgStyle = imgDiv?.getAttribute("style") || "";
        const imageUrlMatch = imgStyle.match(/url\(['"]?(.*?)['"]?\)/);
        const imageUrl = imageUrlMatch ? "https://au-coin-du-jeu.odoo.com" + imageUrlMatch[1] : null;

        events.push({
            title,
            month,
            day,
            imageUrl,
            role: TAGS[specificTag],
            link: fullLink
        });
    }

    return events;
}

client.once("ready", async () => {
    const channel = await client.channels.fetch(process.env.CHANNEL_ID);
    const messages = await channel.messages.fetch({ limit: 100 });
    await Promise.all(messages.map(m => m.delete().catch(() => null)));

    const events = await scrapeEvents();

    for (const event of events.reverse()) {
        const randomColor = Math.floor(Math.random() * 0xFFFFFF);

        const embed = {
            title: event.title,
            url: event.link,
            description: `📅 ${event.day} ${event.month}`,
            color: randomColor,
            image: event.imageUrl ? { url: event.imageUrl } : undefined
        };

        await channel.send({
            content: event.role,
            embeds: [embed]
        });
    }

    console.log("Messages envoyés.");
    client.destroy();
});

client.login(process.env.DISCORD_TOKEN);
