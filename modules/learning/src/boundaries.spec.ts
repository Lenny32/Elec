import { readFileSync, readdirSync } from 'node:fs';
import { resolve, relative, dirname } from 'node:path';
import { describe, expect, it } from 'vitest';
import ts from 'typescript';

const root = import.meta.dirname;
function files(directory: string): string[] {
	return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
		const path = resolve(directory, entry.name);
		return entry.isDirectory()
			? files(path)
			: path.endsWith('.ts') && !path.endsWith('.spec.ts')
				? [path]
				: [];
	});
}

describe('standalone module boundary', () => {
	it('never imports the UI or files outside the module, including through type exports', () => {
		const violations: string[] = [];
		for (const file of files(root)) {
			const source = ts.createSourceFile(
				file,
				readFileSync(file, 'utf8'),
				ts.ScriptTarget.Latest,
				true
			);
			const layer = relative(root, file).replaceAll('\\', '/').split('/')[0];
			function visit(node: ts.Node) {
				let specifier: string | undefined;
				if (
					(ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
					node.moduleSpecifier &&
					ts.isStringLiteral(node.moduleSpecifier)
				)
					specifier = node.moduleSpecifier.text;
				if (
					ts.isCallExpression(node) &&
					node.expression.kind === ts.SyntaxKind.ImportKeyword &&
					node.arguments[0] &&
					ts.isStringLiteral(node.arguments[0])
				)
					specifier = node.arguments[0].text;
				if (specifier) {
					const name = specifier.startsWith('.')
						? relative(root, resolve(dirname(file), specifier)).replaceAll('\\', '/')
						: specifier;
					const forbidden =
						layer === 'domain'
							? /^(engine|application|api|content|adapters|data)\//
							: layer === 'engine'
								? /^(application|api|content|adapters|data)\//
								: layer === 'content'
									? /^(engine|application|api|adapters|data)\//
									: layer === 'application'
										? /^(content|adapters|data)\//
										: /^$/;
					if (
						name.startsWith('..') ||
						/^(svelte|@sveltejs|\$app|#lib|#learning|katex)(\/|$)/.test(name) ||
						forbidden.test(name)
					)
						violations.push(`${relative(root, file)} -> ${specifier}`);
				}
				ts.forEachChild(node, visit);
			}
			visit(source);
		}
		expect(violations).toEqual([]);
	});
});
