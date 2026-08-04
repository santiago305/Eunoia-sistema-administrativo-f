export const formatDisplayLabel = (value: string) =>
  value
    .replace(/[._-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase("es")
    .replace(/(^|\s)(\p{L})/gu, (_, separator: string, letter: string) =>
      `${separator}${letter.toLocaleUpperCase("es")}`,
    );
