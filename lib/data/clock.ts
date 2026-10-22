/**
 * The prototype's "today". Fixed so that upcoming and past events, "completed" states and
 * certificate eligibility read the same on every visit. Use the real clock (or the API's
 * server time) once events come from the platform. Kept apart from the data layer so client
 * components can read it without bundling the sample records.
 */
export const DEMO_NOW = '2026-10-01T09:00:00+04:00'
