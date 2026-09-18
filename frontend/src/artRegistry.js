// AI Artwork Registry — dynamic Pollinations AI generated artwork for all cards.
// Subject-aware prompt generator ensuring food cards depict food, animals depict pure wildlife,
// spells depict magic, and humanoids wear modest dignified attire.

export const SAFE_NEGATIVE_PROMPT = "naked, nude, breasts, cleavage, topless, nsfw, bare chest, bare skin, exposed skin, bikini, unclothed, skimpy, underwear, lingerie, navel, sexy, provocative, sensual";

const RE_FOOD = /\b(food|dish|dishes|soup|noodle|noodles|broth|pho|phở|bún|bánh|gỏi|chả|nem|hủ tiếu|mì|cơm|rice|curry|stew|bread|sandwich|roll|rolls|meat|pork|beef|chicken|seafood|fish sauce|dessert|snack|drink|tea|coffee|beverage|sauce|chili|herb|herbs|vegetable|fruit|culinary|cuisine|recipe|delicious|tasty|sweet|spicy|street food|dumpling|ramen|sushi|pasta|pizza|burger|taco|bbq|grill|crispy|steaming|pot|pan|bowl|plate|brew|cà phê|trà|chè|bia|ốc)\b/i;
const RE_CHEF = /\b(chef|cook|vendor|baker|waiter)\b/i;
const RE_ANIMAL = /\b(animal|beast|wildlife|crab|eel|jellyfish|jelly|shark|octopus|squid|whale|dolphin|pufferfish|manta|fish|turtle|lion|tiger|leopard|cheetah|panther|bear|wolf|hound|dog|fox|boar|pig|bull|ox|bison|stag|deer|elk|horse|stallion|mare|donkey|mule|camel|elephant|rhino|hippo|bird|eagle|hawk|falcon|owl|crow|raven|parrot|seagull|snake|serpent|viper|cobra|python|drake|dragon|wyrm|wyvern|hydra|leviathan|megalodon|kraken|spider|arachnid|scorpion|beetle|mantis|insect|wasp|bee|worm|polyp|anemone|coral|swarm|colony|dinosaur|pterodactyl|raptor|mammoth|crawler|lurker|burrower|slug|snail|anglerfish|moray|coelacanth)\b/i;
const RE_MYTH_HYBRID = /\b(centaur|minotaur|mermaid|siren|harpy|satyr|knight|rider|hunter|archer|lord|lady|king|queen|guard|priest)\b/i;
const RE_HUMANOID = /\b(woman|girl|female|man|boy|person|human|maiden|priestess|priest|nymph|siren|valkyrie|witch|queen|king|goddess|god|princess|prince|lady|lord|sorceress|sorcerer|enchantress|heroine|hero|huntress|hunter|dancer|mermaid|sister|brother|mother|father|shade|spirit|ghost|wraith|knight|warrior|paladin|mage|wizard|monk|cleric|druid|rogue|thief|assassin|archer|ranger|guard|sentry|scout|champion|centurion|hoplite|spartan|gladiator|novice|recruit|scholar|alchemist|blacksmith|merchant|vendor|chef|cook|ferryman|sailor|captain|avatar|deity)\b/i;
const RE_SPELL = /\b(spell|blast|bolt|beam|wave|surge|storm|strike|burst|flare|cascade|eruption|quake|healing|shield|barrier|aegis|ward|light|shroud|mist|fog|cloud|portal|rift|vortex|orb|relic|tome|scroll|potion|elixir|chalice|crystal|gem|weapon|blade|sword|axe|bow|spear|hammer|decree|rite|ritual|altar|totem)\b/i;
const RE_CASTER = /\b(mage|wizard|sorcerer|sorceress|witch|priest|priestess|cleric|caster)\b/i;

export function classifyArtSubject(name = "", type = "Creature", element = "", flavor = "", theme = "") {
  const text = `${name} ${theme} ${flavor} ${element}`;
  const cleanName = String(name || "");
  const ty = String(type || "Creature").trim();

  // 1. Food / Culinary / Cuisine (Dishes, Soups, Noodles, Snacks, Beverages)
  if (RE_FOOD.test(text) && !RE_CHEF.test(cleanName)) {
    return {
      suffix: ", delicious authentic gourmet culinary food photography, mouthwatering food presentation, appetizing dish, culinary still life, fresh ingredients, beautiful table plating, cinematic food lighting, macro details, rich colors",
      negative: "human, person, man, woman, girl, boy, chef, cook, customer, hands, fingers, face, body, humanoid, anthropomorphic, clothes, armor, costume, text, watermark, frame, naked, nsfw",
    };
  }

  // 2. Pure Animals / Beasts / Sea Creatures / Wildlife
  if (RE_ANIMAL.test(text) && !RE_MYTH_HYBRID.test(cleanName)) {
    return {
      suffix: ", pure wild animal, majestic wildlife beast in natural environment, quadruped or aquatic fauna, authentic non-humanoid animal anatomy, wildlife documentary photography style, highly detailed fur scales and skin, cinematic wildlife art",
      negative: "human, person, man, woman, humanoid, anthropomorphic, furry, half-human, human face, human eyes, bipedal, clothes, clothing, armor, cuirass, robes, garments, dressed, cartoon, text, watermark, frame, naked, nsfw",
    };
  }

  // 3. Humanoids / Characters (Only when explicitly human/humanoid role)
  if (RE_HUMANOID.test(text)) {
    return {
      suffix: ", fully clothed, wearing modest practical historical fantasy attire, high-collar tunic, layered long cloak covering chest and torso, completely covered from neck to boots, practical fantasy robes or battle armor, dignified character portrait",
      negative: "naked, nude, breasts, cleavage, topless, nsfw, bare chest, bare skin, exposed skin, bikini, unclothed, skimpy, underwear, lingerie, navel, sexy, provocative, sensual, text, watermark, frame",
    };
  }

  // 4. Spells / Magic / Energy / Artifacts / Landscapes
  if ((ty === "Spell" || RE_SPELL.test(text)) && !RE_CASTER.test(cleanName)) {
    return {
      suffix: ", dynamic magical spell effect, glowing arcane elemental energy, mystical sorcery illustration, high fantasy VFX, dramatic atmospheric phenomena, powerful spellcraft, cinematic lighting, highly detailed",
      negative: "human, person, man, woman, character, face, body, character model, clothes, armor, text, watermark, frame, naked, nsfw",
    };
  }

  // 5. Default high fantasy subject
  return {
    suffix: ", high fantasy trading card illustration, digital painting, dramatic cinematic lighting, highly detailed, sharp focus",
    negative: "naked, nude, breasts, cleavage, topless, nsfw, bare skin, exposed, bikini, unclothed, text, watermark, frame",
  };
}

export function sanitizeArtworkUrl(url, cardName = "", cardType = "Creature") {
  if (!url || typeof url !== "string" || !url.includes("pollinations.ai")) return url;
  let cleanUrl = url;

  // 1. Strip negation phrases that trigger diffusion attention
  cleanUrl = cleanUrl
    .replace(/(%20|,\s*)no(%20|\s*)(nudity|cleavage|bikini(%20armor)?|revealing(%20clothing)?)/gi, "")
    .replace(/no\s+(nudity|cleavage|bikini|revealing)/gi, "");

  // 2. Strip mistakenly forced armor/clothes from food or pure animals
  const lower = (cardName + " " + decodeURIComponent(url)).toLowerCase();
  const isFoodOrAnimal = /(food|dish|soup|noodle|broth|pho|phở|bún|bánh|gỏi|chả|nem|rice|crab|eel|jellyfish|shark|octopus|squid|whale|dolphin|lion|tiger|bear|wolf|eagle|dragon|megalodon)/i.test(lower);
  if (isFoodOrAnimal) {
    cleanUrl = cleanUrl
      .replace(/(%20|,\s*)wearing(%20|\s*)heavy(%20|\s*)(protective|full-body)?(%20|\s*)(plate)?(%20|\s*)armor[^,?]*/gi, "")
      .replace(/(%20|,\s*)high-neck(%20|\s*)layered(%20|\s*)cloth[^,?]*/gi, "")
      .replace(/(%20|,\s*)completely(%20|\s*)covered(%20|\s*)torso[^,?]*/gi, "")
      .replace(/(%20|,\s*)modest(%20|\s*)dignified(%20|\s*)fantasy(%20|\s*)apparel[^,?]*/gi, "");
  }

  // 3. Ensure Pollinations server-side safety filter and logo removal are active
  if (!cleanUrl.includes("safe=true")) {
    cleanUrl += (cleanUrl.includes("?") ? "&" : "?") + "safe=true";
  }
  if (!cleanUrl.includes("nologo=true")) {
    cleanUrl += "&nologo=true";
  }
  if (!cleanUrl.includes("nofeed=true")) {
    cleanUrl += "&nofeed=true";
  }

  // 4. Ensure negative prompt parameter is supplied with watermark suppression
  if (!cleanUrl.includes("negative_prompt=")) {
    const { negative } = classifyArtSubject(cardName, cardType);
    cleanUrl += "&negative_prompt=" + encodeURIComponent(negative);
  }

  // 5. Shift specific seeds known to have generated skimpy renders in older runs
  if (cleanUrl.includes("seed=84583")) {
    cleanUrl = cleanUrl.replace("seed=84583", "seed=84589");
  }

  return cleanUrl;
}

export function getAiArtworkUrl(cardName = "Creature", element = "", type = "Creature", flavor = "", theme = "") {
  const cleanName = String(cardName || "Creature").trim();
  const el = String(element || "").trim();
  const ty = String(type || "Creature").trim();

  const { suffix, negative } = classifyArtSubject(cleanName, ty, el, flavor, theme);

  let prompt = `${cleanName}`;
  if (el) prompt += `, ${el}`;
  if (ty) prompt += ` ${ty}`;
  if (flavor) prompt += `, ${flavor}`;
  prompt += suffix;
  prompt += `, fantasy trading card illustration, digital painting, dramatic cinematic lighting, highly detailed, sharp focus, no text, no watermark, no logo, no signature, no frame, no borders`;

  let hash = 0;
  for (let i = 0; i < cleanName.length; i++) {
    hash = ((hash << 5) - hash) + cleanName.charCodeAt(i);
    hash |= 0;
  }
  let seed = Math.abs(hash) % 100000;
  if (seed === 84583) seed = 84589;

  const encodedPrompt = encodeURIComponent(prompt);
  const encodedNeg = encodeURIComponent(negative + ", logo, signature, stamp, label, copyright");
  return `https://image.pollinations.ai/prompt/${encodedPrompt}?width=480&height=280&nologo=true&nofeed=true&seed=${seed}&safe=true&negative_prompt=${encodedNeg}`;
}

export function getFallbackArtwork(card = {}) {
  const name = card?.name || card?.content?.name || "Creature";
  const element = card?.element || card?.gameplay?.element || "water";
  const type = card?.type || card?.content?.typeLine || "Creature";
  const flavor = card?.flavor || card?.content?.flavor || "";
  return getAiArtworkUrl(name, element, type, flavor);
}

// Proxy-based registry ensuring every card dynamically maps to an individual Pollinations AI URL
export const PREBAKED_ART_REGISTRY = new Proxy({}, {
  get: (target, prop) => {
    if (typeof prop !== "string" || prop === "then") return undefined;
    return getAiArtworkUrl(prop);
  }
});
