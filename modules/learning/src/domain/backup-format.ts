import { z } from 'zod';

export const EXPORT_FORMAT_VERSION = 1;

export const MAX_IMPORT_BYTES = 50 * 1024 * 1024;

const EventSchema = z
	.object({
		eventId: z.string().min(8).max(64),
		deviceId: z.string().min(1).max(64),
		sequence: z.number().int().nonnegative(),
		occurredAt: z.string().regex(/^\d{4}-\d{2}-\d{2}T[\d:.]+Z$/),
		timezone: z.string().min(1).max(64),
		rulesVersion: z.string().max(32),
		packId: z.string().max(64),
		packVersion: z.string().max(32),
		entityId: z.string().max(200),
		entityVersion: z.number().int(),
		sessionId: z.string().max(64),
		type: z.enum([
			'LESSON_STARTED',
			'CARD_VIEWED',
			'LESSON_COMPLETED',
			'ANSWER_SUBMITTED',
			'REVIEW_SUBMITTED',
			'HINT_USED',
			'SOLUTION_REVEALED',
			'ASSESSMENT_STARTED',
			'ASSESSMENT_COMPLETED',
			'ASSESSMENT_ABANDONED',
			'DRILL_STARTED',
			'DRILL_COMPLETED',
			'LAB_PARAMETER_CHANGED',
			'PACK_INSTALLED',
			'DATA_IMPORTED',
			'PREFERENCE_CHANGED'
		]),
		payload: z.record(z.string(), z.unknown()),
		payloadSchemaVersion: z.number().int(),
		previousEventHash: z.string().optional()
	})
	.strict();

export const ExportSchema = z
	.object({
		formatVersion: z.literal(EXPORT_FORMAT_VERSION),
		app: z.literal('circuitpath'),
		exportedAt: z.string(),
		appVersion: z.string(),
		deviceId: z.string(),
		packs: z.array(
			z.object({ packId: z.string(), packVersion: z.string(), contentHash: z.string() })
		),
		events: z.array(EventSchema),
		preferences: z.array(z.object({ key: z.string(), value: z.unknown() })),
		labSnapshots: z.array(
			z.object({
				labId: z.string(),
				params: z.record(z.string(), z.number()),
				updatedAt: z.string()
			})
		),
		checksum: z.string().regex(/^[0-9a-f]{64}$/)
	})
	.strict();

export type ExportFile = z.infer<typeof ExportSchema>;

export interface ImportPreview {
	file: ExportFile;
	total: number;
	newEvents: number;
	duplicates: number;
	firstAt?: string;
	lastAt?: string;
	sourceDeviceId: string;
	unknownPacks: string[];
}

export type ImportCheck =
	| { ok: true; preview: ImportPreview }
	| {
			ok: false;
			error: 'too_large' | 'not_json' | 'invalid_schema' | 'checksum_mismatch' | 'duplicate_ids';
			detail?: string;
	  };
