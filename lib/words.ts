/**
 * Whimsical magic-word generator: <adjective>-<noun>.
 * Tuned for memorability and gentle warmth, in keeping with the
 * project's quiet/luxury voice. Avoids ambiguous or harsh words.
 */

const ADJECTIVES = [
  "velvet", "sleepy", "paper", "pebble", "hazy", "gentle", "linen", "amber",
  "soft", "moonlit", "honeyed", "quiet", "drowsy", "tiny", "mellow", "dappled",
  "golden", "ivory", "dusty", "rosy", "cosy", "balmy", "milky", "smoky",
  "feathery", "powdery", "silken", "glassy", "muted", "faint", "tender",
  "pearly", "buttery", "creamy", "frosted", "dewy", "warm", "shadowed",
  "clouded", "mossy", "wandering", "secret", "lazy", "patient", "humble",
  "candle", "lantern", "twilight", "morning", "evening", "autumn",
];

const NOUNS = [
  "otter", "comet", "lantern", "robin", "ferret", "marble", "whisper",
  "willow", "harbor", "meadow", "thistle", "ember", "puddle", "cricket",
  "mitten", "feather", "acorn", "sparrow", "fawn", "snail", "kettle",
  "pebble", "lullaby", "biscuit", "ribbon", "candle", "chestnut", "pinecone",
  "minnow", "tadpole", "duckling", "bunny", "kitten", "swan", "owlet",
  "panda", "koala", "puffin", "moth", "firefly", "ladybird", "honeybee",
  "tortoise", "starling", "fox", "hedgehog", "magpie", "raindrop", "snowdrop",
  "dewdrop", "seashell", "driftwood", "cloudlet", "moonbeam", "dumpling",
];

function pick<T>(list: readonly T[]): T {
  return list[Math.floor(Math.random() * list.length)]!;
}

export function generateMagicWord(): string {
  return `${pick(ADJECTIVES)}-${pick(NOUNS)}`;
}

/** Normalize a magic word for comparison (case-insensitive, trim, hyphen). */
export function normalizeMagicWord(input: string): string {
  return input.trim().toLowerCase().replace(/\s+/g, "-");
}
