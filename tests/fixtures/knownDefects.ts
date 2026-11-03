// Historical affected revision, independent of any future deployment pin.
const AFFECTED_REVISION = 'a89cccc91045a0a36ce559cd716aebc31fa302a8';
export function hasReviewedDefects(revision: unknown): boolean {
  return revision === AFFECTED_REVISION;
}
