
import { createConflictCapture } from '@/lib/conflictCapture';
export const cloudConflictReview=createConflictCapture<Record<string,unknown>>();
export function isStoryConflict(error:unknown):boolean {
 return !!error&&typeof error==='object'&&'code' in error&&error.code==='storytable/conflict';
}
