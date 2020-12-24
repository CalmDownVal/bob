import Octokit from '@octokit/webhooks';
import EventSource from 'eventsource';

export class Listener {
	#source;
	#webhooks;

	static #instances = [];

	constructor(config) {
		const handleError = error => console.error(error);
		const handleEvent = async event => {
			try {
				const data = JSON.parse(event.data);
				await this.#webhooks.verifyAndReceive({
					id: data['x-request-id'],
					name: data['x-github-event'],
					signature: data['x-hub-signature-256'],
					payload: data.body
				});
			}
			catch (ex) {
				handleError(ex);
			}
		};

		this.#webhooks = new Octokit.Webhooks({
			secret: config.GITHUB_SECRET
		});

		this.#source = new EventSource(config.SOURCE_URL, {
			https: {
				rejectUnauthorized: config.REJECT_UNAUTHORIZED
			}
		});

		this.#source.addEventListener('error', handleError);
		this.#source.addEventListener('message', handleEvent);

		Listener.#instances.push(this);
		if (Listener.#instances.length === 1) {
			process.on('SIGINT', () => {
				for (const listener of Listener.#instances) {
					console.log('closing');
					listener.close();
					listener.close();
				}
			});
		}
	}

	get isListening() {
		return this.#source.readyState === EventSource.OPEN;
	}

	close() {
		this.#source.close();
	}

	on(eventName, listener) {
		this.#webhooks.on(eventName, listener);
		return this;
	}

	off(eventName, listener) {
		this.#webhooks.removeListener(eventName, listener);
		return this;
	}
}
