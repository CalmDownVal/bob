import type { TlsOptions } from 'tls';

import * as Signal from '@calmdownval/signal';

import { EventSource, Message } from './EventSource';
import { Signature } from './Signature';

const H_DELIVERY = 'X-GitHub-Delivery';
const H_EVENT_NAME = 'X-GitHub-Event';
const H_SIGNATURE = 'X-Hub-Signature-256';
const H_SIGNATURE_ALT = 'X-Hub-Signature';

export interface ListenerOptions {
	readonly sourceURL: string;
	readonly secret?: string;
	readonly tls?: TlsOptions;
}

export interface GitHubEvent<T = unknown> {
	data: T;
	event: string;
	id: string;
}

export class Listener {
	public static readonly ANY_EVENT = '*';
	public readonly error = Signal.createSync<Error>();

	private readonly secret?: string;
	private readonly signal: Record<string, Signal.SyncSignal<GitHubEvent> | undefined> = {};
	private readonly source: EventSource;

	public constructor(options: ListenerOptions) {
		this.secret = options.secret;
		this.source = new EventSource(options.sourceURL, { tls: options.tls });
		Signal.on(this.source.error, this.error);
		Signal.on(this.source.message, this._onMessage);
	}

	public close() {
		this.source.close();
	}

	public event<T = unknown>(name: string = Listener.ANY_EVENT) {
		return (this.signal[name] ?? (this.signal[name] = Signal.createSync<GitHubEvent>())) as Signal.SyncSignal<GitHubEvent<T>>;
	}

	private readonly _onMessage = (message: Message) => {
		try {
			const data = JSON.parse(message.data);

			const event = data[H_EVENT_NAME];
			if (typeof event !== 'string') {
				throw new Error('missing or invalid event name header');
			}

			if (!this.signal[Listener.ANY_EVENT] && !this.signal[event]) {
				return;
			}

			const id = data[H_DELIVERY];
			if (typeof id !== 'string') {
				throw new Error('missing or invalid delivery (id) header');
			}

			if (this.secret) {
				const signature = data[H_SIGNATURE] || data[H_SIGNATURE_ALT];
				if (typeof signature !== 'string') {
					throw new Error('missing or invalid signature header');
				}

				if (!Signature.verify({
					payload: data.body,
					secret: this.secret,
					signature
				})) {
					throw new Error('signature does not match payload and secret');
				}
			}

			const obj = {
				data: data.body,
				event,
				id
			};

			this.signal[Listener.ANY_EVENT]?.(obj);
			this.signal[event]?.(obj);
		}
		catch (ex) {
			this.error(ex);
		}
	};
}
