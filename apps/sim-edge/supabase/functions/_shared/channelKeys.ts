export function generateKey(): string {
  // Alphabet for base62 encoding (URL-safe)
  const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  
  // Combine timestamp and a random number for uniqueness
  const timestamp = Date.now().toString(36); // Base 36 for a shorter, more compact representation
  const random = Math.random().toString(36).substring(2, 7); // A random string of 5 characters
  
  // Combine and shuffle the characters to make it less predictable
  const combined = (timestamp + random).split('').sort(() => 0.5 - Math.random()).join('');
  
  // Encode the combined string to base 62
  let encodedKey = '';
  for (let i = 0; i < combined.length; i++) {
    const charCode = combined.charCodeAt(i);
    encodedKey += alphabet[charCode % alphabet.length];
  }
  
  // Ensure the key is exactly 5 characters long
  // This approach is just one way, another is to just take a slice
  if (encodedKey.length < 5) {
    // If the key is too short, pad it with random characters from the alphabet
    while (encodedKey.length < 5) {
      encodedKey += alphabet[Math.floor(Math.random() * alphabet.length)];
    }
  } else {
    encodedKey = encodedKey.substring(0, 5);
  }

  return encodedKey;
}