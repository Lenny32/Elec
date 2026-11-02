export class ApplicationError extends Error {
	constructor(
		readonly code: 'not_found' | 'invalid_request' | 'conflict',
		message: string
	) {
		super(message);
	}
}
