import { makeConfig } from './config';
import { Listener } from './Listener';

// default configuration, can be overridden with env variables
const config = makeConfig({
	GITHUB_SECRET: '',
	SOURCE_URL: ''
});

// listen for GitHub events
new Listener(config)
	.on('ping', ({ payload: e }) => {
		console.log(`"${e.zen}" Pinged from ${e.repository.full_name} by ${e.sender.login}.`);
	})
	.on('push', ({ payload: e }) => {
		console.log(`${e.sender.login} pushed ${e.commits.length} commits into ${e.repository.full_name}.`);
	});
