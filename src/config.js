import { is } from './validation';

const validate = is.object({
	GITHUB_SECRET: is.string,
	REJECT_UNAUTHORIZED: is.optional.boolean.default(true),
	SOURCE_URL: is.string
});

export function makeConfig(config) {
	for (const key in config) {
		const env = process.env[key];
		if (env) {
			config[key] = env;
		}
	}
	return validate(config);
}
