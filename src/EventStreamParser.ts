const ASCII_CR = 13;
const ASCII_LF = 10;
const ASCII_COLON = 58;

function hasBOM(buffer: Buffer) {
	return (
		/* eslint-disable @typescript-eslint/no-magic-numbers */
		buffer[0] === 239 &&
		buffer[1] === 187 &&
		buffer[2] === 191
		/* eslint-enable */
	);
}

export interface Event {
	[field: string]: string | undefined;
}

export interface Parser {
	(chunk: Buffer): void;
}

export interface ParserOptions {
	trimLeadingWhitespace?: boolean;
}

export function createParser(callback: (event: Event) => void, options: ParserOptions): Parser {
	let buffer: Buffer | null = null;
	let event: Event = {};
	let isFirst = true;
	let keyCount = 0;

	const processLine = (lineStart: number, lineEnd: number, colonIndex: number | null) => {
		if (colonIndex === lineEnd) {
			// skip comment lines starting with a colon
			return;
		}

		const key = buffer!.slice(lineStart, colonIndex ?? lineEnd).toString('utf8');

		let value = colonIndex === null ? '' : buffer!.slice(colonIndex + 1, lineEnd).toString('utf8');
		if (options.trimLeadingWhitespace !== false) {
			value = value.trimStart();
		}

		const prevValue = event[key];
		if (typeof prevValue === 'string') {
			value = `${prevValue}\n${value}`;
		}
		else {
			++keyCount;
		}

		event[key] = value;
	};

	return chunk => {
		buffer = buffer ? Buffer.concat([ buffer, chunk ]) : chunk;

		let colonIndex: number | null = null;
		let index = 0;
		let lineStart = 0;

		if (isFirst) {
			if (hasBOM(buffer)) {
				// BOM is three bytes long, skip it
				// eslint-disable-next-line @typescript-eslint/no-magic-numbers
				lineStart = 3;
			}

			isFirst = false;
		}

		while (index < buffer.length) {
			switch (buffer[index]) {
				case ASCII_COLON:
					if (colonIndex === null) {
						colonIndex = index;
					}

					break;

				case ASCII_LF: {
					const lineEnd = buffer[index - 1] === ASCII_CR ? index - 1 : index;
					if (lineEnd > lineStart) {
						processLine(lineStart, lineEnd, colonIndex);
					}
					else if (keyCount > 0) {
						callback(event);
						event = {};
						keyCount = 0;
					}

					colonIndex = null;
					lineStart = index + 1;
					break;
				}
			}

			++index;
		}

		buffer = lineStart < buffer.length ? buffer.slice(lineStart) : null;
	};
}
