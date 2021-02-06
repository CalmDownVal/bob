import { createHmac, timingSafeEqual } from 'crypto';

function serialize(payload: unknown) {
	return JSON.stringify(payload).replace(/(?<!\\)\\u[0-9a-f]{4}/g, match => `\\u${match.slice(2)}`);
}

const algorithms = [ 'sha1', 'sha256' ] as const;

export type Algorithm = typeof algorithms extends readonly (infer T)[] ? T : never;

export interface SignArgs {
	readonly algorithm?: Algorithm;
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

	public static sign(payload: unknown, { algorithm = 'sha1', secret }: SignArgs) {
		return new Signature(
			algorithm,
			createHmac(algorithm, secret)
				.update(typeof payload === 'string' ? payload : serialize(payload))
				.digest('hex')
		);
	}

	public static verify(args: VerifyArgs) {
		const { payload, secret } = args;
		const signature0 = typeof args.signature === 'string' ? Signature.parse(args.signature) : args.signature;
		const signature1 = Signature.sign(payload, {
			algorithm: signature0.algorithm,
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
