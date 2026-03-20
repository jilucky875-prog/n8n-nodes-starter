import {
	INodeType,
	INodeTypeDescription,
	IExecuteFunctions,
	INodeExecutionData,
} from 'n8n-workflow';

export class UnlimitedFallbackModel implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Universal AI Gateway (Fallbacks)',
		name: 'unlimitedFallbackModel',
		icon: 'fa:microchip',
		group: ['ai'],
		version: 1,
		description: 'Routes Official AI Agent calls to multiple models with fallbacks',
		defaults: {
			name: 'AI Gateway',
		},
		// Isse n8n Agent ise pehchan jayega
		codex: {
			categories: ['AI'],
			subcategories: { AI: ['Language Models'] },
		},
		inputs: [
			{
				displayName: 'Chat Models (Fallbacks)',
				type: 'ai_languageModel',
				required: true,
				maxConnections: 50,
			},
		],
		outputs: ['ai_languageModel'],
		properties: [],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		return [];
	}

	methods = {
		loadInterface: async (this: any) => {
			// Saare connected models ko array mein fetch karein
			const connectedModels = (await this.getInputConnectionData('ai_languageModel', 0)) as any[];

			return {
				// Proxy invoke function jo memory aur tools carry karta hai
				async invoke(messages: any, options: any) {
					let lastError: any;

					for (let i = 0; i < connectedModels.length; i++) {
						try {
							const model = connectedModels[i];
							// Agent se aayi hui Memory (messages) aur Tools (options) ko forward karna
							return await model.invoke(messages, options);
						} catch (error) {
							lastError = error;
							console.warn(`Gateway: Model ${i} failed. Error: ${error.message}. Trying next fallback...`);
							continue;
						}
					}
					throw new Error(`CRITICAL: All ${connectedModels.length} models in Gateway failed. Last error: ${lastError.message}`);
				},
			};
		},
	};
}
