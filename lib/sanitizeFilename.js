export const sanitizeFilename = (filename) =>
  filename.toLocaleLowerCase().replace(/[^a-z0-9]/g, "-");
