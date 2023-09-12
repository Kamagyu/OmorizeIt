import { Routes, Client, GatewayIntentBits, ActivityType, ApplicationCommandOptionType as OptionType } from 'discord.js';
import { readdirSync, statSync } from 'fs';
import { create_gif } from './main.js';
import config from './config.json' assert { type: "json"};

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

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
					{
						type: OptionType.String,
						name: "input",
						description: "Text input",
						required: true,
					},
				]
			},
			{
				type: OptionType.Subcommand,
				name: "choose",
				description: "Choose a character and emotion",
				options: [
					{
						type: OptionType.String,
						name: "input",
						description: "Text input",
						required: true,
					},
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
					}
				]
			}
		]
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

let emotion = "";
let component = {};
let filename;



client.on('interactionCreate', async interaction => {
	if (!interaction.isChatInputCommand()) return;

	if (interaction.commandName === 'omorize') {

		let subcommand = interaction.options.getSubcommand(true);

		if (subcommand == "random") {
			//Randomize emotion

			emotion = emotions[Math.floor(Math.random() * emotions.length)];
			console.log("Emotion randomized");

			filename = await create_gif(interaction.options.getString("input"), emotion, 48, 498);
			await interaction.reply({
				files: [filename]
			});
		} else if (subcommand == "choose") {
			let dimension = interaction.options.getString("dimension");
			let character = interaction.options.getString("character");

			//Choose emotion
			console.log("Emotion is gonna be chosen");

			let filenames = readdirSync(`./emotions/${dimension}/${character}`);

			component = {
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

				emotion = `./emotions/${dimension}/${character}/${choice.values[0]}.gif`;

				filename = await create_gif(interaction.options.getString("input"), emotion, 48, 498);

				await interaction.editReply({
					files: [filename],
					content: "",
					components: []
				})

				console.log(choice.values[0]);

			} catch (e) {
				console.log(e);
				await interaction.editReply({ content: "bruh", components: [] })
			};

			console.log(filenames);
		}
		console.log(emotion);

	}
});



client.login(config.token);  
