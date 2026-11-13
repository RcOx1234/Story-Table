/** New media objects never overwrite files referenced by an existing revision. */
export function versionedUploadPath(path: string, version = crypto.randomUUID()): string {
  const dot = path.lastIndexOf('.');
  return dot > path.lastIndexOf('/')
    ? path.slice(0, dot) + '-' + version + path.slice(dot)
    : path + '-' + version;
}
