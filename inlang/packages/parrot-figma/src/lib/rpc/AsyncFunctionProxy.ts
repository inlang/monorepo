export class AsyncMessageBus {
	static invocationResult = "invocationResult";

	static invocationRequest = "invocationRequest";
}

export class AsyncFunctionProxy {
	name: string;

	invocationId = 0;

	invocationRequests: any = {};

	invocationRequestHandler: any = {};

	postMessage: any;

	constructor(name: string, postMessage: any, messageBus: any) {
		this.postMessage = (message: any) => {
			postMessage(message);
		};
		this.name = name;

		try {
			if (messageBus.addEventListener) {
				messageBus.addEventListener("message", (event: MessageEvent) => {
					this.handleMessage(event.data.pluginMessage);
				});
			} else {
				messageBus.on("message", (message: any) => {
					this.handleMessage(message);
				});
			}
		} catch (e) {
			const error = new Error(`was not able to add event listener to receive events${name}`);
			throw error;
		}
	}

	handleMessage(message: any) {
		if (message.target === "AsyncFunctionProxy") {
			if (message.type === AsyncMessageBus.invocationResult) {
				this.handleInvocationResult(message);
			} else if (message.type === AsyncMessageBus.invocationRequest) {
				this.handleInvocationRequest(message);
			}
		}
	}

	/**
	 * monkey patches all async method of the given instnce and proxies calls via figmas postMessage to
	 * sandbox or / the ui
	 *
	 * @param instance
	 */
	proxyAsyncMethods(instance: any) {
		const instanceClassName = instance.proxyClassName;

		const instancePrototype = Object.getPrototypeOf(instance);
		for (const memberName of Object.getOwnPropertyNames(instancePrototype)) {
			if (
				memberName !== "constructor" &&
				instancePrototype[memberName].constructor &&
				(instancePrototype[memberName].constructor.name === "Function" ||
					instancePrototype[memberName].constructor.name === "AsyncFunction")
			) {
				// eslint-disable-next-line @typescript-eslint/no-this-alias -- we need this for the functino binding
				const proxy = this;

				instancePrototype[memberName] = async function () {
					let thrownError: undefined | any;
					// console.log(proxy.name + ' request invocation of: ' + instanceClassName + '.' + memberName);

					try {
						const remoteResult = await proxy.invoke(
							`${instanceClassName}.${memberName}`,
							// eslint-disable-next-line prefer-rest-params -- check how rest params can be used here
							Array.prototype.slice.call(arguments),
						);
						return remoteResult;
					} catch (e: any) {
						thrownError = e;
					}

					if (thrownError) {
						try {
							throw new Error(`stacktrace helper error - ${memberName}`);
						} catch (error: any) {
							thrownError.stack += error.stack;
						}
						throw thrownError;
					}
				};
			}
		}
	}

	registerInstance(instance: any) {
		const instanceClassName = instance.proxyClassName;

		// console.log(this.name+ ' proxy class:' + instanceClassName + Object.getOwnPropertyNames(instance));

		const instancePrototype = Object.getPrototypeOf(instance);
		for (const memberName of Object.getOwnPropertyNames(instancePrototype)) {
			if (
				memberName !== "constructor" &&
				instancePrototype[memberName].constructor &&
				(instancePrototype[memberName].constructor.name === "Function" ||
					instancePrototype[memberName].constructor.name === "AsyncFunction")
			) {
				// console.log(this.name+ ' proxy class!' + instanceClassName + '.' + memberName);
				this.registerInvocationHandler(
					`${instanceClassName}.${memberName}`,
					instance,
					instance[memberName],
				);
			}
		}
	}

	private registerInvocationHandler(
		messageName: string,
		instance: any,
		messageHandler: Promise<any>,
	) {
		// console.log(`registerInvocationHandler${messageName}`);
		if (this.invocationRequestHandler[messageName]) {
			// console.log(this.invocationRequestHandler[messageName]);
			throw new Error(`${this.name} Message ${messageName} handler did exist already`);
		}
		this.invocationRequestHandler[messageName] = {
			instance,
			method: messageHandler,
		};
	}

	private async invoke(messageName: string, parameter: any | undefined) {
		const invocationId = `${messageName}.${(this.invocationId += 1)}`;

		return new Promise((resolve, reject) => {
			this.invocationRequests[invocationId] = {
				messageName,
				resolve: resolve.bind(this),
				reject: reject.bind(this),
			};

			const message = {
				target: "AsyncFunctionProxy",
				type: AsyncMessageBus.invocationRequest,
				name: messageName,
				id: invocationId,
				parameter,
			};
			this.postMessage(message);
		});
	}

	handleInvocationRequest(pluginMessage: any) {
		if (!this.invocationRequestHandler[pluginMessage.name]) {
			throw new Error(
				`${this.name} Invocation handler for [${pluginMessage.name}] does not exist (did you register the executing instance in [${this.name}]?`,
			);
		}

		const methodHandler = this.invocationRequestHandler[pluginMessage.name];

		methodHandler.method
			.apply(methodHandler.instance, pluginMessage.parameter)
			.then((data: any) => {
				const transferObj = {
					target: "AsyncFunctionProxy",
					type: AsyncMessageBus.invocationResult,
					invocationId: pluginMessage.id,
					result: data,
				};
				this.postMessage(transferObj);
			})
			.catch((error: Error) => {
				this.postMessage({
					target: "AsyncFunctionProxy",
					type: AsyncMessageBus.invocationResult,
					invocationId: pluginMessage.id,
					error: this.toSerializableError(error),
				});
			});
	}

	handleInvocationResult(pluginMessage: any) {
		if (!this.invocationRequests[pluginMessage.invocationId]) {
			throw Error(`${this.name} Invocation with id ${pluginMessage.invocationId} was not found `);
		}

		if (pluginMessage.error !== undefined) {
			const error = this.fromSerializableError(pluginMessage.error);
			this.invocationRequests[pluginMessage.invocationId].reject(error);
		} else {
			const fn = this.invocationRequests[pluginMessage.invocationId].resolve;
			// console.log(this.name, " handleInvocationResult result "+ fn + ' ' + JSON.stringify(pluginMessage))
			fn(pluginMessage.result);
		}

		return true;
	}

	private toSerializableError(error: Error) {
		return {
			message: error.message,
			name: error.name,
			stack: error.stack,
		};
	}

	private fromSerializableError(serializedError: any) {
		const { message, name, stack } = serializedError;
		const error = new Error(message);
		error.name = name;
		error.stack = stack;
		return error;
	}
}
