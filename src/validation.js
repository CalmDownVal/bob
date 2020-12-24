export class ValidationError extends Error {
	constructor(type, path = '#') {
		super(`Expected value at ${path} to be a ${type}.`);
	}
}

function _array(validator) {
	return (value, path = '#') => {
		if (!Array.isArray(value)) {
			throw new ValidationError('array', path);
		}

		return value.map((subValue, index) => validator(subValue, `${path}/${index}`));
	};
}

function _object(validatorMap) {
	return (value, path = '#') => {
		if (typeof value !== 'object' || value === null) {
			throw new ValidationError('object', path);
		}

		const obj = {};
		for (const key in validatorMap) {
			obj[key] = validatorMap[key](value[key], `${path}/${key}`);
		}

		return obj;
	};
}

function _const(constValue) {
	return (value, path) => {
		if (value !== constValue) {
			throw new ValidationError(`constant: ${constValue}`, path);
		}
		return value;
	}
}

function _boolean(value, path) {
	switch (typeof value) {
		case 'boolean':
			return value;

		case 'string':
			if (/^true$/i.test(value)) {
				return true;
			}
			if (/^false$/i.test(value)) {
				return false;
			}
			break;
	}
	throw new ValidationError('boolean', path);
}

function _number(value, path) {
	const number = Number(value);
	if (Number.isNaN(number)) {
		throw new ValidationError('number', path);
	}
	return number;
}

function _string(value, path) {
	if (typeof value !== 'string') {
		throw new ValidationError('string', path);
	}
	return value;
}

function _optional(validator) {
	const fn = (value, path) =>
		value === undefined ? value : validator(value, path);

	fn.default = defaultValue => (value, path) =>
		value === undefined ? defaultValue : validator(value, path);

	return fn;
}

_optional.array = validator => _optional(_array(validator));
_optional.object = validatorMap => _optional(_object(validatorMap));
_optional.const = constValue => _optional(_const(constValue));
_optional.null = _optional(_const(null));
_optional.undefined = _optional(_const(undefined));
_optional.boolean = _optional(_boolean);
_optional.number = _optional(_number);
_optional.string = _optional(_string);
Object.freeze(_optional);

export const is = Object.freeze({
	any: value => value,
	array: _array,
	object: _object,
	const: _const,
	null: _const(null),
	undefined: _const(undefined),
	boolean: _boolean,
	number: _number,
	string: _string,
	optional: _optional
});
