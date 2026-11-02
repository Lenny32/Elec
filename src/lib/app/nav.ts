/** Primary navigation model shared by the sidebar, the mobile drawer and the command palette. */
import { m } from '#lib/paraglide/messages.js';
import type { IconName } from '#lib/ui/Icon.svelte';
import type { RouteId } from '$app/types';

export interface NavItem {
	route:
		| '/'
		| '/course'
		| '/review'
		| '/exams'
		| '/lab'
		| '/formulas'
		| '/symbols'
		| '/map'
		| '/profile'
		| '/settings';
	label: () => string;
	icon: IconName;
	/** Route ids (prefixes) that highlight this item. */
	match: string[];
}

export const NAV_WORKSPACE: NavItem[] = [
	{ route: '/', label: m.nav_today, icon: 'home', match: [] },
	{
		route: '/course',
		label: m.nav_course,
		icon: 'book',
		match: ['/course', '/lesson', '/practice']
	},
	{ route: '/review', label: m.nav_review, icon: 'refresh', match: ['/review'] },
	{ route: '/exams', label: m.nav_exams, icon: 'exam', match: ['/exams'] }
];

export const NAV_EXPLORE: NavItem[] = [
	{ route: '/lab', label: m.lab_title, icon: 'flask', match: ['/lab'] },
	{ route: '/formulas', label: m.nav_formulas, icon: 'formula', match: ['/formulas'] },
	{ route: '/symbols', label: m.nav_symbols, icon: 'symbols', match: ['/symbols'] },
	{ route: '/map', label: m.nav_map, icon: 'map', match: ['/map'] },
	{ route: '/profile', label: m.nav_progress, icon: 'progress', match: ['/profile', '/history'] }
];

export const NAV_SETTINGS: NavItem = {
	route: '/settings',
	label: m.nav_settings,
	icon: 'settings',
	match: ['/settings']
};

export const ALL_NAV = [...NAV_WORKSPACE, ...NAV_EXPLORE, NAV_SETTINGS];

export function isActive(item: NavItem, routeId: RouteId | null): boolean {
	if (!routeId) return false;
	if (item.route === '/') return routeId === '/';
	return item.match.some((p) => routeId === p || routeId.startsWith(`${p}/`));
}

export function activeItem(routeId: RouteId | null): NavItem | undefined {
	return ALL_NAV.find((i) => isActive(i, routeId));
}
