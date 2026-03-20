import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

export class UnlimitedFallbackAgent implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'AI Agent (Unlimited Fallbacks)',
		name: 'unlimitedFallbackAgent',
		icon: 'fa:robot', 
		group: ['transform'],
		version: 1,
		description: 'AI Agent that supports unlimited fallback language models',
		defaults: {
			name: 'Unlimited AI Agent',
		},
		inputs: [
			{
				displayName: 'Chat Models (Primary + Infinite Fallbacks)',
				name: 'ai_languageModel',
				type: 'ai_languageModel',
				required: true,
				maxConnections: -1, 
			},
			{
				displayName: 'Memory (Optional)',
				name: 'ai_memory',
				type: 'ai_memory',
				maxConnections: 1,
			},
			{
				displayName: 'Tools (Optional)',
				name: 'ai_tool',
				type: 'ai_tool',
				maxConnections: -1, 
			},
		],
		outputs: ['main'],
		properties: [
			{
				displayName: 'Prompt',
				name: 'prompt',
				type: 'string',
				typeOptions: { rows: 4 },
				default: '={{ $json.chatInput }}',
				description: 'User message or prompt for the AI',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			const prompt = this.getNodeParameter('prompt', itemIndex) as string;
			const connectedModels = this.getInputConnectionData('ai_languageModel', itemIndex);

			if (!connectedModels || connectedModels.length === 0) {
				throw new Error('Node Error: Please connect at least one language model.');
			}

			let finalOutput: any = null;
			let isSuccess = false;
			let errorLogs: string[] = []; 

			// CORE LOGIC: Sequential Fallback Loop
			for (let i = 0; i < connectedModels.length; i++) {
				try {
					// n8n returns the initialized Langchain model instance here
					const currentModel = connectedModels[i] as any; 
					
					// REAL AI EXECUTION LOGIC:
					// Depending on the Langchain version and model type n8n uses, 
					// we try the standard execution methods.
					if (currentModel && typeof currentModel.invoke === 'function') {
						const response = await currentModel.invoke(prompt);
						finalOutput = response?.content || response;
					} else if (currentModel && typeof currentModel.call === 'function') {
						const response = await currentModel.call({ input: prompt });
						finalOutput = response?.output || response;
					} else if (currentModel && typeof currentModel.generate === 'function') {
						const response = await currentModel.generate([prompt]);
						finalOutput = response.generations[0][0].text;
					} else {
						throw new Error(`Model ${i} is not a recognizable Langchain model instance.`);
					}
					
					isSuccess = true;
					break; // Success milte hi loop break

				} catch (error: any) {
					// Agar fail hua, error log karo aur aage badho
					const errorMsg = `Model ${i} failed due to: ${error.message || 'Unknown Error'}`;
					errorLogs.push(errorMsg);
					continue; 
				}
			}

			// Agar saare models fail ho gaye
			if (!isSuccess) {
				const combinedErrors = errorLogs.join(' | ');
				throw new Error(`CRITICAL FAILURE: All ${connectedModels.length} connected models failed. Error Trace: ${combinedErrors}`);
			}

			returnData.push({
				json: {
					output: finalOutput,
					promptProcessed: prompt,
					resolvedByModelIndex: errorLogs.length 
				},
			});
		}

		return [returnData];
	}
}
