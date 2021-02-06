import { ClientRequest, ClientRequestArgs, IncomingMessage, OutgoingHttpHeaders, request as makeRequest } from 'http';
import { request as makeSecureRequest } from 'https';
import type { Socket } from 'net';
import type { TlsOptions } from 'tls';
import { URL } from 'url';

import * as Signal from '@calmdownval/signal';

import { createParser, Event, Parser, ParserOptions } from './EventStreamParser';

const DEFAULT_IGNORED_EVENTS = [ 'ready', 'ping' ];
const DEFAULT_RECONNECT_INTERVAL = 1000;

const HTTP_OK = 200;
const HTTP_MOVED_PERMANENTLY = 301;
const HTTP_FOUND = 302;
const HTTP_TEMPORARY_REDIRECT = 307;

interface CreateConnection {
	(options: ClientRequestArgs, oncreate: (error: Error, socket: Socket) => void): Socket;
}

interface IgnoreMap {
	[key: string]: boolean | undefined;
}

interface ProxyTarget {
	host: string;
	port: string;
	protocol: string;
}

interface EventSourceOptionsInternal extends Required<ParserOptions> {
	createConnection?: CreateConnection;
	headers: OutgoingHttpHeaders;
	ignoredEvents: IgnoreMap;
	proxy?: ProxyTarget;
	tls?: TlsOptions;
}

export interface EventSourceOptions extends ParserOptions {
	readonly createConnection?: CreateConnection;
	readonly headers?: OutgoingHttpHeaders;
	readonly ignoredEvents?: readonly string[];
	readonly proxy?: string;
	readonly tls?: TlsOptions;
}

export interface EventSourceMessage {
	data: string;
	event?: string;
	id?: string;
	origin: string;
}

export enum EventSourceState {
	Connecting = 0,
	Open = 1,
	Closed = 2
}

export class EventSource {
	public readonly error = Signal.createSync<Error>();
	public readonly message = Signal.createSync<EventSourceMessage>();
	public readonly stateChange = Signal.createSync();

	private readonly _options: EventSourceOptionsInternal;
	private _isConnecting = false;
	private _lastEventId: string | null = null;
	private _origin: string | null = null;
	private _parser: Parser | null = null;
	private _reconnectInterval = DEFAULT_RECONNECT_INTERVAL;
	private _reconnectUrl: string | null = null;
	private _request: ClientRequest | null = null;
	private _state = EventSourceState.Connecting;
	private _url: string;

	public constructor(
		url: string,
		{
			createConnection,
			headers,
			ignoredEvents = DEFAULT_IGNORED_EVENTS,
			proxy,
			tls,
			trimLeadingWhitespace = true
		}: EventSourceOptions = {}
	) {
		this._options = {
			createConnection,
			headers: {
				...headers,
				'Accept': 'text/event-stream',
				'Cache-Control': 'no-cache'
			},
			ignoredEvents: ignoredEvents.reduce<IgnoreMap>((map, eventName) => {
				map[eventName] = true;
				return map;
			}, {}),
			tls,
			trimLeadingWhitespace
		};

		if (proxy) {
			const target = new URL(proxy);
			this._options.proxy = {
				host: target.hostname,
				port: target.port,
				protocol: target.protocol
			};
		}

		this._url = url;
		this._connect();
	}

	public get state() {
		return this._state;
	}

	public get url() {
		return this._url;
	}

	public close() {
		if (this._state === EventSourceState.Closed) {
			return;
		}

		this._setState(EventSourceState.Closed);
		this._request?.destroy();
	}

	private _reconnect() {
		if (this._state === EventSourceState.Closed) {
			return;
		}

		this._setState(EventSourceState.Connecting);
		if (this._reconnectUrl !== null) {
			this._url = this._reconnectUrl;
			this._reconnectUrl = null;
		}

		setTimeout(this._connect, this._reconnectInterval);
	}

	private _setState(state: EventSourceState) {
		if (this._state !== state) {
			this._state = state;
			this.stateChange();
		}
	}

	private readonly _connect = () => {
		if (this._isConnecting) {
			return;
		}

		const url = new URL(this._url);
		const args = {
			createConnection: this._options.createConnection,
			host: url.hostname,
			path: url.pathname + url.search,
			port: url.port,
			protocol: url.protocol,
			headers: this._options.headers
		};

		if (this._options.proxy) {
			Object.assign(args, this._options.proxy);
			args.headers.Host = url.hostname;
			args.path = this._url;
		}

		if (this._lastEventId) {
			args.headers['Last-Event-ID'] = this._lastEventId;
		}

		let request;
		switch (args.protocol) {
			case 'http:':
				request = makeRequest(args);
				break;

			case 'https:':
				Object.assign(args, this._options.tls);
				request = makeSecureRequest(args);
				break;

			default:
				throw new Error(`unsupported protocol '${args.protocol}'`);
		}

		request.on('error', this._onError);
		request.on('response', this._onResponse);
		request.setNoDelay(true);
		request.end();

		this._isConnecting = true;
		this._origin = url.origin;
		this._request = request;
	};

	private readonly _onError = (error: Error) => {
		this._isConnecting = false;
		this._request = null;
		this.error(error);
		this._reconnect();
	};

	private readonly _onResponse = (response: IncomingMessage) => {
		this._isConnecting = false;
		switch (response.statusCode) {
			case HTTP_OK:
				break;

			case HTTP_MOVED_PERMANENTLY:
			case HTTP_FOUND:
			case HTTP_TEMPORARY_REDIRECT:
				if (!response.headers.location) {
					this.error(new Error(`received a redirect response (${response.statusCode}: ${response.statusMessage}) without location header`));
					return;
				}

				if (response.statusCode === HTTP_TEMPORARY_REDIRECT) {
					this._reconnectUrl = this._url;
				}

				this._url = response.headers.location;
				process.nextTick(this._connect);
				return;

			default:
				this.error(new Error(`received an unexpected response (${response.statusCode}: ${response.statusMessage})`));
				return;
		}

		const onCloseOrEnd = () => {
			response.removeListener('close', onCloseOrEnd);
			response.removeListener('end', onCloseOrEnd);
			this._parser = null;
			this._request = null;
			this._reconnect();
		};

		this._setState(EventSourceState.Open);
		this._parser = createParser(this._onStreamEvent, this._options);

		response.on('close', onCloseOrEnd);
		response.on('end', onCloseOrEnd);
		response.on('data', this._parser);
	};

	private readonly _onStreamEvent = (obj: Event) => {
		let event: string | undefined;
		if (typeof obj.event === 'string') {
			event = obj.event;
			if (this._options.ignoredEvents[event]) {
				return;
			}
		}

		let id: string | undefined;
		if (typeof obj.id === 'string') {
			id = obj.id;
			this._lastEventId = id;
		}

		if (typeof obj.retry === 'string') {
			const interval = Number(obj.retry);
			if (Number.isInteger(interval)) {
				this._reconnectInterval = interval;
			}
		}

		this.message({
			data: obj.data ?? '',
			id,
			event,
			origin: this._origin!
		});
	};
}
