export default class Monitoring {
	sentry: any | undefined;

	static instance: Monitoring | undefined;

	constructor(sentry?: any) {
		Monitoring.instance = this;

		if (!sentry) {
			this.sentry = undefined;
			// proxy!
			return;
		}

		this.sentry = sentry;
	}

	async mixpanel_track(name: string, opts = {}) {
		// if (process.env.MIXPANEL_ACCESS_TOKEN) {
		//   this.mixpanel?.track(name, opts);
		// } else {
		//   console.log(`tracking: ${name} ${JSON.stringify(opts)}`);
		// }
	}

	async mixpanel_people_set(property: string, value: any) {
		// if (process.env.MIXPANEL_ACCESS_TOKEN) {
		//   this.mixpanel?.people.set(property, value);
		// } else {
		//   console.log(`mixpanel_people_set: ${property} ${JSON.stringify(value)}`);
		// }
	}

	async mixpanel_people_increment(property: string, value: number) {
		// if (process.env.MIXPANEL_ACCESS_TOKEN) {
		//   this.mixpanel?.people?.increment?.(property, value);
		// } else {
		//   console.log(`increment: ${property} ${value}`);
		// }
	}

	async sentryCaptureMesage(message: string) {
		this.sentry?.captureMessage(message);
	}

	async sentryCaptureException(error: Error, extra: any) {
		this.sentry?.captureException(error, extra);
	}
}
