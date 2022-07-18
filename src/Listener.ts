import type { TlsOptions } from 'tls';

import * as Signal from '@calmdownval/signal';

import { EventSource, Message } from './EventSource';
import { Signature } from './Signature';

// header names here must be lowercase
const H_DELIVERY = 'x-github-delivery';
const H_EVENT_NAME = 'x-github-event';
const H_SIGNATURE = 'x-hub-signature-256';
const H_SIGNATURE_ALT = 'x-hub-signature';

function getHeader(record: Record<string, unknown>, headerNameLC: string) {
	const direct = record[headerNameLC];
	if (typeof direct === 'string') {
		return direct;
	}

	for (const key in record) {
		const keyLC = key.toLowerCase();
		const value = record[key];
		if (keyLC === headerNameLC && typeof value === 'string') {
			return value;
		}
	}

	return null;
}

export interface ListenerOptions {
	readonly sourceURL: string;
	readonly secret?: string;
	readonly tls?: TlsOptions;
}

export interface GitHubEvent<T = unknown> {
	event: string;
	headers: Record<string, string>;
	id: string;
	payload: T;
}

export class Listener {
	public readonly error = Signal.create<Error>();

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
		return (this.signal[name] ?? (this.signal[name] = Signal.create<GitHubEvent>())) as Signal.SyncSignal<GitHubEvent<T>>;
	}

	private readonly _onMessage = (message: Message) => {
		try {
			const record = JSON.parse(message.data);
			const payload = record.body;

			const event = getHeader(record, H_EVENT_NAME);
			if (event === null) {
				throw new Error('missing or invalid event name header');
			}

			if (!this.signal[event] && !this.signal[Listener.ANY_EVENT]) {
				return;
			}

			const id = getHeader(record, H_DELIVERY);
			if (id === null) {
				throw new Error('missing or invalid delivery (id) header');
			}

			if (this.secret) {
				const signature = getHeader(record, H_SIGNATURE) ?? getHeader(record, H_SIGNATURE_ALT);
				if (signature === null) {
					throw new Error('missing or invalid signature header');
				}

				if (!Signature.verify({
					payload,
					secret: this.secret,
					signature
				})) {
					throw new Error('signature does not match payload and secret');
				}
			}

			const obj = {
				event,
				headers: {
					...record,

					// keys mixed into the record that don't correspond to a header
					body: undefined,
					query: undefined,
					timestamp: undefined
				},
				id,
				payload
			};

			this.signal[Listener.ANY_EVENT]?.(obj);
			this.signal[event]?.(obj);
		}
		catch (ex) {
			this.error(ex as Error);
		}
	};

	public static readonly ANY_EVENT = '*';
}
