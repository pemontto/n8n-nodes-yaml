import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeConnectionType,
	NodeOperationError,
} from 'n8n-workflow';

import { set } from 'lodash';
import { parse, stringify } from 'yaml';

export class Yaml implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'YAML',
		name: 'yaml',
		icon: 'file:yaml.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["name"]}}',
		description: 'Parse YAML',
		defaults: {
			name: 'YAML',
		},
		inputs: [NodeConnectionType.Main],
		outputs: [NodeConnectionType.Main],
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Parse',
						value: 'parse',
					},
					{
						name: 'Stringify',
						value: 'stringify',
					},
				],
				default: 'parse',
			},
			{
				displayName: 'YAML',
				name: 'value',
				type: 'string',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				displayOptions: {
					show: {
						operation: ['parse'],
					},
				},
				default: '',
				description: 'YAML string to parse',
			},
			{
				displayName: 'Value',
				name: 'value',
				displayOptions: {
					show: {
						operation: ['stringify'],
					},
				},
				type: 'string',
				default: '',
				description: 'The value that should be YAML stringified',
				required: true,
			},
			{
				displayName: 'Property Name',
				name: 'propertyName',
				type: 'string',
				default: 'data',
				required: true,
				description: 'Name of the property to which to write the output',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();

		let item: INodeExecutionData;
		const returnData: INodeExecutionData[] = [];

		const operation = this.getNodeParameter('operation', 0) as string;

		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			const value = this.getNodeParameter('value', itemIndex);
			const propertyName = this.getNodeParameter('propertyName', itemIndex) as string;

			item = items[itemIndex];

			const newItem: INodeExecutionData = {
				json: {...item.json},
				pairedItem: item.pairedItem,
			};

			if (item.binary !== undefined) {
				// Create a shallow copy of the binary data so that the old
				// data references which do not get changed still stay behind
				// but the incoming data does not get changed.
				newItem.binary = {};
				Object.assign(newItem.binary, item.binary);
			}

			try {
				if (operation === 'parse') {
					set(
						newItem.json,
						propertyName,
						parse(value as string, { strict: false, prettyErrors: true }),
					);
				} else if (operation === 'stringify') {
					set(newItem.json, propertyName, stringify(value as object));
				}
			} catch (error) {
				// This node should never fail but we want to showcase how
				// to handle errors.
				if (this.continueOnFail()) {
					returnData.push({ json: this.getInputData(itemIndex)[0].json, error });
					continue;
				} else {
					// Adding `itemIndex` allows other workflows to handle this error
					if (error.context) {
						// If the error thrown already contains the context property,
						// only append the itemIndex
						error.context.itemIndex = itemIndex;
						throw error;
					}
					throw new NodeOperationError(this.getNode(), error, {
						itemIndex,
					});
				}
			}
			returnData.push(newItem);
		}
		return this.prepareOutputData(returnData);
	}
}
