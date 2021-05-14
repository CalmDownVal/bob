import { createHmac, timingSafeEqual } from 'crypto';

function serialize(payload: unknown) {
	return JSON.stringify(payload).replace(/(?<!\\)\\u[0-9a-f]{4}/g, match => `\\u${match.slice(2).toUpperCase()}`);
}

const algorithms = [ 'sha1', 'sha256' ] as const;

export type Algorithm = typeof algorithms[number];

export interface SignArgs {
	readonly algorithm?: Algorithm;
	readonly payload: unknown;
	readonly secret: string;
}

export interface VerifyArgs {
	readonly payload: unknown;
	readonly secret: string;
	readonly signature: Signature | string;
}

export class Signature {
	private constructor(
		public readonly algorithm: Algorithm,
		public readonly hash: string
	) {}

	public static parse(signature: string) {
		const index = signature.indexOf('=');
		const algorithm = index === -1 ? 'sha1' : signature.slice(0, index) as Algorithm;
		if (!algorithms.includes(algorithm)) {
			throw new Error(`unsupported algorithm '${algorithm}'`);
		}

		return new Signature(
			algorithm,
			index === -1 ? signature : signature.slice(index + 1)
		);
	}

	public static sign({ algorithm = 'sha1', payload, secret }: SignArgs) {
		return new Signature(
			algorithm,
			createHmac(algorithm, secret)
				.update(typeof payload === 'string' ? payload : serialize(payload), 'utf8')
				.digest('hex')
		);
	}

	public static verify({ payload, secret, signature }: VerifyArgs) {
		const signature0 = typeof signature === 'string' ? Signature.parse(signature) : signature;
		const signature1 = Signature.sign({
			algorithm: signature0.algorithm,
			payload,
			secret
		});

		return timingSafeEqual(
			Buffer.from(signature0.hash, 'hex'),
			Buffer.from(signature1.hash, 'hex')
		);
	}

	public toString() {
		return `${this.algorithm}=${this.hash}`;
	}
}
