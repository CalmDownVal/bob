import DotEnv from 'dotenv';

import { is } from './validation';

const validate = is.object({
	GITHUB_SECRET: is.string,
	REJECT_UNAUTHORIZED: is.optional.boolean.default(true),
	SOURCE_URL: is.string
});

export function useEnvConfig() {
	DotEnv.config();
	return validate(process.env);
}

export function useInlineConfig(config) {
	return validate(config);
}
