/**
 * Reference catalog of schematic symbols: one entry per diagram component type, with bilingual
 * name, description and the differences between the IEC 60617 and ANSI/IEEE 315 drawings.
 * Drawings live in #lib/diagrams/SymbolShape.svelte.
 */
import type { ComponentType, LocalizedText } from '#learning';
import { COMPONENT_TYPES } from '#learning/domain/course.ts';
import { m } from '#lib/paraglide/messages.js';

export type SymbolCategory =
	'sources' | 'passive' | 'switching' | 'semiconductors' | 'loads' | 'wiring';

export const SYMBOL_CATEGORIES: SymbolCategory[] = [
	'sources',
	'passive',
	'switching',
	'semiconductors',
	'loads',
	'wiring'
];

export const categoryLabel: Record<SymbolCategory, () => string> = {
	sources: m.symbols_cat_sources,
	passive: m.symbols_cat_passive,
	switching: m.symbols_cat_switching,
	semiconductors: m.symbols_cat_semiconductors,
	loads: m.symbols_cat_loads,
	wiring: m.symbols_cat_wiring
};

export interface SymbolInfo {
	type: ComponentType;
	category: SymbolCategory;
	/** Usual reference-designator letter(s) on a schematic. */
	letter: string;
	name: LocalizedText;
	/** One sentence, used in tooltips and lists. */
	summary: LocalizedText;
	/** A short paragraph (rich text). */
	description: LocalizedText;
	/** How the IEC and ANSI drawings differ (or that they do not). */
	norms: LocalizedText;
	/** Drawn identically in both conventions. */
	same: boolean;
	/** Pin names of multi-terminal parts. */
	pins?: LocalizedText;
	/** Concepts this symbol supports (shown on the knowledge map). */
	conceptIds: string[];
}

type Entry = Omit<SymbolInfo, 'type'>;

const SAME: LocalizedText = {
	en: 'Drawn the same way in IEC and ANSI diagrams.',
	fr: 'Se dessine de la même façon en IEC et en ANSI.'
};

const ENTRIES: Record<ComponentType, Entry> = {
	// ───────────── Sources & references ─────────────
	dc_source: {
		category: 'sources',
		letter: 'V / G',
		name: { en: 'DC voltage source', fr: 'Source de tension continue' },
		summary: {
			en: 'Keeps a fixed voltage between its terminals, whatever the current.',
			fr: 'Maintient une tension fixe entre ses bornes, quel que soit le courant.'
		},
		description: {
			en: 'An **ideal voltage source** imposes a constant voltage (for example 12 V) between its two terminals. It models a laboratory power supply or, as a first approximation, a battery. The **+** terminal is marked.',
			fr: 'Une **source de tension idéale** impose une tension constante (par exemple 12 V) entre ses deux bornes. Elle modélise une alimentation de laboratoire ou, en première approximation, une pile. La borne **+** est indiquée.'
		},
		norms: {
			en: '**IEC**: a circle with a line running through it in the direction of the wire (an ideal voltage source behaves like a wire for current). **ANSI**: a circle with **+** and **−** inside. French textbooks often add an arrow showing the voltage E next to the symbol.',
			fr: '**IEC** : un cercle traversé par un trait dans le sens du fil (une source de tension idéale se comporte comme un fil pour le courant). **ANSI** : un cercle contenant **+** et **−**. Les manuels français ajoutent souvent une flèche indiquant la tension E à côté du symbole.'
		},
		same: false,
		conceptIds: ['dc.voltage', 'diagrams.symbols']
	},
	battery: {
		category: 'sources',
		letter: 'B / G',
		name: { en: 'Cell / battery', fr: 'Pile / batterie' },
		summary: {
			en: 'A chemical source of DC voltage: long line = +, short line = −.',
			fr: 'Source chimique de tension continue : trait long = +, trait court = −.'
		},
		description: {
			en: 'A **cell** converts chemical energy into electrical energy (about 1.5 V for an alkaline cell). Several cells in series form a **battery**. The **long thin line** is the **+** terminal, the **short thick line** the **−** terminal.',
			fr: 'Une **pile** (élément) convertit de l’énergie chimique en énergie électrique (environ 1,5 V pour une pile alcaline). Plusieurs éléments en série forment une **batterie**. Le **trait long et fin** est la borne **+**, le **trait court et épais** la borne **−**.'
		},
		norms: {
			en: 'Same principle in both conventions. ANSI diagrams often draw a multi-cell battery as several pairs of lines.',
			fr: 'Même principe dans les deux conventions. En ANSI, une batterie de plusieurs éléments est souvent dessinée avec plusieurs paires de traits.'
		},
		same: true,
		conceptIds: ['dc.voltage', 'diagrams.symbols', 'diagrams.closed_loop']
	},
	ac_source: {
		category: 'sources',
		letter: 'V / G',
		name: { en: 'AC voltage source', fr: 'Source de tension alternative' },
		summary: {
			en: 'A voltage that alternates in sign, like the mains supply.',
			fr: 'Une tension qui change de signe périodiquement, comme le secteur.'
		},
		description: {
			en: 'An **alternating (AC) source** produces a sinusoidal voltage, for example the 230 V / 50 Hz mains in Europe or 120 V / 60 Hz in North America. The sine wave inside the circle identifies it.',
			fr: 'Une **source alternative** produit une tension sinusoïdale, par exemple le secteur 230 V / 50 Hz en Europe ou 120 V / 60 Hz en Amérique du Nord. La sinusoïde dans le cercle permet de la reconnaître.'
		},
		norms: SAME,
		same: true,
		conceptIds: []
	},
	current_source: {
		category: 'sources',
		letter: 'I / G',
		name: { en: 'Current source', fr: 'Source de courant' },
		summary: {
			en: 'Pushes a fixed current through the circuit, whatever the voltage.',
			fr: 'Impose un courant fixe dans le circuit, quelle que soit la tension.'
		},
		description: {
			en: 'An **ideal current source** delivers a constant current and lets the voltage adjust to the load. It is mostly used in circuit analysis and to model transistor outputs.',
			fr: 'Une **source de courant idéale** fournit un courant constant et laisse la tension s’adapter à la charge. On l’utilise surtout en analyse de circuits et pour modéliser la sortie des transistors.'
		},
		norms: {
			en: '**IEC**: a circle crossed by a line **perpendicular** to the wire (an ideal current source behaves like a break for voltage), usually with an arrow alongside for the direction. **ANSI**: a circle with an **arrow inside** showing the current direction.',
			fr: '**IEC** : un cercle barré d’un trait **perpendiculaire** au fil (une source de courant idéale se comporte comme une coupure), avec en général une flèche à côté pour le sens. **ANSI** : un cercle avec une **flèche à l’intérieur** indiquant le sens du courant.'
		},
		same: false,
		conceptIds: ['dc.current']
	},
	ground: {
		category: 'sources',
		letter: '—',
		name: { en: 'Ground / earth', fr: 'Masse / terre' },
		summary: {
			en: 'The common 0 V reference; all ground symbols are connected together.',
			fr: 'La référence commune 0 V ; tous les symboles de masse sont reliés entre eux.'
		},
		description: {
			en: 'The **ground** symbol marks the point taken as **0 V**: other voltages are measured from it. Every ground symbol in a diagram is connected to the others, even without a drawn wire. In mains installations, **earth** is the protective connection to the soil.',
			fr: 'Le symbole de **masse** repère le point pris comme **0 V** : les autres tensions sont mesurées par rapport à lui. Tous les symboles de masse d’un schéma sont reliés entre eux, même sans fil dessiné. Dans les installations secteur, la **terre** est la liaison de protection avec le sol.'
		},
		norms: SAME,
		same: true,
		conceptIds: ['dc.ground_reference', 'diagrams.symbols']
	},
	chassis_ground: {
		category: 'sources',
		letter: '—',
		name: { en: 'Chassis ground', fr: 'Masse châssis' },
		summary: {
			en: 'Connection to the metal frame or case of the equipment.',
			fr: 'Liaison au châssis ou au boîtier métallique de l’appareil.'
		},
		description: {
			en: 'The **chassis** (frame) symbol shows a connection to the metal case of a device. It is often, but not always, at the same potential as the circuit ground.',
			fr: 'Le symbole de **masse châssis** indique une liaison au boîtier métallique d’un appareil. Il est souvent, mais pas toujours, au même potentiel que la masse du circuit.'
		},
		norms: SAME,
		same: true,
		conceptIds: ['dc.ground_reference']
	},

	// ───────────── Passive components ─────────────
	resistor: {
		category: 'passive',
		letter: 'R',
		name: { en: 'Resistor', fr: 'Résistance' },
		summary: {
			en: 'Opposes current with a fixed resistance, in ohms (Ω).',
			fr: 'S’oppose au passage du courant avec une résistance fixe, en ohms (Ω).'
		},
		description: {
			en: 'A **resistor** limits current and turns electrical energy into heat. Its value is in **ohms (Ω)**, for example 330 Ω or 4.7 kΩ. It follows Ohm’s law: $U = R \\cdot I$.',
			fr: 'Une **résistance** limite le courant et transforme l’énergie électrique en chaleur. Sa valeur est en **ohms (Ω)**, par exemple 330 Ω ou 4,7 kΩ. Elle suit la loi d’Ohm : $U = R \\cdot I$.'
		},
		norms: {
			en: '**IEC**: an empty **rectangle**. **ANSI**: a **zigzag** line.',
			fr: '**IEC** : un **rectangle** vide. **ANSI** : une ligne en **zigzag**.'
		},
		same: false,
		conceptIds: [
			'diagrams.symbols',
			'dc.resistance',
			'dc.ohms_law',
			'resistors.series',
			'resistors.parallel'
		]
	},
	variable_resistor: {
		category: 'passive',
		letter: 'R',
		name: { en: 'Variable resistor (rheostat)', fr: 'Résistance variable (rhéostat)' },
		summary: {
			en: 'A resistor whose value can be adjusted.',
			fr: 'Une résistance dont la valeur est réglable.'
		},
		description: {
			en: 'A **variable resistor** has an adjustable value; the diagonal arrow means “adjustable”. A rheostat is used in series to vary a current, for example to dim a lamp.',
			fr: 'Une **résistance variable** a une valeur réglable ; la flèche en diagonale signifie « réglable ». Un rhéostat se branche en série pour faire varier un courant, par exemple pour régler une lampe.'
		},
		norms: {
			en: 'Same arrow in both conventions, drawn across the resistor body: a rectangle in **IEC**, a zigzag in **ANSI**.',
			fr: 'Même flèche dans les deux conventions, tracée à travers le corps de la résistance : un rectangle en **IEC**, un zigzag en **ANSI**.'
		},
		same: false,
		conceptIds: ['dc.resistance']
	},
	potentiometer: {
		category: 'passive',
		letter: 'R / RV',
		name: { en: 'Potentiometer', fr: 'Potentiomètre' },
		summary: {
			en: 'A resistor with a sliding third contact (wiper): an adjustable voltage divider.',
			fr: 'Une résistance avec un troisième contact mobile (curseur) : un diviseur de tension réglable.'
		},
		description: {
			en: 'A **potentiometer** has three terminals: both ends of a resistive track and a **wiper** that slides along it. Between one end and the wiper you get an adjustable fraction of the voltage, as in a volume knob.',
			fr: 'Un **potentiomètre** a trois bornes : les deux extrémités d’une piste résistive et un **curseur** qui glisse dessus. Entre une extrémité et le curseur, on obtient une fraction réglable de la tension, comme dans un bouton de volume.'
		},
		norms: {
			en: 'An arrow (the wiper) points at the resistor body: a rectangle in **IEC**, a zigzag in **ANSI**.',
			fr: 'Une flèche (le curseur) pointe vers le corps de la résistance : un rectangle en **IEC**, un zigzag en **ANSI**.'
		},
		same: false,
		pins: {
			en: 'a, b: ends of the track · w: wiper',
			fr: 'a, b : extrémités de la piste · w : curseur'
		},
		conceptIds: ['resistors.series']
	},
	ldr: {
		category: 'passive',
		letter: 'R',
		name: { en: 'Light-dependent resistor (LDR)', fr: 'Photorésistance (LDR)' },
		summary: {
			en: 'Its resistance drops when light falls on it.',
			fr: 'Sa résistance diminue quand elle est éclairée.'
		},
		description: {
			en: 'A **photoresistor** goes from several hundred kΩ in the dark to a few hundred Ω in bright light. It is used in twilight switches and light sensors. The two arrows show light **arriving**.',
			fr: 'Une **photorésistance** passe de plusieurs centaines de kΩ dans le noir à quelques centaines d’Ω en pleine lumière. On l’utilise dans les interrupteurs crépusculaires et les capteurs de lumière. Les deux flèches indiquent la lumière **reçue**.'
		},
		norms: {
			en: 'Arrows pointing in, on a rectangle (**IEC**) or a zigzag (**ANSI**). Some IEC drawings also put the body inside a circle.',
			fr: 'Flèches entrantes, sur un rectangle (**IEC**) ou un zigzag (**ANSI**). Certains schémas IEC entourent aussi le corps d’un cercle.'
		},
		same: false,
		conceptIds: []
	},
	capacitor: {
		category: 'passive',
		letter: 'C',
		name: { en: 'Capacitor', fr: 'Condensateur' },
		summary: {
			en: 'Two plates separated by an insulator: stores charge, blocks steady DC.',
			fr: 'Deux armatures séparées par un isolant : stocke des charges, bloque le continu établi.'
		},
		description: {
			en: 'A **capacitor** stores electric charge on two plates separated by an insulator. Its capacitance is in **farads (F)**, usually µF, nF or pF. Once charged it lets no steady direct current through.',
			fr: 'Un **condensateur** stocke des charges électriques sur deux armatures séparées par un isolant. Sa capacité s’exprime en **farads (F)**, généralement en µF, nF ou pF. Une fois chargé, il ne laisse plus passer de courant continu.'
		},
		norms: SAME,
		same: true,
		conceptIds: []
	},
	polarized_capacitor: {
		category: 'passive',
		letter: 'C',
		name: {
			en: 'Polarized (electrolytic) capacitor',
			fr: 'Condensateur polarisé (électrolytique)'
		},
		summary: {
			en: 'A high-value capacitor that must be connected the right way round.',
			fr: 'Un condensateur de forte valeur qui doit être branché dans le bon sens.'
		},
		description: {
			en: 'An **electrolytic capacitor** offers large capacitances (µF to mF) but is **polarized**: the **+** terminal must stay at the higher voltage. Reversed, it can overheat or burst.',
			fr: 'Un **condensateur électrolytique** offre de fortes capacités (µF à mF) mais il est **polarisé** : la borne **+** doit rester au potentiel le plus élevé. Inversé, il peut chauffer ou éclater.'
		},
		norms: {
			en: '**IEC**: one plate drawn as a **filled (or hollow) rectangle**, with a **+**. **ANSI**: one **curved** plate, with a **+** on the straight plate.',
			fr: '**IEC** : une armature dessinée comme un **rectangle plein (ou creux)**, avec un **+**. **ANSI** : une armature **courbe**, avec un **+** du côté de l’armature droite.'
		},
		same: false,
		conceptIds: []
	},
	inductor: {
		category: 'passive',
		letter: 'L',
		name: { en: 'Inductor (coil)', fr: 'Bobine (inductance)' },
		summary: {
			en: 'A coil of wire that opposes changes in current.',
			fr: 'Un enroulement de fil qui s’oppose aux variations du courant.'
		},
		description: {
			en: 'An **inductor** stores energy in a magnetic field. Its inductance is in **henries (H)**. It lets steady DC through freely but resists rapid changes of current.',
			fr: 'Une **bobine** stocke de l’énergie dans un champ magnétique. Son inductance s’exprime en **henrys (H)**. Elle laisse passer le continu établi mais s’oppose aux variations rapides du courant.'
		},
		norms: {
			en: 'Both current conventions draw a row of **half-circles**. Older German/Austrian (DIN) diagrams use a **filled black rectangle** instead.',
			fr: 'Les deux conventions actuelles dessinent une suite de **demi-cercles**. Les anciens schémas allemands/autrichiens (DIN) utilisent à la place un **rectangle noir plein**.'
		},
		same: true,
		conceptIds: []
	},
	transformer: {
		category: 'passive',
		letter: 'T',
		name: { en: 'Transformer', fr: 'Transformateur' },
		summary: {
			en: 'Two coupled coils that step an AC voltage up or down.',
			fr: 'Deux bobines couplées qui élèvent ou abaissent une tension alternative.'
		},
		description: {
			en: 'A **transformer** has a primary and a secondary winding on a shared core. The voltage ratio equals the turns ratio, for example 230 V → 12 V. It only works with **alternating** current.',
			fr: 'Un **transformateur** a un enroulement primaire et un secondaire sur un même noyau. Le rapport des tensions est égal au rapport du nombre de spires, par exemple 230 V → 12 V. Il ne fonctionne qu’en **alternatif**.'
		},
		norms: {
			en: '**IEC**: two **overlapping circles**. **ANSI**: two **coils** facing each other with **parallel lines** between them for the iron core.',
			fr: '**IEC** : deux **cercles qui se chevauchent**. **ANSI** : deux **bobines** face à face séparées par des **traits parallèles** représentant le noyau de fer.'
		},
		same: false,
		pins: {
			en: 'p1, p2: primary · s1, s2: secondary',
			fr: 'p1, p2 : primaire · s1, s2 : secondaire'
		},
		conceptIds: []
	},

	// ───────────── Switching & protection ─────────────
	switch: {
		category: 'switching',
		letter: 'S',
		name: { en: 'Switch', fr: 'Interrupteur' },
		summary: {
			en: 'Opens (gap, no current) or closes (current flows) the circuit.',
			fr: 'Ouvre (coupure, pas de courant) ou ferme (le courant passe) le circuit.'
		},
		description: {
			en: 'A **switch** is a contact you operate by hand. **Open**, the blade is lifted and no current flows; **closed**, it behaves like a wire. Diagrams normally show switches open (at rest).',
			fr: 'Un **interrupteur** est un contact que l’on actionne à la main. **Ouvert**, la lame est levée et aucun courant ne passe ; **fermé**, il se comporte comme un fil. Les schémas représentent normalement les interrupteurs ouverts (au repos).'
		},
		norms: {
			en: '**IEC**: a tilted blade between two plain lines. **ANSI**: the same blade between two **small circles** (the terminals).',
			fr: '**IEC** : une lame inclinée entre deux traits simples. **ANSI** : la même lame entre deux **petits cercles** (les bornes).'
		},
		same: false,
		conceptIds: ['diagrams.symbols', 'diagrams.closed_loop', 'circuits.open_short']
	},
	push_button: {
		category: 'switching',
		letter: 'S',
		name: { en: 'Push button (normally open)', fr: 'Bouton-poussoir (contact NO)' },
		summary: {
			en: 'Closes the circuit only while it is pressed.',
			fr: 'Ferme le circuit uniquement tant qu’on appuie dessus.'
		},
		description: {
			en: 'A **push button** springs back when released. A **normally open (NO)** button conducts only while pressed, like a doorbell button.',
			fr: 'Un **bouton-poussoir** revient en place quand on le relâche. Un poussoir **à fermeture (NO)** ne conduit que tant qu’on appuie, comme un bouton de sonnette.'
		},
		norms: {
			en: '**IEC**: a switch blade with a **dashed line** to a small push head. **ANSI**: a **bar** above two terminal circles, pushed down to bridge them.',
			fr: '**IEC** : une lame d’interrupteur reliée par un **trait pointillé** à une tête de poussoir. **ANSI** : une **barre** au-dessus de deux petits cercles, qu’on enfonce pour les relier.'
		},
		same: false,
		conceptIds: []
	},
	relay_coil: {
		category: 'switching',
		letter: 'K',
		name: { en: 'Relay coil', fr: 'Bobine de relais' },
		summary: {
			en: 'An electromagnet that switches separate contacts when energised.',
			fr: 'Un électroaimant qui actionne des contacts séparés quand il est alimenté.'
		},
		description: {
			en: 'A **relay** lets a small current (through the coil) switch a larger, separate circuit (through its contacts). The coil and its contacts share the same label, for example K1.',
			fr: 'Un **relais** permet à un petit courant (dans la bobine) de commuter un autre circuit plus puissant (par ses contacts). La bobine et ses contacts portent le même repère, par exemple K1.'
		},
		norms: {
			en: '**IEC**: a **rectangle**. **ANSI**: a **circle** (often labelled CR in ladder diagrams).',
			fr: '**IEC** : un **rectangle**. **ANSI** : un **cercle** (souvent repéré CR dans les schémas à contacts).'
		},
		same: false,
		conceptIds: []
	},
	fuse: {
		category: 'switching',
		letter: 'F',
		name: { en: 'Fuse', fr: 'Fusible' },
		summary: {
			en: 'Melts and opens the circuit when the current is too high.',
			fr: 'Fond et ouvre le circuit quand le courant est trop fort.'
		},
		description: {
			en: 'A **fuse** protects wiring and devices: if the current exceeds its rating (for example 2 A) for too long, its thin wire melts and the circuit opens. It must be replaced by one of the **same rating**.',
			fr: 'Un **fusible** protège les fils et les appareils : si le courant dépasse son calibre (par exemple 2 A) trop longtemps, son fil fin fond et le circuit s’ouvre. On le remplace par un fusible de **même calibre**.'
		},
		norms: {
			en: '**IEC**: a **rectangle with a line through it**. **ANSI**: an **S-shaped curve** in the wire (a rectangle is also accepted).',
			fr: '**IEC** : un **rectangle traversé d’un trait**. **ANSI** : une **courbe en S** sur le fil (le rectangle est aussi admis).'
		},
		same: false,
		conceptIds: ['safety.low_voltage', 'circuits.open_short']
	},

	// ───────────── Semiconductors ─────────────
	diode: {
		category: 'semiconductors',
		letter: 'D',
		name: { en: 'Diode', fr: 'Diode' },
		summary: {
			en: 'Lets current through in one direction only (arrow = conventional current).',
			fr: 'Ne laisse passer le courant que dans un sens (flèche = sens conventionnel).'
		},
		description: {
			en: 'A **diode** conducts from **anode** (triangle side) to **cathode** (bar side) and blocks the other way. A silicon diode drops about 0.6–0.7 V when conducting.',
			fr: 'Une **diode** conduit de l’**anode** (côté triangle) vers la **cathode** (côté barre) et bloque dans l’autre sens. Une diode au silicium présente environ 0,6–0,7 V quand elle conduit.'
		},
		norms: SAME,
		same: true,
		conceptIds: []
	},
	led: {
		category: 'semiconductors',
		letter: 'D / LED',
		name: { en: 'Light-emitting diode (LED)', fr: 'Diode électroluminescente (LED)' },
		summary: {
			en: 'A diode that lights up when current flows forward; arrows point out.',
			fr: 'Une diode qui s’allume quand le courant passe dans le sens direct ; flèches sortantes.'
		},
		description: {
			en: 'An **LED** emits light when forward-biased (about 2 V for red, 3 V for blue or white). It always needs a **series resistor** to limit its current to a few mA. The arrows show light **leaving**.',
			fr: 'Une **LED** émet de la lumière quand elle est polarisée en direct (environ 2 V pour une rouge, 3 V pour une bleue ou blanche). Elle a toujours besoin d’une **résistance en série** pour limiter son courant à quelques mA. Les flèches indiquent la lumière **émise**.'
		},
		norms: SAME,
		same: true,
		conceptIds: ['diagrams.symbols']
	},
	zener: {
		category: 'semiconductors',
		letter: 'D / Z',
		name: { en: 'Zener diode', fr: 'Diode Zener' },
		summary: {
			en: 'Conducts in reverse at a precise voltage: used as a voltage reference.',
			fr: 'Conduit en inverse à une tension précise : sert de référence de tension.'
		},
		description: {
			en: 'A **Zener diode** behaves like an ordinary diode forwards, but in reverse it starts conducting at its **Zener voltage** (for example 5.1 V) and holds that voltage. It is used to regulate or limit a voltage.',
			fr: 'Une **diode Zener** se comporte comme une diode ordinaire en direct, mais en inverse elle se met à conduire à sa **tension Zener** (par exemple 5,1 V) et maintient cette tension. On l’utilise pour réguler ou limiter une tension.'
		},
		norms: {
			en: '**IEC**: the cathode bar has **one bent end**. **ANSI**: both ends bent, forming a **Z**.',
			fr: '**IEC** : la barre de cathode a **une seule extrémité recourbée**. **ANSI** : les deux extrémités recourbées, formant un **Z**.'
		},
		same: false,
		conceptIds: []
	},
	photodiode: {
		category: 'semiconductors',
		letter: 'D',
		name: { en: 'Photodiode', fr: 'Photodiode' },
		summary: {
			en: 'A diode whose reverse current depends on the light received; arrows point in.',
			fr: 'Une diode dont le courant inverse dépend de la lumière reçue ; flèches entrantes.'
		},
		description: {
			en: 'A **photodiode** is used in reverse: light creates a small current proportional to its intensity. It is found in remote-control receivers and light meters. The arrows show light **arriving**.',
			fr: 'Une **photodiode** s’utilise en inverse : la lumière crée un petit courant proportionnel à son intensité. On la trouve dans les récepteurs de télécommande et les luxmètres. Les flèches indiquent la lumière **reçue**.'
		},
		norms: SAME,
		same: true,
		conceptIds: []
	},
	npn: {
		category: 'semiconductors',
		letter: 'Q / T',
		name: { en: 'NPN bipolar transistor', fr: 'Transistor bipolaire NPN' },
		summary: {
			en: 'A small base current controls a larger collector current; arrow points out.',
			fr: 'Un petit courant de base commande un courant de collecteur plus fort ; flèche sortante.'
		},
		description: {
			en: 'In an **NPN transistor**, a small current into the **base** lets a current about β times larger (often 100×) flow from **collector** to **emitter**. It is used as an amplifier or as an electronic switch. The emitter arrow points **out** (“Not Pointing iN”).',
			fr: 'Dans un **transistor NPN**, un petit courant entrant dans la **base** permet à un courant environ β fois plus grand (souvent 100×) de circuler du **collecteur** vers l’**émetteur**. On l’utilise comme amplificateur ou comme interrupteur électronique. La flèche de l’émetteur est **sortante**.'
		},
		norms: {
			en: 'Same internal drawing. **ANSI** diagrams nearly always draw the **circle** (the case); **IEC** diagrams usually leave it out.',
			fr: 'Même dessin intérieur. Les schémas **ANSI** dessinent presque toujours le **cercle** (le boîtier) ; les schémas **IEC** l’omettent généralement.'
		},
		same: false,
		pins: {
			en: 'b: base · c: collector · e: emitter',
			fr: 'b : base · c : collecteur · e : émetteur'
		},
		conceptIds: []
	},
	pnp: {
		category: 'semiconductors',
		letter: 'Q / T',
		name: { en: 'PNP bipolar transistor', fr: 'Transistor bipolaire PNP' },
		summary: {
			en: 'The complement of the NPN: current flows emitter → collector; arrow points in.',
			fr: 'Le complément du NPN : le courant va de l’émetteur au collecteur ; flèche entrante.'
		},
		description: {
			en: 'A **PNP transistor** works like an NPN with all polarities reversed: a small current **out of** the base lets current flow from **emitter** to **collector**. It is often used to switch the positive supply side. The emitter arrow points **in**.',
			fr: 'Un **transistor PNP** fonctionne comme un NPN avec toutes les polarités inversées : un petit courant **sortant** de la base laisse passer le courant de l’**émetteur** vers le **collecteur**. On l’utilise souvent pour commuter le côté positif de l’alimentation. La flèche de l’émetteur est **entrante**.'
		},
		norms: {
			en: 'Same internal drawing. **ANSI** usually draws the **circle**; **IEC** usually leaves it out.',
			fr: 'Même dessin intérieur. L’**ANSI** dessine généralement le **cercle** ; l’**IEC** l’omet en général.'
		},
		same: false,
		pins: {
			en: 'b: base · c: collector · e: emitter',
			fr: 'b : base · c : collecteur · e : émetteur'
		},
		conceptIds: []
	},
	nmos: {
		category: 'semiconductors',
		letter: 'Q / T',
		name: { en: 'N-channel MOSFET', fr: 'MOSFET canal N' },
		summary: {
			en: 'A voltage on the gate switches a current from drain to source.',
			fr: 'Une tension sur la grille commande un courant du drain vers la source.'
		},
		description: {
			en: 'A **MOSFET** is controlled by **voltage**, not current: the **gate** is insulated. For an N-channel enhancement MOSFET, a gate voltage a few volts above the source turns the drain–source channel on. It is the usual switch for motors and LEDs driven by a microcontroller.',
			fr: 'Un **MOSFET** se commande en **tension**, pas en courant : la **grille** est isolée. Pour un MOSFET canal N à enrichissement, une tension de grille de quelques volts au-dessus de la source rend le canal drain–source conducteur. C’est l’interrupteur habituel des moteurs et LED pilotés par un microcontrôleur.'
		},
		norms: {
			en: 'Same internal drawing (broken channel line = enhancement mode, arrow **in** = N-channel). **ANSI** usually adds the **circle**.',
			fr: 'Même dessin intérieur (canal en pointillé = enrichissement, flèche **entrante** = canal N). L’**ANSI** ajoute généralement le **cercle**.'
		},
		same: false,
		pins: { en: 'g: gate · d: drain · s: source', fr: 'g : grille · d : drain · s : source' },
		conceptIds: []
	},
	pmos: {
		category: 'semiconductors',
		letter: 'Q / T',
		name: { en: 'P-channel MOSFET', fr: 'MOSFET canal P' },
		summary: {
			en: 'The complement of the N-channel MOSFET: turned on by a gate below the source.',
			fr: 'Le complément du MOSFET canal N : passant quand la grille est sous la source.'
		},
		description: {
			en: 'A **P-channel MOSFET** conducts when its gate is several volts **below** its source. It is typically placed between the positive supply and a load (“high-side switch”).',
			fr: 'Un **MOSFET canal P** conduit quand sa grille est plusieurs volts **en dessous** de sa source. On le place typiquement entre l’alimentation positive et la charge (« commutation côté haut »).'
		},
		norms: {
			en: 'Same internal drawing with the arrow pointing **out**. **ANSI** usually adds the **circle**.',
			fr: 'Même dessin intérieur avec la flèche **sortante**. L’**ANSI** ajoute généralement le **cercle**.'
		},
		same: false,
		pins: { en: 'g: gate · d: drain · s: source', fr: 'g : grille · d : drain · s : source' },
		conceptIds: []
	},
	opamp: {
		category: 'semiconductors',
		letter: 'U / IC',
		name: { en: 'Operational amplifier', fr: 'Amplificateur opérationnel' },
		summary: {
			en: 'Amplifies the difference between its + and − inputs by a very large factor.',
			fr: 'Amplifie très fortement la différence entre ses entrées + et −.'
		},
		description: {
			en: 'An **op-amp** has an inverting input (**−**), a non-inverting input (**+**) and an output. With feedback resistors it builds amplifiers, comparators and filters. Its supply pins are often left off the diagram.',
			fr: 'Un **AOP** a une entrée inverseuse (**−**), une entrée non inverseuse (**+**) et une sortie. Avec des résistances de contre-réaction, il permet de réaliser amplificateurs, comparateurs et filtres. Ses broches d’alimentation sont souvent omises sur le schéma.'
		},
		norms: {
			en: '**IEC**: a **rectangle** containing a small triangle and **∞** (infinite gain). **ANSI**: a large **triangle** pointing at the output.',
			fr: '**IEC** : un **rectangle** contenant un petit triangle et **∞** (gain infini). **ANSI** : un grand **triangle** pointant vers la sortie.'
		},
		same: false,
		pins: {
			en: 'inn: inverting input (−) · inp: non-inverting input (+) · out: output',
			fr: 'inn : entrée inverseuse (−) · inp : entrée non inverseuse (+) · out : sortie'
		},
		conceptIds: []
	},

	// ───────────── Loads & measurement ─────────────
	lamp: {
		category: 'loads',
		letter: 'L / E / H',
		name: { en: 'Lamp (bulb)', fr: 'Lampe (ampoule)' },
		summary: {
			en: 'Turns electrical energy into light (and heat).',
			fr: 'Transforme l’énergie électrique en lumière (et en chaleur).'
		},
		description: {
			en: 'An incandescent **lamp** glows because its filament is heated by the current. In a circuit it behaves roughly like a resistor; it lights only if it is part of a **closed loop**.',
			fr: 'Une **lampe** à incandescence brille parce que son filament est chauffé par le courant. Dans un circuit, elle se comporte à peu près comme une résistance ; elle ne s’allume que si elle fait partie d’une **boucle fermée**.'
		},
		norms: {
			en: '**IEC**: a **circle with a cross** inside. **ANSI**: a circle with the **filament loop** drawn inside (the circle with a cross is also used for indicator lamps).',
			fr: '**IEC** : un **cercle avec une croix**. **ANSI** : un cercle avec la **boucle du filament** dessinée à l’intérieur (le cercle avec une croix sert aussi pour les voyants).'
		},
		same: false,
		conceptIds: ['diagrams.symbols', 'diagrams.closed_loop', 'dc.power']
	},
	motor: {
		category: 'loads',
		letter: 'M',
		name: { en: 'Motor', fr: 'Moteur' },
		summary: {
			en: 'Turns electrical energy into rotation.',
			fr: 'Transforme l’énergie électrique en rotation.'
		},
		description: {
			en: 'A **motor** converts electrical energy into mechanical energy. A small DC motor reverses direction when its polarity is reversed.',
			fr: 'Un **moteur** convertit l’énergie électrique en énergie mécanique. Un petit moteur à courant continu change de sens de rotation quand on inverse sa polarité.'
		},
		norms: SAME,
		same: true,
		conceptIds: ['dc.power', 'dc.energy']
	},
	meter_v: {
		category: 'loads',
		letter: 'P / V',
		name: { en: 'Voltmeter', fr: 'Voltmètre' },
		summary: {
			en: 'Measures voltage; connected in parallel, across the part.',
			fr: 'Mesure une tension ; se branche en parallèle, aux bornes du composant.'
		},
		description: {
			en: 'A **voltmeter** measures the voltage between two points. It is connected **in parallel** with the part being measured and draws almost no current (very high internal resistance).',
			fr: 'Un **voltmètre** mesure la tension entre deux points. Il se branche **en dérivation** (en parallèle) sur le composant mesuré et ne consomme presque aucun courant (résistance interne très élevée).'
		},
		norms: SAME,
		same: true,
		conceptIds: ['measure.multimeter', 'dc.voltage']
	},
	meter_a: {
		category: 'loads',
		letter: 'P / A',
		name: { en: 'Ammeter', fr: 'Ampèremètre' },
		summary: {
			en: 'Measures current; connected in series, in the loop.',
			fr: 'Mesure un courant ; se branche en série, dans la boucle.'
		},
		description: {
			en: 'An **ammeter** measures the current flowing through a branch. The circuit must be opened to insert it **in series**. Its resistance is very low: never connect it directly across a source.',
			fr: 'Un **ampèremètre** mesure le courant qui traverse une branche. Il faut ouvrir le circuit pour l’insérer **en série**. Sa résistance est très faible : ne jamais le brancher directement aux bornes d’une source.'
		},
		norms: SAME,
		same: true,
		conceptIds: ['measure.multimeter', 'dc.current']
	},
	meter_ohm: {
		category: 'loads',
		letter: 'P / Ω',
		name: { en: 'Ohmmeter', fr: 'Ohmmètre' },
		summary: {
			en: 'Measures resistance; only on an unpowered component.',
			fr: 'Mesure une résistance ; uniquement sur un composant hors tension.'
		},
		description: {
			en: 'An **ohmmeter** injects a small current of its own to measure a resistance. The component must be **unpowered** and ideally removed from the circuit, otherwise other paths distort the reading.',
			fr: 'Un **ohmmètre** injecte son propre petit courant pour mesurer une résistance. Le composant doit être **hors tension** et idéalement retiré du circuit, sinon les autres chemins faussent la mesure.'
		},
		norms: SAME,
		same: true,
		conceptIds: ['measure.multimeter', 'dc.resistance']
	},

	// ───────────── Wiring ─────────────
	node: {
		category: 'wiring',
		letter: '—',
		name: { en: 'Junction (node)', fr: 'Nœud (jonction)' },
		summary: {
			en: 'A dot where wires are connected; crossing wires without a dot are not.',
			fr: 'Un point où des fils sont reliés ; des fils qui se croisent sans point ne le sont pas.'
		},
		description: {
			en: 'A **junction dot** shows that the wires meeting there are electrically connected: they form one **node**, at the same potential. Two wires that cross **without a dot** are not connected.',
			fr: 'Un **point de jonction** indique que les fils qui s’y rejoignent sont reliés électriquement : ils forment un seul **nœud**, au même potentiel. Deux fils qui se croisent **sans point** ne sont pas reliés.'
		},
		norms: {
			en: 'Same dot in both conventions. Older ANSI drawings marked a crossing without connection with a small **hop** (half-circle).',
			fr: 'Même point dans les deux conventions. Les anciens schémas ANSI marquaient un croisement sans connexion par un petit **pont** (demi-cercle).'
		},
		same: true,
		conceptIds: ['diagrams.symbols', 'resistors.parallel']
	}
};

export const SYMBOLS: SymbolInfo[] = COMPONENT_TYPES.map((type) => ({ type, ...ENTRIES[type] }));

const BY_TYPE = new Map(SYMBOLS.map((s) => [s.type, s]));

export function symbolInfo(type: ComponentType): SymbolInfo {
	return BY_TYPE.get(type)!;
}

export function isSymbolType(value: string | null | undefined): value is ComponentType {
	return !!value && BY_TYPE.has(value as ComponentType);
}
