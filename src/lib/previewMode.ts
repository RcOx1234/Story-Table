/** Phase 1 branch is deliberately offline, even if Vercel injects production credentials.
 * Removing this interlock requires a separate reviewed release. */
export const IS_ISOLATED_PREVIEW = true;
export const STORY_STORAGE_KEY = 'story-table-mobile-preview-v1';
