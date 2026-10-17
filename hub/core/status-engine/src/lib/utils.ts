type ClassValue = string | false | null | undefined | Record<string, boolean>;

export function cn(...inputs: ClassValue[]): string {
  const classes: string[] = [];
  for (const input of inputs) {
    if (!input) continue;
    if (typeof input === "string") {
      classes.push(input);
    } else if (typeof input === "object") {
      for (const key of Object.keys(input)) {
        if (input[key]) classes.push(key);
      }
    }
  }
  return classes.join(" ");
}
