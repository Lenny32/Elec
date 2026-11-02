import { expect, test, type Page } from '@playwright/test';

async function finishLesson(page: Page, lessonId: string) {
	await page.goto(`/lesson/${lessonId}`);
	const complete = page.getByRole('button', { name: /complete lesson/i });
	for (let i = 0; i < 15 && !(await complete.isVisible()); i++) {
		await page.getByRole('button', { name: /^next/i }).click();
	}
	await complete.click();
	await expect(page.getByRole('heading', { name: /lesson completed/i })).toBeVisible();
}

test('today shows the first lesson and navigation works', async ({ page }) => {
	await page.goto('/');
	await expect(page.getByText('00.01 · Units and symbols')).toBeVisible();
	await page.goto('/course');
	await expect(page.getByRole('heading', { name: 'The course' })).toBeVisible();
	await expect(page.getByText('Before electricity').first()).toBeVisible();
});

test('completing a lesson persists across reload and unlocks the next one', async ({ page }) => {
	await finishLesson(page, 'lesson.00.01.units_prefixes');
	await page.reload();
	await page.goto('/course/chapter.00');
	await expect(page.getByRole('link', { name: /00\.01.*Completed/ })).toBeVisible();
	await expect(page.getByRole('link', { name: /00\.02.*Available/ })).toBeVisible();
});

test('a failed chapter exam requires consolidation before retake', async ({ page }) => {
	test.setTimeout(180_000);
	for (const id of [
		'lesson.00.01.units_prefixes',
		'lesson.00.02.rearranging',
		'lesson.00.04.reading_diagrams',
		'lesson.00.05.safety'
	])
		await finishLesson(page, id);
	await page.goto('/exams/exam.ch00');
	await page.getByRole('button', { name: /start exam/i }).click();
	await expect(page).toHaveURL(/\/exams\/attempt\//);
	// Deliberately finish without answering → 0 %.
	await page
		.getByRole('button', { name: /finish exam/i })
		.first()
		.click();
	await page
		.getByRole('dialog')
		.getByRole('button', { name: /finish exam/i })
		.click();
	await expect(page.getByRole('heading', { name: /not passed yet/i })).toBeVisible();
	await expect(page.getByText(/concepts to consolidate/i)).toBeVisible();
	await page.goto('/exams/exam.ch00');
	await expect(page.getByText(/consolidate before retaking/i)).toBeVisible();
	await expect(page.getByRole('button', { name: /start exam|retake/i })).toHaveCount(0);
	await page.goto('/exams');
	await expect(page.getByRole('link', { name: /Before electricity/ }).first()).toBeVisible();
});

test('works offline after first visit', async ({ page, context }) => {
	await page.goto('/');
	await page.waitForFunction(async () => !!(await navigator.serviceWorker?.ready));
	await page.reload();
	await context.setOffline(true);
	await page.goto('/formulas');
	await expect(page.getByRole('heading', { name: 'Formula library' })).toBeVisible();
	await page.goto('/lab/lab.ch01.ohms_law');
	await expect(page.getByText(/readings/i).first()).toBeVisible();
	await context.setOffline(false);
});
