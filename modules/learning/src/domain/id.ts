/** IDs are platform primitives; importing this never opens a database. */
export function uuid(): string {
	return globalThis.crypto.randomUUID();
}
