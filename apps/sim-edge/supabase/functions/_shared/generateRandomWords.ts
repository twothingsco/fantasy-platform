import { generate } from 'npm:random-words';

export function generateRandomLeagueName(): string {
  // Generate random words. We can specify a length for more control,
  // or just let it pick any length for more natural-sounding words.
  // For league names, we want something a bit more substantial than a single short word.
  // We can try getting a few words and picking one, or picking words with minLength/maxLength.

  // Option 1: Generate one "cool" word for the prefix
  const prefixWords = generate({
    exactly: 5, // Get a few options
    maxLength: 8, // Keep words from getting too long
    minLength: 4,
  }) as string[]; // Cast to string[] because generate() can return string or string[]

  const randomPrefix = prefixWords[Math.floor(Math.random() * prefixWords.length)];

  // Option 2: Generate another "cool" word for the suffix
  const suffixWords = generate({
    exactly: 5,
    maxLength: 8,
    minLength: 4,
  }) as string[];

  const randomSuffix = suffixWords[Math.floor(Math.random() * suffixWords.length)];

  // Example League Suffixes (can still use your custom list or a mix)
  const leagueSuffixes = [
    "League", "Alliance", "Dynasty", "Cup", "Summit",
    "Division", "Series", "Confederation", "Association", "Brotherhood",
    "Federation", "Invitational", "Classic", "Challenge", "Showdown",
    // Adding some more generic "word" based suffixes to combine with the random-words output
    randomSuffix // Use the randomly generated word as a suffix option
  ];

  const finalSuffix = leagueSuffixes[Math.floor(Math.random() * leagueSuffixes.length)];

  // Capitalize the first letter of the randomly generated word for better presentation
  const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

  return `${capitalize(randomPrefix)} ${capitalize(finalSuffix)}`;
}

// // Example usage:
// console.log(generateRandomLeagueNameWithLibrary()); // e.g., "Mighty Victory" (if "Mighty" came from random-words and "Victory" from suffixes)
// console.log(generateRandomLeagueNameWithLibrary()); // e.g., "Silver Championship"
// console.log(generateRandomLeagueNameWithLibrary()); // e.g., "Dynamic Alliance"