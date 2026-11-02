/**
 * Minimal, safe rich-text renderer for authored course text.
 * Supports: paragraphs (blank line), "- " bullet lists, "1. " numbered lists, **bold**, *italic*,
 * `code`, inline $math$ and display $$math$$ (KaTeX). All other text is HTML-escaped.
 */
import katex from 'katex';

const ESC: Record<string, string> = {
	'&': '&amp;',
	'<': '&lt;',
	'>': '&gt;',
	'"': '&quot;',
	"'": '&#39;'
};
export const escapeHTML = (s: string) => s.replace(/[&<>"']/g, (c) => ESC[c]);

const cache = new Map<string, string>();

export function tex(source: string, display = false): string {
	const key = `${display ? 'D' : 'I'}${source}`;
	let html = cache.get(key);
	if (html === undefined) {
		html = katex.renderToString(source, {
			displayMode: display,
			throwOnError: false,
			output: 'htmlAndMathml',
			strict: 'ignore'
		});
		if (cache.size > 2000) cache.clear();
		cache.set(key, html);
	}
	return html;
}

function inline(text: string, math: string[]): string {
	let s = escapeHTML(text);
	s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
	s = s.replace(/\*\*([^*]+?)\*\*/g, '<strong>$1</strong>');
	s = s.replace(/(^|[^*\w])\*([^*\s][^*]*?)\*(?!\w)/g, '$1<em>$2</em>');
	// restore math placeholders
	return s.replace(/(\d+)/g, (_, i) => math[Number(i)]);
}

/** Renders rich text to HTML. `inlineOnly` skips paragraph/list wrapping (for short labels). */
export function renderRich(source: string, inlineOnly = false): string {
	const math: string[] = [];
	// Extract math first so its content is never touched by markdown rules.
	let text = source.replace(/\$\$([\s\S]+?)\$\$/g, (_, m: string) => {
		math.push(tex(m.trim(), true));
		return `${math.length - 1}`;
	});
	text = text.replace(/(^|[^\\])\$([^$\n]+?)\$/g, (_, pre: string, m: string) => {
		math.push(tex(m, false));
		return `${pre}${math.length - 1}`;
	});
	text = text.replace(/\\\$/g, '$');

	if (inlineOnly) return inline(text, math);

	const blocks = text.split(/\n{2,}/);
	const out: string[] = [];
	for (const block of blocks) {
		const lines = block.split('\n');
		let para: string[] = [];
		let list: { ordered: boolean; items: string[] } | null = null;
		const flushPara = () => {
			if (para.length) out.push(`<p>${para.map((l) => inline(l, math)).join('<br>')}</p>`);
			para = [];
		};
		const flushList = () => {
			if (list) {
				const tag = list.ordered ? 'ol' : 'ul';
				out.push(
					`<${tag}>${list.items.map((i) => `<li>${inline(i, math)}</li>`).join('')}</${tag}>`
				);
			}
			list = null;
		};
		for (const raw of lines) {
			const line = raw.trimEnd();
			const bullet = /^\s*[-•]\s+(.*)$/.exec(line);
			const num = /^\s*\d+[.)]\s+(.*)$/.exec(line);
			if (bullet || num) {
				flushPara();
				const ordered = !bullet;
				if (!list || list.ordered !== ordered) {
					flushList();
					list = { ordered, items: [] };
				}
				list.items.push((bullet ?? num)![1]);
			} else if (line.trim() === '') {
				flushPara();
				flushList();
			} else if (list && /^\s{2,}/.test(raw)) {
				list.items[list.items.length - 1] += ' ' + line.trim();
			} else {
				flushList();
				para.push(line);
			}
		}
		flushPara();
		flushList();
	}
	return out.join('');
}
