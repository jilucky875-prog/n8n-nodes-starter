import {
	INodeType,
	INodeTypeDescription,
	ILanguageModelMessage,
	ILanguageModelOptions,
} from 'n8n-workflow';

export class UnlimitedFallbackModel implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Universal AI Gateway (Fallbacks)',
		name: 'unlimitedFallbackModel',
		icon: 'fa:microchip',
		group: ['ai'],
		version: 1,
		description: 'A proxy node that routes Agent calls to multiple models with fallbacks',
		defaults: {
			name: 'AI Gateway',
		},
		// Ye node 'ai_languageModel' type ka hai taaki Agent ise accept kare
		codex: {
			categories: ['AI'],
			subcategories: { AI: ['Language Models'] },
			resources: {
				primaryDocumentation: [{ url: 'https://docs.n8n.io' }],
			},
		},
		inputs: [
			{
				displayName: 'Models',
				type: 'ai_languageModel',
				required: true,
				maxConnections: 50,
			},
		],
		outputs: ['ai_languageModel'], // Ye output direct Agent mein jayega
		properties: [],
	};

	// Language Model nodes mein 'execute' nahi hota, 'methods' hote hain
	// Jo Langchain call ko intercept karte hain.
	async execute() {
		// Ye node logic provide karta hai, execution Agent handle karega
		return;
	}

	// Gateway logic to wrap connected models
	methods = {
		loadInterface: async (this: any) => {
			const connectedModels = await this.getInputConnectionData('ai_languageModel', 0);

			return {
				// Proxy function jo Agent ki call ko models tak le jayegi
				async invoke(messages: ILanguageModelMessage[], options: ILanguageModelOptions) {
					let lastError: any;

					for (const model of connectedModels) {
						try {
							// Try to call the connected model with memory and tools
							return await model.invoke(messages, options);
						} catch (error) {
							lastError = error;
							console.log(`Model failed, trying next fallback...`);
							continue;
						}
					}
					throw new Error(`All Fallbacks Failed: ${lastError.message}`);
				},
			};
		},
	};
}
