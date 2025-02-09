"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const client = new discord_js_1.Client({
    intents: [discord_js_1.GatewayIntentBits.Guilds]
});
const civilizations = [
    "America", "Arabia", "Assyria", "Austria", "Aztec", "Babylon", "Brazil",
    "Byzantium", "Carthage", "Celtic", "China", "Denmark", "Egypt", "England",
    "Ethiopia", "France", "Germany", "Greece", "Huns", "Inca", "India",
    "Indonesia", "Iroquois", "Japan", "Korea", "Maya", "Mongolia", "Morocco",
    "Netherlands", "Ottoman", "Persia", "Poland", "Polynesia", "Portugal",
    "Rome", "Russia", "Shoshone", "Siam", "Songhai", "Spain", "Sweden",
    "Venice", "Zulu"
];
let bannedCivs = [];
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}
function getPlayerChoices(playerCount, availableCivs) {
    const shuffledCivs = shuffleArray([...availableCivs]);
    const playerChoices = [];
    for (let i = 0; i < playerCount; i++) {
        playerChoices.push(shuffledCivs.slice(i * 3, (i + 1) * 3));
    }
    return playerChoices;
}
const commands = [
    new discord_js_1.SlashCommandBuilder()
        .setName('roll')
        .setDescription('Roll civilizations for players')
        .addIntegerOption(option => option.setName('players')
        .setDescription('Number of players')
        .setRequired(true)
        .setMinValue(2)
        .setMaxValue(8))
        .addStringOption(option => option.setName('names')
        .setDescription('Player names (comma-separated)')
        .setRequired(true)),
    new discord_js_1.SlashCommandBuilder()
        .setName('ban')
        .setDescription('Ban civilizations for the next roll')
        .addStringOption(option => option.setName('civilization')
        .setDescription('Civilization to ban')
        .setRequired(true)
        .setAutocomplete(true))
];
const rest = new discord_js_1.REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
(async () => {
    try {
        console.log('Started refreshing application (/) commands.');
        await rest.put(discord_js_1.Routes.applicationCommands(process.env.CLIENT_ID), { body: commands });
        console.log('Successfully reloaded application (/) commands.');
    }
    catch (error) {
        console.error(error);
    }
})();
client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});
client.on('interactionCreate', async (interaction) => {
    if (interaction.isAutocomplete()) {
        const focusedValue = interaction.options.getFocused().toString().toLowerCase();
        const filtered = civilizations.filter(civ => civ.toLowerCase().startsWith(focusedValue));
        await interaction.respond(filtered.slice(0, 25).map(choice => ({ name: choice, value: choice })));
    }
    if (!interaction.isChatInputCommand())
        return;
    if (interaction.commandName === 'roll') {
        await handleRollCommand(interaction);
    }
    else if (interaction.commandName === 'ban') {
        await handleBanCommand(interaction);
    }
});
async function handleRollCommand(interaction) {
    const playerCount = interaction.options.getInteger('players', true);
    const playerNames = interaction.options.getString('names', true).split(',').map(name => name.trim());
    if (playerNames.length !== playerCount) {
        await interaction.reply(`You specified ${playerCount} players but provided ${playerNames.length} names. Please make sure they match.`);
        return;
    }
    const availableCivs = civilizations.filter(civ => !bannedCivs.includes(civ));
    const choices = getPlayerChoices(playerCount, availableCivs);
    let response = 'Civilization choices for each player:\n';
    choices.forEach((playerChoices, index) => {
        response += `${playerNames[index]}: ${playerChoices.join(', ')}\n`;
    });
    if (bannedCivs.length > 0) {
        response += `\nBanned civilizations: ${bannedCivs.join(', ')}`;
        bannedCivs = []; // Reset banned civs after the roll
    }
    await interaction.reply(response);
}
async function handleBanCommand(interaction) {
    const civToBan = interaction.options.getString('civilization', true);
    if (!civilizations.includes(civToBan)) {
        await interaction.reply(`The civilization "${civToBan}" is not recognized.`);
        return;
    }
    bannedCivs = [...new Set([...bannedCivs, civToBan])]; // Add new ban, ensure uniqueness
    await interaction.reply(`Banned civilizations for the next roll: ${bannedCivs.join(', ')}`);
}
client.login(process.env.DISCORD_TOKEN);
