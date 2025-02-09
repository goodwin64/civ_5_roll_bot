import { 
    Client, 
    GatewayIntentBits, 
    REST, 
    Routes, 
    SlashCommandBuilder, 
    ChatInputCommandInteraction,
    AutocompleteInteraction
} from 'discord.js';
import dotenv from 'dotenv';

dotenv.config();

const client = new Client({
    intents: [GatewayIntentBits.Guilds]
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

let bannedCivs: string[] = [];

function shuffleArray<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function getPlayerChoices(playerCount: number, availableCivs: string[]): string[][] {
    const shuffledCivs = shuffleArray([...availableCivs]);
    const playerChoices: string[][] = [];

    for (let i = 0; i < playerCount; i++) {
        playerChoices.push(shuffledCivs.slice(i * 3, (i + 1) * 3));
    }

    return playerChoices;
}

const commands = [
    new SlashCommandBuilder()
        .setName('roll')
        .setDescription('Roll civilizations for players')
        .addIntegerOption(option => 
            option.setName('players')
                .setDescription('Number of players')
                .setRequired(true)
                .setMinValue(2)
                .setMaxValue(8))
        .addStringOption(option => 
            option.setName('names')
                .setDescription('Player names (comma-separated)')
                .setRequired(false)),
    new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Ban civilizations for the next roll')
        .addStringOption(option =>
            option.setName('civilizations')
                .setDescription('Civilizations to ban (space-separated)')
                .setRequired(true)
                .setAutocomplete(true))
];

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN!);

(async () => {
    try {
        console.log('Started refreshing application (/) commands.');

        await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID!),
            { body: commands },
        );

        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error(error);
    }
})();

client.on('ready', () => {
    console.log(`Logged in as ${client.user!.tag}!`);
});

client.on('interactionCreate', async interaction => {
    if (interaction.isAutocomplete()) {
        await handleAutocomplete(interaction);
    }

    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'roll') {
        await handleRollCommand(interaction);
    } else if (interaction.commandName === 'ban') {
        await handleBanCommand(interaction);
    }
});

async function handleAutocomplete(interaction: AutocompleteInteraction) {
    const focusedValue = interaction.options.getFocused().toString();
    const inputValues = focusedValue.split(' ');
    const lastInput = inputValues[inputValues.length - 1].toLowerCase();

    const alreadyEnteredCivs = new Set(inputValues.slice(0, -1).map(v => v.toLowerCase()));
    const availableCivs = civilizations.filter(civ => !alreadyEnteredCivs.has(civ.toLowerCase()));

    const filtered = availableCivs.filter(civ => civ.toLowerCase().startsWith(lastInput));
    await interaction.respond(
        filtered.slice(0, 25).map(choice => ({
            name: choice,
            value: [...inputValues.slice(0, -1), choice].join(' ')
        }))
    );
}

async function handleRollCommand(interaction: ChatInputCommandInteraction) {
    const playerCount = interaction.options.getInteger('players', true);
    const playerNamesInput = interaction.options.getString('names');

    let playerNames: string[];
    if (playerNamesInput) {
        playerNames = playerNamesInput.split(',').map(name => name.trim());
        if (playerNames.length !== playerCount) {
            await interaction.reply(`You specified ${playerCount} players but provided ${playerNames.length} names. Using default player names instead.`);
            playerNames = Array.from({length: playerCount}, (_, i) => `Player ${i + 1}`);
        }
    } else {
        playerNames = Array.from({length: playerCount}, (_, i) => `Player ${i + 1}`);
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

async function handleBanCommand(interaction: ChatInputCommandInteraction) {
    const civsToBan = interaction.options.getString('civilizations', true).split(' ');
    
    const invalidCivs = civsToBan.filter(civ => !civilizations.includes(civ));
    if (invalidCivs.length > 0) {
        await interaction.reply(`The following civilizations are not recognized: ${invalidCivs.join(', ')}`);
        return;
    }

    bannedCivs = [...new Set([...bannedCivs, ...civsToBan])]; // Add new bans, ensure uniqueness
    await interaction.reply(`Banned civilizations for the next roll: ${bannedCivs.join(', ')}`);
}

client.login(process.env.DISCORD_TOKEN);