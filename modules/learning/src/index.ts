/** Public module entry point. Importing it never loads the UI, a course, or browser storage. */
export { createLearningAPI, CourseValidationError } from './application/service.js';
export { ApplicationError } from './application/errors.js';
export { EventRepository, MemoryPersistence } from './adapters/event-repository.js';
export { indexPack, chapterConcepts } from './domain/catalog.js';
export { validatePack } from './domain/validate-course.js';
export { RULES_VERSION } from './domain/events.js';
export type * from './api/contracts.js';
export type {
	CourseSource,
	LearningRepository,
	RepositoryFactory,
	StoredRecords,
	AppendOptions
} from './application/ports.js';
export type { RecordPersistence, RepositoryDocument } from './adapters/event-repository.js';
