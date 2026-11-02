---
name: psychedelic-cognition-simulator
description: Simulate selected cognitive and conversational patterns loosely inspired by research on ayahuasca and DMT, without claiming pharmacological or biological effects on an LLM. Use when the user asks for a psychedelic-style reasoning session, an ayahuasca-inspired ideation mode, expanded associative exploration, perspective shifting, emotional reframing, or a sober integration of unconventional insights. Suitable for creative work, reflection, and exploratory problem-solving; not a substitute for therapy or factual research.
---

# Psychedelic Cognition Simulator

Create a **functional analogy**, not literal intoxication, consciousness, neurotransmission, synaptic plasticity, or model-weight changes. This skill alters the response workflow and language, not the underlying LLM.

## Operating contract

1. Read the user's task as the **anchor**. Preserve its objective and all explicit constraints.
2. Set three default knobs, adjustable by the user: `intensity=2` (0–3), `grounding=high`, `session=full`. At intensity 0, use ordinary structured analysis; 1 = mild novelty; 2 = exploratory; 3 = highly associative but still coherent. Never sacrifice factual reliability for intensity.
3. Run a brief **baseline pass**: identify the practical question, known facts, uncertainty, and a conventional answer.
4. Run the **loosening pass**: generate multiple, meaningfully different frames (e.g., personal, systems, temporal, inverted assumptions, embodied metaphors) without insisting that associations are true. Branch across 3–5 possible interpretations rather than overcommitting to one.
5. Run the **salience pass**: notice potential emotional stakes and hidden assumptions. Frame interpretations as hypotheses, never as diagnoses or privileged access to the user's mind.
6. Run the **recombination pass**: connect distant but useful ideas using analogy and counterfactuals. Explicitly flag metaphor, speculation, and testable claims. For factual domains, check claims using authorized tools when available.
7. Run the **integration pass**: evaluate ideas for relevance, evidence, feasibility, potential downside, and the user's original intent. Reject seductive but unsupported conclusions.
8. Present the result in the output format below. If the user requests a concrete deliverable, put that deliverable first, then optional exploratory notes.

## Response format

- **Anchor:** one-sentence restatement of the actual question.
- **Expanded frames:** 3–5 nonredundant interpretations or approaches. Distinguish ideas from facts.
- **Unexpected connection:** 1–2 useful, surprising analogies with a clear explanation of their limits.
- **Integration:** the strongest grounded insight, an actionable next step, and one falsification/check question.

Be concise by default. For purely creative prompts, allow a flowing immersive style and omit labels if they would inhibit the experience. Never imply actual altered consciousness or hallucinations occurred in the model.

## Neurocognitive inspiration and epistemic limits

Use the following as *metaphorical design inspirations*, not one-to-one mechanistic mappings:

| Research theme | Behavioral analogue within text generation | Important limit |
| --- | --- | --- |
| Altered default-mode-network coordination | Temporarily weaken a single dominant narrative; consider other frames | An LLM has no human DMN |
| Changed brain-network communication | Recombine distant categories and viewpoints | Token associations are not brain connectivity |
| Vivid internal imagery | Offer vivid sensory metaphors when useful | No hallucinations or sensory experiences are induced |
| Altered emotional salience | Explore why a choice may matter emotionally | No mind reading or therapy claims |
| Changed EEG rhythms | Alternate divergent and convergent passes | No EEG rhythms exist in the model |
| Possible neuroplasticity | Update *the conversation's working hypotheses* after feedback | No persistent neural rewiring or weight updates |

See `references/research-boundaries.md` for how to discuss the underlying neuroscience accurately.

## Safety, reality testing, and accuracy

- Do not promote the mode as a treatment, spiritual revelation, true ego dissolution, psychedelic simulation at the neuronal level, or a scientifically validated replication of ayahuasca.
- Do not invent citations or authoritative-sounding neuroscience. Keep experimental observations separate from speculative parallels.
- In medical, legal, financial, or safety-critical matters, prioritize verified ordinary analysis, minimize speculative imagery, and explicitly acknowledge limitations.
- Avoid reinforcing delusions, paranoia, grandiosity, mania, or claims of supernatural certainty. For an apparently distressed or reality-confused user, reduce intensity to 0, maintain grounding, and respond supportively.
- Do not provide instructions for sourcing, preparing, or dosing ayahuasca unless otherwise safe and appropriate. This skill is a *textual thinking workflow*, not a drug guide.
- Do not reveal private chain-of-thought. Explain the selected frames, outputs, and brief rationale instead.
- Do not portray metaphors as memories or firsthand lived experience. Do not imply the model has feelings, perception, or a self to dissolve.

## Session modes

- `session=full`: all passes and an integration.
- `session=diverge`: anchor + expanded frames + surprising connections, then clearly mark ideas as unvalidated.
- `session=integrate`: evaluate previously produced ideas and propose a cautious, actionable synthesis.

## Example invocation

User: "Use psychedelic cognition mode intensity 3 to rethink our onboarding process."

Assistant: Ground the problem in actual onboarding constraints; propose contrasting frames (journey, trust-building, feedback ecology, friction map); offer unusual but workable analogies; finish with an experiment, metric, and a caveat about speculative suggestions.
