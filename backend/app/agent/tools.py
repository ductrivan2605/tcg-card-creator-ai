"""Deck generation tools.

These are the units of work the agent can invoke: turning a theme into
rules, rules into cards, and cards into artwork. Each is a real LLM
call. They are pure async functions; the agent decides when to call them.

Output contracts (verified against deep_sea_v1 reference deck):
  generate_rules  → Rules  matching deck.json  "rules" block
  generate_cards  → list[Card] matching cards.json "cards" array
"""
from __future__ import annotations

import asyncio
import base64
import re
import urllib.parse
import uuid

from app.core.models import AbilityRule, Card, Content, Deck, Gameplay, Rules, StatRange
from app.llm.client import LLMClient
from app.skills.loader import load_skill

_CARD_TYPES = ("Creature", "Spell")
_RARITIES = ("common", "rare", "epic", "legendary")

# Terms from real IP that must never appear in generated card text.
# If the LLM slips one in, the card name/ability is replaced with a safe fallback.
_FRANCHISE_BLOCKLIST = {
    # Pokémon
    "pikachu", "charizard", "mewtwo", "eevee", "snorlax", "bulbasaur",
    "squirtle", "charmander", "gengar", "lucario",
    # Magic: The Gathering characters
    "jace", "chandra", "liliana", "garruk", "nissa", "ajani", "teferi",
    "sorin", "elspeth", "karn", "urza", "nicol bolas",
    # Yu-Gi-Oh
    "exodia", "blue-eyes", "dark magician", "yugi",
    # D&D / FR
    "drizzt", "baldur", "elminster", "asmodeus",
    # Lord of the Rings
    "sauron", "gandalf", "frodo", "aragorn", "legolas", "gimli", "saruman",
    # Final Fantasy
    "cloud strife", "sephiroth", "tidus", "lightning", "noctis",
    # Warcraft
    "arthas", "sylvanas", "thrall", "illidan", "jaina",
}


def _strip_franchise_terms(text: str, fallback: str) -> str:
    """Replace text that contains a blocklisted franchise term with fallback."""
    lower = text.lower()
    for term in _FRANCHISE_BLOCKLIST:
        if term in lower:
            return fallback
    return text


def _as_list(value, fallback: list[str]) -> list[str]:
    """Coerce model output into a clean list of strings."""
    if not isinstance(value, list):
        return list(fallback)
    items = [str(item).strip() for item in value if str(item).strip()]
    return items or list(fallback)


def _choose_allowed(value: str, allowed, fallback: str) -> str:
    """Return value if allowed, otherwise fallback."""
    allowed_list = list(allowed)
    return value if value in allowed_list else fallback


def _safe_int(value, fallback: int = 0) -> int:
    """Convert loosely typed model output to int."""
    try:
        return int(value)
    except (TypeError, ValueError):
        return fallback


def _normalise_stat_ranges(value) -> dict[str, StatRange]:
    """Validate stat ranges and fill any missing bounds with defaults."""
    raw = value if isinstance(value, dict) else {}
    ranges: dict[str, StatRange] = {}
    for stat, default in _DEFAULT_STAT_RANGES.items():
        item = raw.get(stat)
        if not isinstance(item, dict):
            item = default
        ranges[stat] = StatRange(
            min=_safe_int(item.get("min"), default["min"]),
            max=_safe_int(item.get("max"), default["max"]),
        )
    return ranges


def _normalise_ability_rules(
    value,
    ability_text: str,
) -> list[AbilityRule]:
    """Coerce generated ability rules into a stable structured shape."""
    raw = value if isinstance(value, list) else []
    rules: list[AbilityRule] = []

    for item in raw:
        if not isinstance(item, dict):
            continue
        keyword = str(item.get("keyword") or item.get("name") or "").strip()
        if not keyword:
            continue
        rules.append(
            AbilityRule(
                keyword=keyword,
                description=str(item.get("description") or "").strip(),
                allowed_types=_as_list(item.get("allowed_types"), []),
                blocked_types=_as_list(item.get("blocked_types"), []),
                min_rarity=(str(item.get("min_rarity")).strip().lower() or None)
                if item.get("min_rarity") is not None
                else None,
                max_rarity=(str(item.get("max_rarity")).strip().lower() or None)
                if item.get("max_rarity") is not None
                else None,
            )
        )

    if rules:
        return rules

    fallback_keyword = ability_text.split(":", 1)[0].strip() if ability_text else "Ability"
    fallback_description = ability_text.split(":", 1)[1].strip() if ":" in ability_text else ability_text.strip()
    return [
        AbilityRule(
            keyword=fallback_keyword or "Ability",
            description=fallback_description,
        )
    ]


def _clamp_stat(value: int, stat: str, rules: Rules) -> int:
    """Clamp a stat to the deck rule bounds."""
    bounds = rules.stat_ranges.get(stat)
    if bounds is None:
        bounds = _normalise_stat_ranges({})[stat]
    return max(bounds.min, min(bounds.max, value))




SAFE_NEGATIVE_PROMPT = "naked, nude, breasts, cleavage, topless, nsfw, bare chest, bare skin, exposed skin, bikini, unclothed, skimpy, underwear, lingerie, navel, sexy, provocative, sensual"


_RE_FOOD = re.compile(
    r"\b(food|dish|dishes|soup|noodle|noodles|broth|pho|phở|bún|bánh|gỏi|chả|nem|hủ tiếu|mì|cơm|"
    r"rice|curry|stew|bread|sandwich|roll|rolls|meat|pork|beef|chicken|seafood|fish sauce|"
    r"dessert|snack|drink|tea|coffee|beverage|sauce|chili|herb|herbs|vegetable|fruit|culinary|"
    r"cuisine|recipe|delicious|tasty|sweet|spicy|street food|dumpling|ramen|sushi|pasta|pizza|"
    r"burger|taco|bbq|grill|crispy|steaming|pot|pan|bowl|plate|brew|cà phê|trà|chè|bia|ốc)\b",
    re.IGNORECASE,
)
_RE_CHEF = re.compile(r"\b(chef|cook|vendor|baker|waiter)\b", re.IGNORECASE)
_RE_ANIMAL = re.compile(
    r"\b(animal|beast|wildlife|crab|eel|jellyfish|jelly|shark|octopus|squid|whale|dolphin|"
    r"pufferfish|manta|fish|turtle|lion|tiger|leopard|cheetah|panther|bear|wolf|hound|dog|fox|"
    r"boar|pig|bull|ox|bison|stag|deer|elk|horse|stallion|mare|donkey|mule|camel|elephant|"
    r"rhino|hippo|bird|eagle|hawk|falcon|owl|crow|raven|parrot|seagull|snake|serpent|viper|"
    r"cobra|python|drake|dragon|wyrm|wyvern|hydra|leviathan|megalodon|kraken|spider|arachnid|"
    r"scorpion|beetle|mantis|insect|wasp|bee|worm|polyp|anemone|coral|swarm|colony|dinosaur|"
    r"pterodactyl|raptor|mammoth|crawler|lurker|burrower|slug|snail|anglerfish|moray|coelacanth)\b",
    re.IGNORECASE,
)
_RE_MYTH_HYBRID = re.compile(
    r"\b(centaur|minotaur|mermaid|siren|harpy|satyr|knight|rider|hunter|archer|lord|lady|king|queen|guard|priest)\b",
    re.IGNORECASE,
)
_RE_SPELL = re.compile(
    r"\b(spell|blast|bolt|beam|wave|surge|storm|strike|burst|flare|cascade|eruption|quake|"
    r"healing|shield|barrier|aegis|ward|light|shroud|mist|fog|cloud|portal|rift|vortex|orb|"
    r"relic|tome|scroll|potion|elixir|chalice|crystal|gem|weapon|blade|sword|axe|bow|spear|"
    r"hammer|decree|rite|ritual|altar|totem)\b",
    re.IGNORECASE,
)
_RE_CASTER = re.compile(
    r"\b(mage|wizard|sorcerer|sorceress|witch|priest|priestess|cleric|caster)\b",
    re.IGNORECASE,
)
_RE_HUMANOID = re.compile(
    r"\b(woman|girl|female|man|boy|person|human|maiden|priestess|priest|nymph|siren|valkyrie|"
    r"witch|queen|king|goddess|god|princess|prince|lady|lord|sorceress|sorcerer|enchantress|"
    r"heroine|hero|huntress|hunter|dancer|mermaid|sister|brother|mother|father|shade|spirit|"
    r"ghost|wraith|knight|warrior|paladin|mage|wizard|monk|cleric|druid|rogue|thief|assassin|"
    r"archer|ranger|guard|sentry|scout|champion|centurion|hoplite|spartan|gladiator|novice|"
    r"recruit|scholar|alchemist|blacksmith|merchant|vendor|chef|cook|ferryman|sailor|captain|"
    r"avatar|deity)\b",
    re.IGNORECASE,
)


def classify_art_subject(name: str, type_line: str = "Creature", element: str = "", theme: str = "", flavor: str = "") -> tuple[str, str]:
    """Classify card subject to return appropriate positive prompt modifiers and negative prompt."""
    text = f"{name} {theme} {flavor} {element}"
    clean_name = str(name or "")
    ty = str(type_line or "Creature").strip()

    # 1. Food / Culinary / Dishes / Drinks / Street Food
    if _RE_FOOD.search(text) and not _RE_CHEF.search(clean_name):
        return (
            ", delicious authentic gourmet culinary food photography, mouthwatering food presentation, "
            "appetizing dish, culinary still life, fresh ingredients, beautiful table plating, "
            "cinematic food lighting, macro details, rich colors",
            "human, person, man, woman, girl, boy, chef, cook, customer, hands, fingers, face, body, "
            "humanoid, anthropomorphic, clothes, armor, costume, text, watermark, frame, naked, nsfw",
        )

    # 2. Pure Animals / Beasts / Wildlife / Aquatic Creatures
    if _RE_ANIMAL.search(text) and not _RE_MYTH_HYBRID.search(clean_name):
        return (
            ", pure wild animal, majestic wildlife beast in natural environment, quadruped or aquatic fauna, "
            "authentic non-humanoid animal anatomy, wildlife documentary photography style, highly detailed fur scales and skin, "
            "cinematic wildlife art",
            "human, person, man, woman, humanoid, anthropomorphic, furry, half-human, human face, "
            "human eyes, bipedal, clothes, clothing, armor, cuirass, robes, garments, dressed, cartoon, "
            "text, watermark, frame, naked, nsfw",
        )

    # 3. Humanoids / Characters
    if _RE_HUMANOID.search(text):
        return (
            ", fully clothed, wearing modest practical historical fantasy attire, high-collar tunic, "
            "layered long cloak covering chest and torso, completely covered from neck to boots, "
            "practical fantasy robes or battle armor, dignified character portrait",
            "naked, nude, breasts, cleavage, topless, nsfw, bare chest, bare skin, exposed skin, "
            "bikini, unclothed, skimpy, underwear, lingerie, navel, sexy, provocative, sensual, text, watermark, frame",
        )

    # 4. Spells / Magic / Energy / Artifacts
    if (ty == "Spell" or _RE_SPELL.search(text)) and not _RE_CASTER.search(clean_name):
        return (
            ", dynamic magical spell effect, glowing arcane elemental energy, mystical sorcery illustration, "
            "high fantasy VFX, dramatic atmospheric phenomena, powerful spellcraft, cinematic lighting, highly detailed",
            "human, person, man, woman, character, face, body, character model, clothes, armor, text, watermark, frame, naked, nsfw",
        )

    # 5. Default generic fantasy creature/object
    return (
        ", high fantasy trading card illustration, digital painting, dramatic cinematic lighting, highly detailed, sharp focus",
        "naked, nude, breasts, cleavage, topless, nsfw, bare skin, exposed, bikini, unclothed, text, watermark, frame",
    )


def build_ai_artwork_url_from_fields(
    name: str,
    type_line: str = "Creature",
    rarity: str = "common",
    element: str = "",
    theme: str = "",
    flavor: str = "",
) -> str:
    """Generate a dedicated Pollinations AI illustration URL for each card."""
    clean_name = str(name or "Creature").strip()
    el = str(element or "").strip()
    ty = str(type_line or "Creature").strip()

    suffix, negative = classify_art_subject(clean_name, ty, el, theme, flavor)

    prompt = f"{clean_name}"
    if el:
        prompt += f", {el}"
    if ty:
        prompt += f" {ty}"
    if flavor:
        prompt += f", {flavor}"
    elif theme:
        prompt += f", {theme} theme"

    prompt += suffix
    prompt += ", fantasy trading card illustration, digital painting, dramatic cinematic lighting, highly detailed, sharp focus, no text, no watermark, no logo, no signature, no frame, no borders"

    encoded_prompt = urllib.parse.quote(prompt)
    seed = abs(hash(clean_name)) % 100000
    if seed == 84583:
        seed = 84589
    encoded_neg = urllib.parse.quote(negative + ", logo, signature, stamp, label, copyright")
    return f"https://image.pollinations.ai/prompt/{encoded_prompt}?width=480&height=280&nologo=true&nofeed=true&seed={seed}&safe=true&negative_prompt={encoded_neg}"


def build_ai_artwork_url(card: Card, theme: str = "") -> str:
    """Generate a dedicated AI illustration URL from a Card object."""
    element = card.gameplay.element if card.gameplay else ""
    flavor = card.content.flavor or ""
    return build_ai_artwork_url_from_fields(card.content.name, card.content.type_line, card.rarity, element, theme, flavor)




# ---------------------------------------------------------------------------
# Rarity distribution targets used to guide the LLM when generating cards.
# Based on the reference deck (20 cards): 9 common, 5 rare, 3 epic, 3 legendary
# Expressed as a fraction of total count, rounded to nearest whole card.
# ---------------------------------------------------------------------------
_RARITY_GUIDE = {
    "common": 0.45,    # ~45 % of the deck
    "rare": 0.25,      # ~25 %
    "epic": 0.15,      # ~15 %
    "legendary": 0.15, # ~15 %
}

# ---------------------------------------------------------------------------
# Stat ranges observed in the reference deck.
# These are passed verbatim into the prompt so the LLM stays in bounds.
# ---------------------------------------------------------------------------
_DEFAULT_STAT_RANGES = {
    "cost":    {"min": 0, "max": 10},
    "attack":  {"min": 0, "max": 12},
    "defense": {"min": 0, "max": 12},
    "health":  {"min": 0, "max": 20},
}

# Spells have 0/0/0 stats — health mirrors defense for
# Creatures. The LLM is instructed to follow this convention explicitly.
_STAT_CONVENTION = (
    "Creature cards must have attack > 0, defense > 0, and health = defense. "
    "Spell cards must have attack = 0, defense = 0, health = 0. "
    "Cost scales with power: common 1–2, rare 2–4, epic 3–5, legendary 5–8."
)


async def generate_rules(llm: LLMClient, theme: str) -> Rules:
    """Turn a theme into a deck's rule schema.

    Produces a Rules object whose fields match the deck.json 'rules' block:
      - elements   : 4 thematic element strings  (e.g. ['water','void',...])
      - factions   : 4 thematic faction strings  (e.g. ['abyssal','deep',...])
      - keywords   : 20 keyword ability names that will appear on cards
      - card_types : exactly ['Creature', 'Spell']
      - stat_ranges: cost / attack / defense / health min-max bounds
    """
    prompt = (
        f"You are designing the complete rule schema for a trading card game "
        f"with the theme '{theme}'.\n\n"
        f"Return ONLY raw JSON — no markdown, no explanation — matching this "
        f"exact shape:\n"
        f'{{\n'
        f'  "elements": ["str", "str", "str", "str"],\n'
        f'  "factions": ["str", "str", "str", "str"],\n'
        f'  "keywords": ["str", ...],\n'
        f'  "card_types": ["Creature", "Spell"],\n'
        f'  "stat_ranges": {{\n'
        f'    "cost":    {{"min": 0, "max": 10}},\n'
        f'    "attack":  {{"min": 0, "max": 12}},\n'
        f'    "defense": {{"min": 0, "max": 12}},\n'
        f'    "health":  {{"min": 0, "max": 20}}\n'
        f'  }}\n'
        f'}}\n\n'
        f"Rules for each field:\n"
        f"- elements: exactly 4 strings; single lowercase words that evoke "
        f"  the theme (e.g. for deep sea: water, void, earth, neutral).\n"
        f"- factions: exactly 4 strings; lowercase faction/group names that "
        f"  make sense for the theme and will determine card allegiance.\n"
        f"- keywords: exactly 20 single-word ability keyword names. Each must "
        f"  be a proper noun (Title Case). They will be referenced in card "
        f"  ability text, so they should read naturally as verbs or nouns "
        f"  (e.g. Lure, Devour, Cloak, Bounce, Scout, Crush, Summon).\n"
        f"- card_types: always exactly ['Creature', 'Spell'].\n"
        f"- stat_ranges: always use the exact values shown above; do not "
        f"  change the min/max numbers.\n"
    )
    try:
        data = await llm.generate_json(prompt, system=load_skill("card-design"))
    except Exception as exc:
        data = _generate_fallback_rules(theme)
    if not isinstance(data, dict):
        data = _generate_fallback_rules(theme)
    return Rules(
        elements=_as_list(data.get("elements"), ["neutral", "fire", "water", "earth"]),
        factions=_as_list(data.get("factions"), ["wild", "arcane", "guild", "ancient"]),
        keywords=_as_list(data.get("keywords"), ["Strike", "Guard", "Draw", "Boost"]),
        card_types=_as_list(data.get("card_types"), _CARD_TYPES),
        stat_ranges=_normalise_stat_ranges(data.get("stat_ranges")),
    )


def _generate_fallback_rules(theme: str) -> dict:
    """Thematic fallback rules schema if LLM is unavailable."""
    t = theme.lower()
    if any(w in t for w in ["fire", "solar", "sun", "dragon", "flame", "pyro"]):
        elements = ["fire", "light", "earth", "neutral"]
        factions = ["solari", "pyreclan", "ignis", "neutral"]
        keywords = ["Burn", "Blaze", "Radiance", "Strike", "Fury", "Ignite", "Searing", "Shield", "Surge", "Flare",
                    "Flash", "Rage", "Guard", "Swift", "Focus", "Crush", "Valor", "Roar", "Pierce", "Sunburst"]
    elif any(w in t for w in ["nature", "beast", "dominion", "forest", "wild", "jungle"]):
        elements = ["nature", "earth", "water", "neutral"]
        factions = ["grove", "predator", "ancient", "neutral"]
        keywords = ["Roar", "Prowl", "Bite", "Rend", "Pack", "Stalk", "Trample", "Overgrow", "Regen", "Call",
                    "Howl", "Guard", "Sprint", "Strike", "Fortify", "Bark", "Ensnare", "Thorn", "Venom", "Apex"]
    elif any(w in t for w in ["void", "abyss", "dark", "shadow", "death", "undead", "nether"]):
        elements = ["void", "water", "shadow", "neutral"]
        factions = ["abyssal", "cult", "deep", "neutral"]
        keywords = ["Lure", "Drain", "Corrupt", "Shroud", "Gloom", "Haunt", "Curse", "Devour", "Sink", "Chill",
                    "Voidstrike", "Doom", "Hex", "Banish", "Torment", "Terror", "Rot", "Decay", "Silent", "Oblivion"]
    else:
        elements = ["water", "light", "nature", "neutral"]
        factions = ["tide", "harbor", "coral", "neutral"]
        keywords = ["Surge", "Splash", "Tide", "Dive", "Current", "Anchor", "Guard", "Torrent", "Heal", "Swift",
                    "Flow", "Strike", "Spray", "Wave", "Shell", "Drift", "Crush", "Submerge", "Vortex", "Tsunami"]
    return {
        "elements": elements,
        "factions": factions,
        "keywords": keywords,
        "card_types": ["Creature", "Spell"],
        "stat_ranges": _DEFAULT_STAT_RANGES,
    }



def _generate_fallback_card_data(
    theme: str, rules: Rules, count: int, batch_guidance: str = ""
) -> list[dict]:
    """Synthesize structured cards if LLM is unavailable or rate-limited."""
    elements = rules.elements or ["neutral", "fire", "water", "earth"]
    factions = rules.factions or ["wild", "arcane", "guild", "ancient"]
    keywords = rules.keywords or ["Strike", "Guard", "Draw", "Boost"]
    is_spells = "spell" in batch_guidance.lower()
    is_late = "late" in batch_guidance.lower() or "champions" in batch_guidance.lower()

    data: list[dict] = []
    for i in range(count):
        el = elements[i % len(elements)]
        fac = factions[i % len(factions)]
        kw = keywords[i % len(keywords)]
        if is_spells:
            ctype = "Spell"
            cost = 1 + (i % 5)
            atk, dfs = 0, 0
            ability = f"{kw}: Deal {cost + 1} damage or buff target ally."
            flavor = f"Channeling the raw essence of {theme}"
        else:
            ctype = "Creature"
            cost = (4 + (i % 4)) if is_late else (1 + (i % 4))
            atk = max(1, cost + (1 if i % 2 == 0 else 0))
            dfs = max(1, cost)
            ability = f"{kw}: When summoned, trigger {kw.lower()} effect."
            flavor = f"A fierce protector of the {theme}"

        rarity = "common"
        if i % 6 == 0:
            rarity = "legendary"
        elif i % 4 == 0:
            rarity = "epic"
        elif i % 2 == 0:
            rarity = "rare"

        data.append({
            "name": f"{theme} {ctype} {i + 1}" if not is_spells else (f"{theme} Blessing {i+1}" if ctype == "Spell" else f"{theme} Sanctuary {i+1}"),
            "type": ctype,
            "rarity": rarity,
            "cost": cost,
            "attack": atk,
            "defense": dfs,
            "health": dfs,
            "element": el,
            "faction": fac,
            "ability": ability,
            "ability_rules": [{
                "keyword": kw,
                "description": ability,
                "allowed_types": [ctype],
                "blocked_types": [],
                "min_rarity": None,
                "max_rarity": None,
            }],
            "flavor": flavor,
            "tags": [kw, el.capitalize()],
        })
    return data


async def _generate_card_batch(
    llm: LLMClient, theme: str, rules: Rules, count: int, batch_guidance: str = ""
) -> list[Card]:
    """Generate a single batch of cards with LLM."""
    rarity_counts = {
        r: max(1, round(count * frac))
        for r, frac in _RARITY_GUIDE.items()
    }
    diff = count - sum(rarity_counts.values())
    rarity_counts["common"] += diff
    rarity_breakdown = ", ".join(
        f"{n} {r}" for r, n in rarity_counts.items()
    )

    extra_instructions = f"\nBatch focus:\n  {batch_guidance}\n" if batch_guidance else ""

    prompt = (
        f"Generate exactly {count} trading cards for the theme '{theme}'.{extra_instructions}\n"
        f"Use ONLY these values from the deck rules:\n"
        f"  Elements  : {', '.join(rules.elements)}\n"
        f"  Factions  : {', '.join(rules.factions)}\n"
        f"  Keywords  : {', '.join(rules.keywords)}\n"
        f"  Card types: {', '.join(rules.card_types)}\n\n"
        f"Rarity distribution — produce exactly: {rarity_breakdown}.\n\n"
        f"Stat rules:\n"
        f"  {_STAT_CONVENTION}\n\n"
        f"Ability text rules:\n"
        f"  - Begin with one keyword from the Keywords list above in bold "
        f"    (e.g. 'Lure: opponent must target this with their next attack.').\n"
        f"  - For Spell cards, give clear immediate impact (e.g. 'Damage: deal 4 damage to enemy target.').\n"
        f"  - Keep ability text under 120 characters.\n"
        f"  - Also return ability_rules as a machine-readable list with one "
        f"    entry per ability. Each entry must include keyword, description, "
        f"    allowed_types, blocked_types, min_rarity, and max_rarity. Use "
        f"    empty lists or null when a constraint does not apply.\n"
        f"  - Flavor text must be evocative, under 80 characters, no full stops at the end.\n\n"
        f"Card subject & theme authenticity:\n"
        f"  - Respect the subject nature of the theme and card name:\n"
        f"    * Food/Culinary themes (e.g. street food, dishes, ingredients, drinks): Cards must represent actual culinary dishes, bowls, ingredients, or street market food (e.g. 'Phở Bò', 'Bánh Mì', 'Spring Rolls', 'Chili Broth'). DO NOT turn food into human characters, chefs, or anthropomorphic food-people!\n"
        f"    * Animals/Beasts/Sea Creatures: Cards must be authentic wild animals, aquatic beasts, or mythical monsters with true animal anatomy (e.g. 'Coral Crab', 'Wolf', 'Octopus', 'Megalodon'). DO NOT make animals half-human, humanoids, or people in animal armor!\n"
        f"    * Spells: Focus on the magical energy, elemental effect, or artifact (e.g. waves, lightning, shockwaves), not a person.\n"
        f"    * Human characters: Only design a human/humanoid if the card role is explicitly a person (e.g. 'Priestess', 'Knight', 'Mage').\n"
        f"Character design rules (for human cards only):\n"
        f"  - When a card is a human character, depict them with modest, dignified attire (e.g. full armor, noble robes, travel garments). Strictly avoid revealing or sexualized descriptions.\n\n"
        f"Tags rules:\n"
        f"  - Include 1–3 tags per card.\n"
        f"  - Tags must be keywords from the Keywords list or thematic single-word descriptors (Title Case).\n\n"
        f"Return ONLY a raw JSON array of exactly {count} objects — no markdown, no explanation. Each object must match this shape:\n"
        f'{{\n'
        f'  "name": "string",\n'
        f'  "type": "Creature" | "Spell",\n'
        f'  "rarity": "common" | "rare" | "epic" | "legendary",\n'
        f'  "cost": int,\n'
        f'  "attack": int,\n'
        f'  "defense": int,\n'
        f'  "health": int,\n'
        f'  "element": "one of the elements above",\n'
        f'  "faction": "one of the factions above",\n'
        f'  "ability": "Keyword: description.",\n'
        f'  "ability_rules": [{{\n'
        f'    "keyword": "Keyword",\n'
        f'    "description": "Short mechanical summary.",\n'
        f'    "allowed_types": ["Creature"],\n'
        f'    "blocked_types": [],\n'
        f'    "min_rarity": null,\n'
        f'    "max_rarity": null\n'
        f'  }}],\n'
        f'  "flavor": "Short evocative phrase.",\n'
        f'  "tags": ["Tag1", "Tag2"]\n'
        f'}}\n'
    )

    try:
        data = await llm.generate_json(prompt, system=load_skill("card-design"))
    except Exception as exc:
        data = _generate_fallback_card_data(theme, rules, count, batch_guidance)

    if not isinstance(data, list) or len(data) < count // 2:
        data = _generate_fallback_card_data(theme, rules, count, batch_guidance)

    default_element = rules.elements[0] if rules.elements else "neutral"
    default_faction = rules.factions[0] if rules.factions else "wild"
    default_type = rules.card_types[0] if rules.card_types else "Creature"
    elements = rules.elements or [default_element]
    factions = rules.factions or [default_faction]
    card_types = rules.card_types or [default_type]
    ranges = _normalise_stat_ranges(rules.stat_ranges)

    cards: list[Card] = []
    for index, entry in enumerate(data):
        if not isinstance(entry, dict):
            continue
        fallback_name = f"{theme} Card {index + 1}"
        name = _strip_franchise_terms(
            str(entry.get("name") or fallback_name).strip(),
            fallback_name,
        )
        rarity = _choose_allowed(
            str(entry.get("rarity", "common")).strip().lower(),
            _RARITIES,
            "common",
        )
        type_line = _choose_allowed(
            str(entry.get("type", default_type)).strip(),
            card_types,
            default_type,
        )
        # Distribute elements cleanly
        element = _choose_allowed(
            str(entry.get("element", elements[index % len(elements)])).strip(),
            elements,
            elements[index % len(elements)],
        )
        faction = _choose_allowed(
            str(entry.get("faction", default_faction)).strip(),
            factions,
            default_faction,
        )
        cost = _clamp_stat(_safe_int(entry.get("cost"), ranges["cost"].min), "cost", rules)

        if type_line == "Spell":
            attack = 0
            defense = 0
            health = 0
        else:
            attack = _clamp_stat(
                _safe_int(entry.get("attack"), ranges["attack"].min),
                "attack",
                rules,
            )
            defense = _clamp_stat(
                _safe_int(entry.get("defense"), ranges["defense"].min),
                "defense",
                rules,
            )
            health = _clamp_stat(
                _safe_int(entry.get("health"), defense),
                "health",
                rules,
            )

        clean_name = name
        clean_flavor = _strip_franchise_terms(str(entry.get("flavor", "") or ""), "")
        card_obj = Card(
            id=uuid.uuid4().hex[:8],
            rarity=rarity,
            tags=_as_list(entry.get("tags"), []),
            gameplay=Gameplay(
                cost=cost,
                attack=attack,
                defense=defense,
                health=health,
                element=element,
                faction=faction,
            ),
            content=Content(
                name=clean_name,
                ability=_strip_franchise_terms(
                    str(entry.get("ability", "") or ""), ""
                ),
                ability_rules=_normalise_ability_rules(
                    entry.get("ability_rules"),
                    str(entry.get("ability", "") or ""),
                ),
                flavor=clean_flavor,
                type_line=type_line,
                artwork=build_ai_artwork_url_from_fields(clean_name, type_line, rarity, element, theme, clean_flavor),
            ),
        )
        cards.append(card_obj)
    return cards


async def generate_cards(
    llm: LLMClient, theme: str, rules: Rules, count: int = 60
) -> list[Card]:
    """Generate cards that follow the deck's rules, supporting 60-card decks with spells."""
    if count <= 25:
        return await _generate_card_batch(llm, theme, rules, count)

    # For 60-card decks (or large batches), batch into focused distributions:
    # 1. Early-mid curve creatures
    # 2. Mid-late curve synergy creatures
    # 3. Spells & Terrains
    b1_count = count * 35 // 100
    b2_count = count * 35 // 100
    b3_count = count - b1_count - b2_count

    batches = await asyncio.gather(
        _generate_card_batch(
            llm,
            theme,
            rules,
            b1_count,
            "Focus on Creature cards with mana costs 1 to 4 across diverse elements.",
        ),
        _generate_card_batch(
            llm,
            theme,
            rules,
            b2_count,
            "Focus on Creature cards with mana costs 4 to 8 featuring high-impact synergy and champions.",
        ),
        _generate_card_batch(
            llm,
            theme,
            rules,
            b3_count,
            "Focus on Spell cards (type: 'Spell', attack: 0, defense: 0, health: 0) providing damage, removal, card draw, board wipes, and buffs.",
        ),
    )

    cards: list[Card] = []
    for batch in batches:
        cards.extend(batch)
    return cards


_ART_STYLE_PREFIX = (
    "Masterpiece fantasy trading card illustration. "
    "Painterly digital art, cinematic dramatic lighting, highly detailed, "
    "concept art style, rich color grading, "
    "no text, no UI, no borders, no watermark, no card frame. "
)

_RARITY_MOOD = {
    "common":    "simple composition, muted tones",
    "rare":      "detailed composition, vivid colors, glowing accents",
    "epic":      "epic scene, dynamic pose, intense lighting, magical aura",
    "legendary": "legendary scene, awe-inspiring scale, radiant divine light, "
                 "intricate details, breathtaking composition",
}

_IMAGE_CONCURRENCY_IMAGEN = 5
_IMAGE_CONCURRENCY_POLLINATIONS = 1

def get_fallback_art(card: Card, theme: str = "") -> str:
    """Provide a guaranteed AI illustration URL for any card."""
    from app.balance.meta_decks import PREBAKED_ART_REGISTRY
    if card.content.name in PREBAKED_ART_REGISTRY:
        return PREBAKED_ART_REGISTRY[card.content.name]
    return build_ai_artwork_url(card, theme)


async def generate_artwork(llm: LLMClient, card: Card, theme: str) -> bytes:
    """Generate artwork for a single card. Returns JPEG bytes."""
    mood = _RARITY_MOOD.get(card.rarity, "detailed composition")
    element = card.gameplay.element if card.gameplay else ""
    faction = card.gameplay.faction if card.gameplay else ""
    suffix, _ = classify_art_subject(card.content.name, card.content.type_line, element, theme, card.content.flavor or "")
    prompt = (
        _ART_STYLE_PREFIX
        + f"Subject: '{card.content.name}', a {card.rarity} "
        f"{card.content.type_line.lower()} card. "
        f"Theme: {theme}. "
        + (f"Element: {element}. " if element else "")
        + (f"Faction: {faction}. " if faction else "")
        + f"Scene: {card.content.flavor} "
        + suffix + ". "
        f"Mood: {mood}. "
        f"No text, no letters, no UI elements."
    )
    return await llm.generate_image(prompt, aspect_ratio="16:9")


async def generate_images(
    llm: LLMClient,
    cards: list[Card],
    theme: str,
    *,
    on_progress=None,
) -> list[Card]:
    """Ensure every card has dedicated AI artwork and stream progress."""
    # Ensure every single card has an AI art URL from the start
    for c in cards:
        if not c.content.artwork or "wikipedia.org" in c.content.artwork:
            c.content.artwork = build_ai_artwork_url(c, theme)

    unique_groups: dict[str, list[Card]] = {}
    for c in cards:
        unique_groups.setdefault(c.content.name, []).append(c)

    for name, group in unique_groups.items():
        art_uri = group[0].content.artwork
        for c in group:
            c.content.artwork = art_uri
            if on_progress is not None:
                await on_progress(c)

    return cards


def new_deck(theme: str, rules: Rules) -> Deck:
    """Create an empty deck shell for a theme."""
    deck_id = (
        theme.lower().replace(" ", "_")[:24] + "_" + uuid.uuid4().hex[:6]
    )
    return Deck(id=deck_id, name=theme, theme=theme, rules=rules)


def export_rules_for_frontend(rules: Rules) -> dict:
    """Map backend rules to the frontend deck.json rules shape."""
    return {
        "elements": rules.elements,
        "factions": rules.factions,
        "keywords": rules.keywords,
        "cardTypes": rules.card_types,
        "stats": {
            stat: {"min": bounds.min, "max": bounds.max}
            for stat, bounds in rules.stat_ranges.items()
        },
    }


def export_card_for_frontend(card: Card) -> dict:
    """Map one backend card to the frontend v0.8 card shape."""
    type_line = card.content.type_line
    gameplay = card.gameplay.model_dump()
    art_url = card.content.artwork
    if not art_url or "wikipedia.org" in art_url:
        art_url = build_ai_artwork_url(card)
        card.content.artwork = art_url

    return {
        "id": card.id,
        "rarity": card.rarity,
        "tags": list(card.tags),
        "gameplay": gameplay,
        "metadata": {
            "artist": "AI generated",
            "set": "Generated Set",
            "serial": card.id.upper(),
            "collectorNumber": 0,
        },
        "content": {
            "name": card.content.name,
            "ability": card.content.ability,
            "abilityRules": [rule.model_dump() for rule in card.content.ability_rules],
            "flavor": card.content.flavor,
            "typeLine": type_line,
            "artwork": art_url,
        },
        "overrides": {},
        "extraLayers": [],
        "name": card.content.name,
        "type": type_line,
        "cost": gameplay["cost"],
        "attack": gameplay["attack"],
        "defense": gameplay["defense"],
        "health": gameplay["health"],
        "element": gameplay["element"],
        "faction": gameplay["faction"],
        "ability": card.content.ability,
        "flavor": card.content.flavor,
        "keywords": list(card.tags),
        "usage": 0.5,
    }


def export_cards_file_for_frontend(deck_id: str, cards: list[Card]) -> dict:
    """Map generated cards to the frontend cards.json file shape."""
    return {
        "version": "0.8",
        "deckId": deck_id,
        "count": len(cards),
        "cards": [export_card_for_frontend(card) for card in cards],
    }
