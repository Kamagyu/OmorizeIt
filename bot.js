import { Routes, Client, GatewayIntentBits, ActivityType, ApplicationCommandOptionType as OptionType } from 'discord.js';
import { readdirSync, statSync } from 'fs';
import { create_gif } from './main.js';
import config from './config.json' assert { type: "json"};

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

let common_options = [
	{
		type: OptionType.String,
		name: "input",
		description: "Text input",
		required: true,
	},
	{
		type: OptionType.Integer,
		name: "size",
		description: "Size of the resulting gif",
		required: false,
		min_value: 64,
		max_value: 2048
	}
]

let commands = [
	{
		name: 'omorize',
		description: `It's omorizing time`,
		options: [
			{
				type: OptionType.Subcommand,
				name: "random",
				description: "Put text on a random subcommand",
				options: [
					// spread syntax
					...common_options
				]
			},
			{
				type: OptionType.Subcommand,
				name: "choose",
				description: "Choose a character and emotion",
				options: [
					{
						type: OptionType.String,
						name: "dimension",
						description: "Do you want the faraway town (real) or the headspace (dream) version?",
						required: true,
						choices: [
							{ name: "farawaytown", value: "farawaytown" },
							{ name: "headspace", value: "headspace" }
						],
					},
					{
						type: OptionType.String,
						name: "character",
						description: "Choose which character to pick",
						required: true,
						choices: [
							{ name: "aubrey", value: "aubrey" },
							{ name: "basil", value: "basil" },
							{ name: "hero", value: "hero" },
							{ name: "kel", value: "kel" },
							{ name: "omori-sunny", value: "mc" }
						]
					},
					...common_options
				]
			},
		]
	},
	{
		type: OptionType.Subcommand,
		name: "undo",
		description: "Removes the last sent message"
	}
];

let emotions = [];
function readEmotions(path) {
	let f = statSync(path);
	if (f.isDirectory()) {
		let files = readdirSync(path);
		files.forEach(file => readEmotions(`${path}/${file}`));
	} else if (f.isFile()) emotions.push(path);
}
readEmotions("./emotions");

/** @type {Map<string, Interaction>}
 * Maps from a user id to their interaction
*/
let last_message = new Map();

client.on('ready', async () => {
	console.log(`Logged in as ${client.user.tag}!`);

	client.user.setPresence({
		activities: [{
			name: "/omorize",
			type: ActivityType.Listening
		}],
		status: "online"
	});

	client.rest.put(Routes.applicationCommands(config.app_id), { body: commands })
});

client.on('interactionCreate', async interaction => {
	if (!interaction.isChatInputCommand()) return;

	if (interaction.commandName === 'omorize') {

		let subcommand = interaction.options.getSubcommand(true);
		let input = interaction.options.getString("input", true);

		// ?? => null coalescing operator
		let size = interaction.options.getInteger("size") ?? 498;
		let fontsize = Math.ceil((size/498)*48);

		if (subcommand == "random") {
			//Randomize emotion
			let emotion = emotions[Math.floor(Math.random() * emotions.length)];
			console.log("Emotion randomized");

			await interaction.deferReply();

			let filename = await create_gif(input, emotion, fontsize, size);
			await interaction.editReply({
				files: [filename]
			});

			last_message.set(interaction.user.id, interaction);
		} else if (subcommand == "choose") {
			let dimension = interaction.options.getString("dimension", true);
			let character = interaction.options.getString("character", true);

			//Choose emotion
			console.log("Emotion is gonna be chosen");

			let filenames = readdirSync(`./emotions/${dimension}/${character}`);

			let component = {
				type: 3,
				custom_id: "emotion_select",
				options: filenames.map(file => ({
					label: file.slice(0, file.length - 4),
					value: file.slice(0, file.length - 4)
				}))
			};

			console.log(component);
			console.log(dimension);

			const response = await interaction.reply({
				content: "Choose the emotion you want",
				components: [
					{
						type: 1,
						components: [component]
					}
				]
			})

			try {
				const choice = await response.awaitMessageComponent({ filter: i => i.user.id == interaction.user.id, time: 60000 });

				let emotion = `./emotions/${dimension}/${character}/${choice.values[0]}.gif`;
				let filename = await create_gif(input, emotion, fontsize, size);

				await interaction.editReply({
					files: [filename],
					content: "",
					components: []
				})

				last_message.set(interaction.user.id, interaction);

				console.log(choice.values[0]);
			} catch (e) {
				console.log(e);
				await interaction.editReply({ content: "bruh", components: [] })
			};

			console.log(filenames);
		} 
	} else if (interaction.commandName == "undo") {
		let last = last_message.get(interaction.user.id);
		if (last != undefined) {
			if (last.replied) await last.deleteReply();

			last_message.delete(interaction.user.id);
			interaction.reply({
				content: "Removed.",
				ephemeral: true
			})
		}
	}
});

client.login(config.token);  
