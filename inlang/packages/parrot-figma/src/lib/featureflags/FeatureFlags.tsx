interface Features {
	payment: boolean;
}

export default class FeatureFlags {
	static features: Features = {
		payment: false,
	};

	static setFeatureflags(fileFeatureFlags: any) {
		for (const key of Object.keys(FeatureFlags.features)) {
			if (fileFeatureFlags[key]) {
				(FeatureFlags.features as any)[key] = fileFeatureFlags[key] as boolean;
			}
		}
	}
}
