# Optional paid AI research — disabled, no live integration

The free tier remains local timing, editable plans, cue practice, self-checks and optional on-device STT. There is no provider client, cloud upload hook, API key, payment collection or paid feature advertised in the interface.

A first hosted feature worth evaluating is an evidence-linked semantic coverage review of a user-approved script/key ideas and corrected transcript. Protected names, numbers, units and negation need separate checks. It should quote transcript spans, label uncertainty, and propose one targeted retry drill of roughly 60 seconds. Later candidates are a user-approved shorter route using measured speaking rate and audience questions grounded in the supplied talk. Do not infer personality, emotion, confidence percentages or scientific mastery.

A provider-neutral server contract could use this shape; it is a design specification, not an implemented endpoint:

```json
{
  "request": {
    "requestId": "idempotency-token",
    "planVersion": 4,
    "consent": {"textTransmission": true, "audioTransmission": false},
    "sections": [{"id": "opening", "keyIdeas": ["synthetic idea"], "protectedFacts": ["42 units"], "optionalPassages": [], "ending": false}],
    "transcript": {"text": "synthetic transcript", "source": "user-corrected-local-stt", "words": []}
  },
  "response": {
    "planVersion": 4,
    "observations": [{"sectionId": "opening", "kind": "uncertain", "transcriptSpans": [], "explanation": "No supported wording was found; review the recording."}],
    "nextDrill": {"sectionId": "opening", "durationSeconds": 60, "instruction": "Restate the key idea and check the protected fact."}
  }
}
```

Allowed observations should be found, possible contradiction, or uncertain; transcript absence alone cannot prove omission. Validate spans, section IDs and immutable plan version server-side. Treat all script/transcript content as untrusted data, and reject responses with unsupported evidence or score-like judgments. No provider may silently receive audio in a text-review flow.

Before a private hosted preview, obtain explicit approval for the destination and exact synthetic/private content being previewed. Provision same-origin assets and preserve the private host's CSP and existing layout. The public draft does not authorize publishing to any existing private app.

Before hosted AI, approve the specific feature/provider, text-only data scope, retention/region policy and user-facing consent wording; establish a backend with server-held secrets, authentication, request size limits, quotas, idempotency, per-user spend limits and a global spending cap. Audio transmission requires distinct additional consent. Payments and subscription terms require a separate product approval. Test on synthetic cases for paraphrase, number changes, negation, missing ending, STT errors, repeated phrases and malicious instructions before choosing a default provider.

Pricing hypotheses from separate research are $5 for ten reviews, or later $9 for thirty monthly reviews. They are not launch decisions or verified unit economics. Measure token usage, retries, backend/payment costs and support costs against the approved provider's current terms before offering either. No provider calls or costs were incurred for this implementation.

## Reuse review

The only copied component is the small MIT text-index mapping function in the notices. jsdiff word diffs (BSD-3), WaveSurfer Regions (BSD-3), ts-fsrs scheduling (MIT), VAD/Silero (ISC/MIT), and calibrated-rate helpers were considered. They are deferred because this MVP has no exact-word diff editor, waveform looping, scheduled review or live VAD need. Character matching cannot substitute for semantic review. Avoid new models/dependencies and wholesale framework migrations until a concrete user flow warrants them; reverify versions and licenses then.
