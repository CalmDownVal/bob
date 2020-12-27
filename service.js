import { useEnvConfig } from './lib/config';
import { Listener } from './lib/Listener';

// swap for `useInlineConfig` to define config in this file
const config = useEnvConfig();

// listen for GitHub events
new Listener(config)
	.on('ping', ({ payload: e }) => {
		console.log(`"${e.zen}" Pinged from ${e.repository.full_name} by ${e.sender.login}.`);
	})
	.on('push', ({ payload: e }) => {
		console.log(`${e.sender.login} pushed ${e.commits.length} commits into ${e.repository.full_name}.`);
	});
