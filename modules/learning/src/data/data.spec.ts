import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { Journal } from './journal.js';
import { applyImport, buildExport, inspectImport, historyCSV } from './backup.js';
import { ctxFor, fixturePack, submission } from '../engine/test-utils.js';
import { META } from './db.js';

const ix = fixturePack();
let n = 0;
const fresh = async () => {
	const j = new Journal(ctxFor(ix), { packId: 'test', packVersion: '1.0.0' }, `test-db-${++n}`);
	await j.init();
	return j;
};
const at = (m: number) => new Date(Date.UTC(2026, 0, 10, 8, m));

async function masterA(j: Journal) {
	await j.append(
		'LESSON_COMPLETED',
		{ lessonId: 'lesson.01.01.a', lessonVersion: 1, conceptIds: ['x.a'] },
		{ entityId: 'lesson.01.01.a', sessionId: 's', now: at(0) }
	);
	const subs = [
		submission('exercise.a1', ['x.a'], true),
		submission('exercise.a2', ['x.a'], false),
		submission('exercise.a3', ['x.a'], true),
		submission('exercise.a4', ['x.a'], true, { exerciseKind: 'applied' })
	];
	for (const [i, s] of subs.entries())
		await j.append('ANSWER_SUBMITTED', s, {
			entityId: s.exerciseId,
			sessionId: 's',
			now: at(i + 1)
		});
}

describe('event journal (SPEC §13.6)', () => {
	it('persists events and projections across reopen; rebuilds identically', async () => {
		const j = await fresh();
		await masterA(j);
		expect(j.state.concepts['x.a'].masteredAt).toBeDefined();
		const name = j.db.name;
		j.close();
		const j2 = new Journal(ctxFor(ix), { packId: 'test', packVersion: '1.0.0' }, name);
		await j2.init();
		expect(j2.state.concepts['x.a'].masteredAt).toBe(j.state.concepts['x.a'].masteredAt);
		const rebuilt = await j2.rebuild();
		expect(JSON.stringify(rebuilt)).toBe(JSON.stringify(j2.state));
		expect(await j2.db.attempts.count()).toBe(4);
		expect(await j2.db.reviewQueue.count()).toBe(1);
	});

	it('rebuilds when the snapshot is missing or stale (failed migration)', async () => {
		const j = await fresh();
		await masterA(j);
		await j.db.meta.delete(META.projection);
		const p = await j.reload();
		expect(p.concepts['x.a'].masteredAt).toBeDefined();
		expect(p.eventCount).toBe(5);
	});

	it('assigns monotonic sequences', async () => {
		const j = await fresh();
		await masterA(j);
		const seqs = (await j.allEvents()).map((e) => e.sequence);
		expect(seqs).toEqual([1, 2, 3, 4, 5]);
	});
});

describe('backup round trip (SPEC §13.7)', () => {
	it('export → import into a fresh device keeps event ids and conclusions; duplicates ignored', async () => {
		const a = await fresh();
		await masterA(a);
		const file = await buildExport(a, '0.0.1', [
			{ packId: 'test', packVersion: '1.0.0', contentHash: 'x' }
		]);
		const text = JSON.stringify(file);

		const b = await fresh();
		const check = await inspectImport(b, text, ['test@1.0.0']);
		expect(check.ok).toBe(true);
		if (!check.ok) return;
		expect(check.preview.newEvents).toBe(5);
		await applyImport(b, check.preview, 'merge');
		expect((await b.allEvents()).map((e) => e.eventId).sort()).toEqual(
			(await a.allEvents()).map((e) => e.eventId).sort()
		);
		expect(b.state.concepts['x.a'].masteredAt).toBe(a.state.concepts['x.a'].masteredAt);

		const again = await inspectImport(b, text, ['test@1.0.0']);
		expect(again.ok && again.preview.duplicates).toBe(5);
		if (again.ok) expect(await applyImport(b, again.preview, 'merge')).toBe(0);
		expect(b.state.concepts['x.a'].evidence).toHaveLength(4);
	});

	it('rejects malformed, tampered or non-JSON imports atomically', async () => {
		const a = await fresh();
		await masterA(a);
		const file = await buildExport(a, '0.0.1', []);
		const b = await fresh();
		expect(await inspectImport(b, 'not json', [])).toMatchObject({ ok: false, error: 'not_json' });
		expect(await inspectImport(b, JSON.stringify({ ...file, formatVersion: 2 }), [])).toMatchObject(
			{ ok: false, error: 'invalid_schema' }
		);
		const tampered = structuredClone(file);
		(tampered.events[2].payload as { correct: boolean }).correct = true;
		expect(await inspectImport(b, JSON.stringify(tampered), [])).toMatchObject({
			ok: false,
			error: 'checksum_mismatch'
		});
		expect(await b.db.events.count()).toBe(0);
	});

	it('produces a CSV history', async () => {
		const a = await fresh();
		await masterA(a);
		const csv = historyCSV(await a.allEvents());
		expect(csv.split('\n')).toHaveLength(6);
		expect(csv).toContain('ANSWER_SUBMITTED');
	});
});
