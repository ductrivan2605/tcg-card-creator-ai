"""Prebaked 60-card decks and meta benchmark archetype decks.

These decks provide:
1. Ready-to-play 60-card prebaked decks following game rules
   (mana starts at 3, +1 mana every 2 turns, creature combat + spells).
   Every card is 100% unique in the card creator with rich multi-element diversity.
2. The benchmark opponent pool (Aggro, Midrange, Control) used by
   the multi-deck BalanceEngine to test decks against real matchups.
"""
from __future__ import annotations

from app.agent.tools import build_ai_artwork_url_from_fields
from app.core.models import AbilityRule, Card, Content, Deck, Gameplay, Rules, StatRange


def _c(
    cid: str,
    name: str,
    ctype: str,
    rarity: str,
    cost: int,
    attack: int,
    defense: int,
    health: int,
    element: str,
    faction: str,
    ability: str = "",
    flavor: str = "",
    tags: list[str] | None = None,
) -> Card:
    """Helper to concisely construct a valid Card model with individual Pollinations AI artwork."""
    tag_list = tags or []
    art = build_ai_artwork_url_from_fields(name, ctype, rarity, element, faction, flavor)
    return Card(
        id=cid,
        rarity=rarity,
        tags=tag_list,
        gameplay=Gameplay(
            cost=cost,
            attack=attack,
            defense=defense,
            health=health,
            element=element,
            faction=faction,
        ),
        content=Content(
            name=name,
            ability=ability,
            flavor=flavor,
            type_line=ctype,
            artwork=art,
            ability_rules=[
                AbilityRule(keyword=tag_list[0] if tag_list else "Basic", description=ability)
            ] if ability else [],
        ),
    )


# ─────────────────────────────────────────────────────────────────────────────
# 1. PREBAKED 60-CARD DECK: ABYSSAL DEPTHS (Multi-element: Water, Light, Fire, Nature, Earth, Void)
# ─────────────────────────────────────────────────────────────────────────────
def get_abyssal_depths_60() -> Deck:
    rules = Rules(
        elements=["water", "light", "fire", "nature", "earth", "void"],
        factions=["abyssal", "deep", "coral", "surface"],
        keywords=["Lure", "Devour", "Glow", "Cloak", "Bounce", "Crush", "Summon", "Strike", "Tide", "Wipe",
                  "Armor", "Rush", "Shield", "Quake", "Charm", "Swarm", "Echo", "Bite", "Blast", "Vortex"],
        card_types=["Creature", "Spell"],
        stat_ranges={
            "cost": StatRange(min=0, max=10),
            "attack": StatRange(min=0, max=12),
            "defense": StatRange(min=0, max=12),
            "health": StatRange(min=0, max=20),
        },
    )

    cards: list[Card] = [
    _c("abyssal_c_01", "Bioluminescent Jelly", "Creature", "common", 1, 1, 2, 2, "water", "deep", "Glow: draw 1 card when played.", "Soft glow in the sunless depths.", ['Glow']),
    _c("abyssal_c_02", "Lanternfish Scout", "Creature", "common", 1, 2, 1, 1, "light", "surface", "Scout: reveal top card of deck.", "Guiding lost schools through twilight.", ['Scout']),
    _c("abyssal_c_03", "Sand Burrower", "Creature", "common", 1, 1, 3, 3, "earth", "coral", "Guard: tough carapace.", "Patient beneath shifting silt.", ['Guard']),
    _c("abyssal_c_04", "Gulper Eel", "Creature", "common", 2, 3, 2, 2, "void", "deep", "Devour: +1 attack when destroying an enemy.", "An insatiable maw in the dark.", ['Devour']),
    _c("abyssal_c_05", "Coral Crab", "Creature", "common", 2, 2, 4, 4, "water", "coral", "Bristle: deals 1 damage to attacker.", "Shelled guardian of the reef.", ['Bristle']),
    _c("abyssal_c_06", "Dumbo Octopus", "Creature", "common", 2, 2, 3, 3, "water", "deep", "Drift: cannot be targeted by spells cost 1.", "Gliding effortlessly on unseen currents.", ['Drift']),
    _c("abyssal_c_07", "Deep Lurker", "Creature", "common", 3, 4, 3, 3, "void", "abyssal", "Strike: hits first when attacking.", "Stalking from the crushing pressure.", ['Strike']),
    _c("abyssal_c_08", "Anglerfish Lure", "Creature", "rare", 3, 3, 5, 5, "light", "abyssal", "Lure: enemy must target this creature.", "A radiant bulb promising doom.", ['Lure']),
    _c("abyssal_c_09", "Vampire Squid", "Creature", "rare", 3, 4, 4, 4, "void", "abyssal", "Cloak: immune to single-target spells.", "Cloaked in midnight red webbing.", ['Cloak']),
    _c("abyssal_c_10", "Electric Ray", "Creature", "common", 3, 3, 3, 3, "light", "surface", "Stun: target creature cannot attack next turn.", "Discharging crackling sea currents.", ['Stun']),
    _c("abyssal_c_11", "Abyssal Sentinel", "Creature", "rare", 4, 4, 6, 6, "void", "abyssal", "Taunt: protects allied creatures.", "Vigilant sentinel of forgotten trenches.", ['Taunt']),
    _c("abyssal_c_12", "Tube Worm Colony", "Creature", "rare", 4, 2, 8, 8, "nature", "coral", "Symbiosis: heals 1 health each turn.", "Anchored in mineral-rich steam.", ['Symbiosis']),
    _c("abyssal_c_13", "Frilled Hunter", "Creature", "common", 4, 5, 4, 4, "water", "deep", "Rush: can attack immediately on play.", "Swift coils striking without warning.", ['Rush']),
    _c("abyssal_c_14", "Coelacanth Elder", "Creature", "rare", 5, 5, 7, 7, "water", "abyssal", "Ancient: reduces cost of water cards by 1.", "Survivor of forgotten prehistoric ages.", ['Ancient']),
    _c("abyssal_c_15", "Shadow Moray", "Creature", "epic", 5, 6, 5, 5, "void", "deep", "Pierce: ignores defender armor.", "Slithering from obsidian crevices.", ['Pierce']),
    _c("abyssal_c_16", "Giant Manta", "Creature", "epic", 6, 6, 8, 8, "water", "surface", "Sweep: attacks adjacent creature lanes.", "Wings like storms beneath the waves.", ['Sweep']),
    _c("abyssal_c_17", "Hydrothermal Drake", "Creature", "epic", 5, 6, 4, 4, "fire", "deep", "Searing: burns attacker for 2 damage.", "Forged in scalding vent plumes.", ['Burn']),
    _c("abyssal_c_18", "Magma Vent Crab", "Creature", "common", 2, 2, 3, 3, "fire", "deep", "Armor: reduces damage taken by 1.", "Scuttles across glowing mineral fissures.", ['Armor']),
    _c("abyssal_c_19", "Boiling Viper", "Creature", "rare", 3, 4, 2, 2, "fire", "deep", "Venom: deals 2 fire damage over time.", "Venom hotter than boiling brine.", ['Venom']),
    _c("abyssal_c_20", "Kelp Strangler", "Creature", "common", 2, 1, 5, 5, "nature", "coral", "Root: holds enemy creature in place.", "Tendrils woven into inescapable snares.", ['Root']),
    _c("abyssal_c_21", "Deep Spore Polyp", "Creature", "common", 1, 1, 2, 2, "nature", "coral", "Spore: spawns a 1/1 spore on death.", "Releasing glowing benthic spores.", ['Spore']),
    _c("abyssal_c_22", "Abyssal Behemoth", "Creature", "legendary", 7, 8, 9, 9, "void", "abyssal", "Crush: excess damage hits hero face.", "A shadow that eclipses whole trenches.", ['Crush']),
    _c("abyssal_c_23", "Nautiloid Sentry", "Creature", "common", 3, 2, 5, 5, "water", "coral", "Shield: blocks first attack.", "Spiral shell impervious to water pressure.", ['Shield']),
    _c("abyssal_c_24", "Ghost Shark", "Creature", "rare", 4, 5, 3, 3, "void", "deep", "Stealth: cannot be targeted until attacking.", "Silently prowling twilight depths.", ['Stealth']),
    _c("abyssal_c_25", "Sunken Glowray", "Creature", "rare", 3, 2, 4, 4, "light", "surface", "Radiance: blinds enemy attacker.", "Radiant wings glowing in dark water.", ['Radiance']),
    _c("abyssal_c_26", "Prism Medusa", "Creature", "epic", 4, 3, 6, 6, "light", "deep", "Refract: splits damage among attackers.", "Crystalline bell refracting holy light.", ['Refract']),
    _c("abyssal_c_27", "Tectonic Crustacean", "Creature", "common", 3, 3, 4, 4, "earth", "deep", "Quake: +1 attack when taking damage.", "Hardened plates carved from tectonic basalt.", ['Quake']),
    _c("abyssal_c_28", "Basalt Golem", "Creature", "epic", 6, 5, 8, 8, "earth", "coral", "Solid: cannot be stunned or bounced.", "Carved from deep sea tectonic bedrock.", ['Solid']),
    _c("abyssal_c_29", "Seabed Crawler", "Creature", "common", 1, 2, 1, 1, "earth", "deep", "Scavenge: gains +1/+1 on enemy death.", "Feeding on ancient oceanic falls.", ['Scavenge']),
    _c("abyssal_c_30", "Trench Leviathan", "Creature", "legendary", 8, 9, 10, 10, "water", "abyssal", "Tsunami: damages all enemy non-water units.", "Ruler of the deepest abyssal trenches.", ['Tsunami']),
    _c("abyssal_c_31", "Siren of the Trench", "Creature", "rare", 4, 3, 4, 4, "water", "surface", "Charm: steals control of creature cost 2.", "Haunting melodies calling from the abyss.", ['Charm']),
    _c("abyssal_c_32", "Armored Pufferfish", "Creature", "common", 2, 2, 3, 3, "water", "coral", "Inflate: gains +3 defense when attacked.", "Expanding into a spiked iron sphere.", ['Inflate']),
    _c("abyssal_c_33", "Abyssal Anemone", "Creature", "rare", 3, 1, 6, 6, "nature", "coral", "Sting: poisons attacker for 1 each turn.", "Gentle beauty hiding lethal neurotoxins.", ['Poison']),
    _c("abyssal_c_34", "Pelagic Swarm", "Creature", "common", 1, 3, 1, 1, "water", "surface", "Swarm: gains +1 atk for each other Swarm.", "Ten thousand glistening silver bodies.", ['Swarm']),
    _c("abyssal_c_35", "Phantom Angler", "Creature", "rare", 4, 4, 3, 3, "void", "abyssal", "Bait: draws enemy into direct confrontation.", "The light you see is the last you know.", ['Bait']),
    _c("abyssal_c_36", "Obsidian Vent Snail", "Creature", "common", 2, 1, 5, 5, "fire", "deep", "Heat Shell: deals 1 damage to melee attackers.", "Scales of mineralized iron and sulfur.", ['Heat']),
    _c("abyssal_c_37", "Deepwater Dolphin", "Creature", "rare", 3, 3, 4, 4, "water", "surface", "Echo: reveals opponent hand cards.", "Sonar cutting through opaque depths.", ['Echo']),
    _c("abyssal_c_38", "Ancient Megalodon", "Creature", "epic", 6, 7, 6, 6, "water", "abyssal", "Bite: instantly defeats low-health units.", "Primeval jaws that snap galleons in two.", ['Bite']),
    _c("abyssal_c_39", "Kraken Spawn", "Creature", "rare", 4, 4, 5, 5, "void", "abyssal", "Tentacle: restrains enemy unit.", "A broodling born of the crushing void.", ['Tentacle']),
    _c("abyssal_c_40", "Oceanic Titan", "Creature", "legendary", 8, 8, 11, 11, "water", "deep", "Immense: immune to debuff spells.", "A living island swimming through time.", ['Immense']),
    _c("abyssal_s_01", "Pressure Wave", "Spell", "common", 2, 0, 0, 0, "water", "deep", "Bounce: return an enemy creature of cost 3 or less to hand.", "A mile down, even silence has weight.", ['Bounce']),
    _c("abyssal_s_02", "Tidal Healing", "Spell", "common", 2, 0, 0, 0, "water", "coral", "Heal: restore 4 health to your hero or a creature.", "Pure soothing brine sealing open wounds.", ['Heal']),
    _c("abyssal_s_03", "Frilled Strike", "Spell", "common", 3, 0, 0, 0, "water", "deep", "Strike: deal 3 damage to any enemy target.", "Three hundred razor teeth striking in unison.", ['Strike']),
    _c("abyssal_s_04", "Ink Cloud", "Spell", "rare", 3, 0, 0, 0, "void", "abyssal", "Cloak: grant all allied creatures Cloak for 1 turn.", "Black clouds blinding the hunters.", ['Cloak']),
    _c("abyssal_s_05", "Giant Squid Ambush", "Spell", "rare", 4, 0, 0, 0, "void", "abyssal", "Damage: deal 5 damage split between enemy creatures.", "Eight arms. One purpose. No escape.", ['Damage']),
    _c("abyssal_s_06", "Abyssal Tide", "Spell", "epic", 5, 0, 0, 0, "void", "abyssal", "Tide: reduce attack of all enemy creatures by 2.", "The ocean pulls back its borrowed warmth.", ['Tide']),
    _c("abyssal_s_07", "Kraken's Wrath", "Spell", "legendary", 6, 0, 0, 0, "void", "abyssal", "Wipe: destroy all creatures with cost 4 or higher.", "The deep does not bargain with monsters.", ['Wipe']),
    _c("abyssal_s_08", "Depth Charge", "Spell", "rare", 4, 0, 0, 0, "water", "surface", "Blast: deal 4 direct damage to opponent face.", "Shattering acoustic shockwaves.", ['Blast']),
    _c("abyssal_s_09", "Luminous Flare", "Spell", "common", 1, 0, 0, 0, "light", "surface", "Flash: blind target creature so it misses its next attack.", "A blinding spark in the pitch black.", ['Flash']),
    _c("abyssal_s_10", "Radiance Pulse", "Spell", "rare", 3, 0, 0, 0, "light", "deep", "Purge: remove all debuffs and heal allies 2.", "Holy ocean light purging corruption.", ['Purge']),
    _c("abyssal_s_11", "Boiling Geyser", "Spell", "rare", 3, 0, 0, 0, "fire", "deep", "Erupt: deal 4 fire damage to target and 1 to adjacent.", "Superheated steam bursting upward.", ['Erupt']),
    _c("abyssal_s_12", "Vent Eruption", "Spell", "epic", 5, 0, 0, 0, "fire", "deep", "Inferno: deals 3 damage to all non-fire creatures.", "Sulfur fire sweeping the ocean floor.", ['Inferno']),
    _c("abyssal_s_13", "Entangling Kelp", "Spell", "common", 2, 0, 0, 0, "nature", "coral", "Snare: prevents target creature from attacking for 2 turns.", "Coiling stalks dragging prey downward.", ['Snare']),
    _c("abyssal_s_14", "Benthic Quake", "Spell", "rare", 4, 0, 0, 0, "earth", "deep", "Tremor: deals 3 damage to an enemy creature and stuns it for 1 turn.", "The seafloor fractures under immense stress.", ['Tremor', 'Stun']),
    _c("abyssal_s_15", "Oceanic Shield", "Spell", "common", 2, 0, 0, 0, "water", "coral", "Barrier: grants +3 defense to target allied unit.", "Dense pressurized water deflecting steel.", ['Barrier']),
    _c("abyssal_s_16", "Maelstrom Surge", "Spell", "legendary", 7, 0, 0, 0, "water", "abyssal", "Vortex: reshuffle all creatures on board back into decks.", "A vortex that devours ship and sea alike.", ['Vortex', 'Wipe']),
    _c("abyssal_s_17", "Thermal Vent Eruption", "Spell", "rare", 3, 0, 0, 0, "fire", "deep", "Erupt: deals 3 damage and burns target for 1.", "Scalding steam bursting through abyssal cracks.", ['Burn']),
    _c("abyssal_s_18", "Deep Sea Bloom", "Spell", "rare", 3, 0, 0, 0, "earth", "coral", "Bloom: draw 2 cards and restore 2 health to your hero.", "Chemistry, not sunlight, sustains this rich benthic bloom.", ['Draw', 'Heal']),
    _c("abyssal_s_19", "Trench Banishment", "Spell", "epic", 5, 0, 0, 0, "void", "abyssal", "Banish: banish an enemy creature from the board.", "Where pressure crushes all matter into oblivion.", ['Banish']),
    _c("abyssal_s_20", "Luminous Pearl Blessing", "Spell", "common", 1, 0, 0, 0, "light", "surface", "Luminous: restore 3 health to your hero and draw a card.", "Glowing oyster pearls radiating healing light.", ['Heal', 'Draw']),
    ]
    return Deck(id="abyssal_depths_60", name="Abyssal Depths", theme="Deep Sea Creatures", rules=rules, cards=cards)


# ─────────────────────────────────────────────────────────────────────────────
# 2. PREBAKED 60-CARD DECK: SOLAR PANTHEON (Multi-element: Light, Fire, Earth, Nature, Void, Water)
# ─────────────────────────────────────────────────────────────────────────────
def get_solar_pantheon_60() -> Deck:
    rules = Rules(
        elements=["light", "fire", "earth", "nature", "void", "water"],
        factions=["olympian", "titan", "mortal", "underworld"],
        keywords=["Haste", "Divine", "Burn", "Heal", "Taunt", "Flying", "Smite", "Shield", "Draw", "Stun",
                  "Champion", "Radiance", "Charge", "Roar", "Purify", "Valor", "Forge", "Supernova", "Buff", "Revive"],
        card_types=["Creature", "Spell"],
        stat_ranges={
            "cost": StatRange(min=0, max=10),
            "attack": StatRange(min=0, max=12),
            "defense": StatRange(min=0, max=12),
            "health": StatRange(min=0, max=20),
        },
    )

    cards: list[Card] = [
    _c("solar_c_01", "Hermes Messenger", "Creature", "common", 1, 2, 1, 1, "light", "olympian", "Haste: attacks on entry turn.", "Wings on his ankles, gossip on his tongue.", ['Haste']),
    _c("solar_c_02", "Temple Novice", "Creature", "common", 1, 1, 2, 2, "light", "mortal", "Heal: restores 1 health to ally.", "Tending dawn flames with reverent care.", ['Heal']),
    _c("solar_c_03", "Spartan Recruit", "Creature", "common", 1, 2, 2, 2, "earth", "mortal", "Formation: +1 def if next to an ally.", "Side by side, or not at all.", ['Formation']),
    _c("solar_c_04", "Apollo Archer", "Creature", "common", 2, 3, 2, 2, "fire", "olympian", "Ranged: attacks without taking retaliation.", "Golden arrows dipped in sunfire.", ['Ranged']),
    _c("solar_c_05", "Shield Maiden", "Creature", "common", 2, 1, 4, 4, "light", "mortal", "Shield: absorbs first damage taken.", "A gilded shield reflecting holy light.", ['Shield']),
    _c("solar_c_06", "Hydra Hatchling", "Creature", "rare", 2, 2, 2, 2, "nature", "titan", "Regrow: splits into two 1/1s upon death.", "Each severed head breeds two more.", ['Regrow']),
    _c("solar_c_07", "Solar Hoplite", "Creature", "common", 3, 3, 4, 4, "light", "olympian", "Divine: +1 attack against void creatures.", "Radiant armor forged under noon skies.", ['Divine']),
    _c("solar_c_08", "Minotaur Warden", "Creature", "rare", 4, 5, 4, 4, "earth", "titan", "Taunt: forces enemy attackers to target it.", "Half man, half bull, guarding the maze.", ['Taunt']),
    _c("solar_c_09", "Sun Priestess", "Creature", "rare", 3, 2, 4, 4, "light", "olympian", "Bless: grants adjacent allies +1/+1.", "Chanting hymns to dawn's golden return.", ['Bless']),
    _c("solar_c_10", "Pegasus Scout", "Creature", "common", 3, 3, 3, 3, "light", "olympian", "Flying: bypasses non-flying blockers.", "White as cloud, faster than the wind.", ['Flying']),
    _c("solar_c_11", "Titan Centurion", "Creature", "rare", 4, 4, 5, 5, "earth", "titan", "Crush: excess damage strikes opponent face.", "Marches with the weight of mountains.", ['Crush']),
    _c("solar_c_12", "Cerberus Guard", "Creature", "epic", 5, 5, 6, 6, "void", "underworld", "Multi-strike: hits 2 adjacent enemy slots.", "Three heads guarding the twilight gate.", ['Multi-strike']),
    _c("solar_c_13", "Promethean Titan", "Creature", "epic", 5, 6, 6, 6, "fire", "titan", "Burn: deals 2 damage to attacker.", "Bearer of stolen divine fire.", ['Burn']),
    _c("solar_c_14", "Achilles Hero", "Creature", "legendary", 6, 7, 7, 7, "light", "mortal", "Champion: takes half damage from combat hits.", "Mostly invincible is still mortal.", ['Champion']),
    _c("solar_c_15", "Helios Sun Colossus", "Creature", "epic", 7, 8, 8, 8, "fire", "olympian", "Radiance: deals 2 damage to all enemies on entry.", "Blazing colossus striding through clouds.", ['Radiance']),
    _c("solar_c_16", "Zeus Avatar", "Creature", "legendary", 8, 9, 10, 10, "light", "olympian", "Smite: calls lightning dealing 5 damage on entry.", "The king of gods commands the sky.", ['Smite']),
    _c("solar_c_17", "Solar Guard", "Creature", "common", 2, 2, 3, 3, "light", "olympian", "Shield: absorbs 1 hit.", "Golden barrier shining bright.", ['Shield']),
    _c("solar_c_18", "Flame Sprite", "Creature", "common", 1, 2, 1, 1, "fire", "olympian", "Spark: deals 1 damage when played.", "Dancing on warm altar stones.", ['Spark']),
    _c("solar_c_19", "Dawn Valkyrie", "Creature", "rare", 4, 4, 4, 4, "light", "mortal", "Radiant Charge: gains +2 atk on charge.", "Spear flashing in morning skies.", ['Charge']),
    _c("solar_c_20", "Sunstone Golem", "Creature", "rare", 4, 3, 6, 6, "earth", "olympian", "Fortify: gains +1 def each turn.", "Hewn from crystalline sunstone.", ['Fortify']),
    _c("solar_c_21", "Underworld Shade", "Creature", "common", 2, 3, 1, 1, "void", "underworld", "Fear: attacker loses 1 attack.", "Flickering in cold subterranean gloom.", ['Fear']),
    _c("solar_c_22", "Solar Drake", "Creature", "epic", 6, 6, 6, 6, "fire", "titan", "Fire Breath: deals 3 damage in a line.", "Scales radiant with trapped sunbeams.", ['Breath']),
    _c("solar_c_23", "Sunlit Centaur", "Creature", "common", 3, 4, 3, 3, "nature", "mortal", "Charge: attacks on first movement.", "Galloping across sun-bleached steppes.", ['Charge']),
    _c("solar_c_24", "Golden Lion", "Creature", "rare", 4, 5, 4, 4, "nature", "olympian", "Roar: adjacent allies gain +1 atk.", "Mane spun of radiant gold.", ['Roar']),
    _c("solar_c_25", "Nemean Beast", "Creature", "epic", 5, 5, 7, 7, "earth", "titan", "Invulnerable: immune to weapon damage.", "Pelt unpierced by mortal bronze.", ['Armor']),
    _c("solar_c_26", "Searing Phoenix", "Creature", "legendary", 7, 7, 6, 6, "fire", "olympian", "Rebirth: revives once upon defeat.", "Rising glorious from white-hot ash.", ['Rebirth']),
    _c("solar_c_27", "Oasis Nymph", "Creature", "common", 2, 1, 4, 4, "water", "mortal", "Spring: heals hero 2 on turn start.", "A pool of clear water under midday sun.", ['Heal']),
    _c("solar_c_28", "Sunken Spring Spirit", "Creature", "rare", 3, 2, 5, 5, "water", "olympian", "Purify: cleanses allied status ailments.", "Cool currents beneath desert sands.", ['Purify']),
    _c("solar_c_29", "Eclipse Serpent", "Creature", "rare", 4, 4, 4, 4, "void", "underworld", "Eclipse: dims enemy light spells by 1.", "Coiling to swallow the morning sun.", ['Eclipse']),
    _c("solar_c_30", "Twilight Stalker", "Creature", "common", 2, 3, 2, 2, "void", "underworld", "Shadowstep: bypasses taunt defenders.", "Hunting in the boundary between day and night.", ['Shadowstep']),
    _c("solar_c_31", "Heliopolis Priest", "Creature", "common", 3, 2, 4, 4, "light", "mortal", "Chant: reduces sun spell costs by 1.", "Carrying the sacred solar ankh.", ['Chant']),
    _c("solar_c_32", "Radiant Paladin", "Creature", "rare", 4, 4, 5, 5, "light", "mortal", "Valor: gains +1/+1 when ally falls.", "Unwavering oath of the dawn order.", ['Valor']),
    _c("solar_c_33", "Vulcan Blacksmith", "Creature", "rare", 3, 2, 5, 5, "fire", "olympian", "Temper: allies gain +1 attack weapons.", "Hammering thunder into bronze blades.", ['Forge']),
    _c("solar_c_34", "Blazing Ifrit", "Creature", "epic", 5, 6, 4, 4, "fire", "titan", "Combustion: explodes dealing 3 to all on death.", "Born of pure desert heatwaves.", ['Explode']),
    _c("solar_c_35", "Poseidon Sovereign", "Creature", "legendary", 8, 8, 9, 9, "water", "olympian", "Earthshaker: stuns 2 enemies on entry.", "Trident striking sea and stone.", ['Stun']),
    _c("solar_c_36", "Hades Lord", "Creature", "legendary", 8, 7, 10, 10, "void", "underworld", "Reap: steals 2 health from each dying creature.", "Lord of the realm no sun penetrates.", ['Reap']),
    _c("solar_c_37", "Demeter Harvestkeeper", "Creature", "rare", 4, 3, 6, 6, "nature", "olympian", "Bounty: draws a card whenever mana is spent.", "Goddess of fertile fields and golden wheat.", ['Bounty']),
    _c("solar_c_38", "Athena Strategist", "Creature", "legendary", 6, 6, 7, 7, "light", "olympian", "Wisdom: allies counterattack with double damage.", "Wisdom sharper than any spear.", ['Tactics']),
    _c("solar_c_39", "Charon Ferryman", "Creature", "common", 2, 1, 4, 4, "void", "underworld", "Toll: opponent must pay 1 mana to attack it.", "No coin, no crossing across the Styx.", ['Toll']),
    _c("solar_c_40", "Solar Dragon Sovereign", "Creature", "legendary", 9, 10, 10, 10, "fire", "olympian", "Supernova: destroys all low cost units.", "The winged terror of the blazing zenith.", ['Supernova']),
    _c("solar_s_01", "Apollo's Sun Beam", "Spell", "common", 2, 0, 0, 0, "fire", "olympian", "Burn: deal 3 damage to any enemy creature.", "A focused ray that melts mortal shields.", ['Burn']),
    _c("solar_s_02", "Divine Aegis", "Spell", "common", 2, 0, 0, 0, "light", "olympian", "Shield: give target allied creature Shield.", "Impenetrable blessing of dawn light.", ['Shield']),
    _c("solar_s_03", "Athena's Wisdom", "Spell", "rare", 3, 0, 0, 0, "light", "olympian", "Draw: draw 2 cards from deck.", "She judged, she knew, she planned ahead.", ['Draw']),
    _c("solar_s_04", "Medusa's Gaze", "Spell", "rare", 3, 0, 0, 0, "earth", "titan", "Stun: target enemy creature is stunned for 1 turn.", "A single glance turns flesh to stone.", ['Stun']),
    _c("solar_s_05", "Solar Flare", "Spell", "epic", 4, 0, 0, 0, "fire", "olympian", "Burn: deal 3 damage to all enemy creatures.", "Crown of coronal fire sweeping the field.", ['Burn']),
    _c("solar_s_06", "Zeus' Thunderbolt", "Spell", "legendary", 5, 0, 0, 0, "light", "olympian", "Smite: deal 7 damage to target enemy.", "The divine decree that shatters mountains.", ['Smite']),
    _c("solar_s_07", "Hero's Call", "Spell", "rare", 3, 0, 0, 0, "light", "mortal", "Buff: give all allied creatures +1 attack.", "A battle cry echoing across Troy.", ['Buff']),
    _c("solar_s_08", "Prometheus' Gift", "Spell", "epic", 4, 0, 0, 0, "fire", "titan", "Ramp: gain 2 temporary mana this turn.", "Fire given to ignite mortal destiny.", ['Ramp']),
    _c("solar_s_09", "Sirens' Song", "Spell", "rare", 2, 0, 0, 0, "water", "titan", "Charm: take control of creature cost 3 or less.", "They sang, he listened, he surrendered.", ['Charm']),
    _c("solar_s_10", "Tidal Cascade", "Spell", "common", 2, 0, 0, 0, "water", "olympian", "Wash: pushes enemy creatures back one lane.", "Spring tides sweeping coastal temples.", ['Tide']),
    _c("solar_s_11", "Earth Shatter", "Spell", "common", 3, 0, 0, 0, "earth", "titan", "Quake: deals 3 damage and breaks defense.", "The ground fractures under divine fury.", ['Quake']),
    _c("solar_s_12", "Nature's Bloom", "Spell", "common", 2, 0, 0, 0, "nature", "olympian", "Heal: restore 5 health to target ally.", "Blossoms flourishing under morning rays.", ['Heal']),
    _c("solar_s_13", "Eclipse Shroud", "Spell", "rare", 3, 0, 0, 0, "void", "underworld", "Shroud: stealths all your units for a turn.", "Darkness blotting out midday glory.", ['Shroud']),
    _c("solar_s_14", "Underworld Gate Call", "Spell", "rare", 4, 0, 0, 0, "void", "underworld", "Revive: return highest cost creature from graveyard.", "The gates open briefly for the worthy.", ['Revive']),
    _c("solar_s_15", "Heavenly Light", "Spell", "common", 1, 0, 0, 0, "light", "olympian", "Dispel: removes all enemy enchantments.", "Pure dawn radiance clearing deceit.", ['Dispel']),
    _c("solar_s_16", "Sun Chariot Strike", "Spell", "epic", 5, 0, 0, 0, "fire", "olympian", "Blast: deals 5 damage and burns target 2.", "Wheels of fire rolling over the sky.", ['Blast']),
    _c("solar_s_17", "Olympian Decrees", "Spell", "legendary", 4, 0, 0, 0, "light", "olympian", "Decree: allied creatures cost 1 less this turn and gain +1 attack.", "Above the clouds, gods write the laws.", ['Buff']),
    _c("solar_s_18", "Hephaestus Armament", "Spell", "rare", 3, 0, 0, 0, "fire", "olympian", "Forge: all allied creatures on board gain +2 attack.", "Masterwork blades forged in divine magma.", ['Forge', 'Buff']),
    _c("solar_s_19", "Stygian Resurgence", "Spell", "rare", 3, 0, 0, 0, "void", "underworld", "Revive: summon a random fallen creature with 3 cost or less.", "Souls returning from the dark shores.", ['Revive']),
    _c("solar_s_20", "Apollo's Elixir", "Spell", "common", 2, 0, 0, 0, "water", "mortal", "Heal: restore 4 health to hero and draw 1 card.", "Sacred waters scooped from Apollo's shrine.", ['Heal', 'Draw']),
    ]
    return Deck(id="solar_pantheon_60", name="Solar Pantheon", theme="Greek Mythology", rules=rules, cards=cards)


# ─────────────────────────────────────────────────────────────────────────────
# 3. PREBAKED 60-CARD DECK: PRIMEVAL DOMINION (Multi-element: Nature, Earth, Fire, Water, Light, Void)
# ─────────────────────────────────────────────────────────────────────────────
def get_primeval_dominion_60() -> Deck:
    rules = Rules(
        elements=["nature", "earth", "fire", "water", "light", "void"],
        factions=["beast", "ancient", "grove", "feral"],
        keywords=["Rush", "Taunt", "Regenerate", "Trample", "Ramp", "Enrage", "Poison", "Draw",
                  "Armor", "Speed", "Petrify", "Regrowth", "Crush", "Ignite", "Amphibious", "Dive", "Phasing", "Camouflage", "Bleed", "Cataclysm"],
        card_types=["Creature", "Spell"],
        stat_ranges={
            "cost": StatRange(min=0, max=10),
            "attack": StatRange(min=0, max=12),
            "defense": StatRange(min=0, max=12),
            "health": StatRange(min=0, max=20),
        },
    )

    cards: list[Card] = [
    _c("primeval_c_01", "Bramble Wolf", "Creature", "common", 1, 2, 1, 1, "nature", "feral", "Rush: strikes on entry turn.", "Prowling swiftly through dense undergrowth.", ['Rush']),
    _c("primeval_c_02", "Sporeling", "Creature", "common", 1, 1, 2, 2, "nature", "grove", "Poison: applies 1 damage over time.", "Tiny caps puffing toxic spores.", ['Poison']),
    _c("primeval_c_03", "Stone Mole", "Creature", "common", 1, 1, 3, 3, "earth", "ancient", "Armor: takes 1 less combat damage.", "Tunneling through solid granite strata.", ['Armor']),
    _c("primeval_c_04", "Wild Raptor", "Creature", "common", 2, 3, 2, 2, "nature", "feral", "Speed: can attack open lane directly.", "Leaping from shadow with bared talons.", ['Speed']),
    _c("primeval_c_05", "Barkskin Dryad", "Creature", "common", 2, 2, 4, 4, "nature", "grove", "Taunt: protects neighboring allies.", "Skin of oak and heart of ancient sap.", ['Taunt']),
    _c("primeval_c_06", "Ironwood Treant", "Creature", "rare", 3, 2, 6, 6, "earth", "ancient", "Regenerate: restores 2 health each turn.", "A walking tree older than human speech.", ['Regenerate']),
    _c("primeval_c_07", "Feral Bear", "Creature", "common", 3, 4, 4, 4, "nature", "beast", "Enrage: +2 attack when damaged.", "A roar that rattles the valley walls.", ['Enrage']),
    _c("primeval_c_08", "Grove Tender", "Creature", "rare", 3, 2, 3, 3, "nature", "grove", "Ramp: gain +1 permanent max mana.", "Nurturing seeds of primordial giants.", ['Ramp']),
    _c("primeval_c_09", "Granite Golem", "Creature", "rare", 4, 4, 6, 6, "earth", "ancient", "Taunt: absorbs attacks for the hero.", "Carved from mountain stone by ancient magic.", ['Taunt']),
    _c("primeval_c_10", "Savage Tiger", "Creature", "common", 4, 5, 4, 4, "nature", "beast", "Rush: leaps into combat immediately.", "Stripes blending into golden ferns.", ['Rush']),
    _c("primeval_c_11", "Ancient Basilisk", "Creature", "epic", 5, 5, 6, 6, "earth", "beast", "Petrify: target creature cannot untap.", "Cold eyes that turn warm blood to clay.", ['Petrify']),
    _c("primeval_c_12", "Bramble Hydra", "Creature", "epic", 5, 6, 5, 5, "nature", "grove", "Regrowth: heals to full when slaying an enemy.", "Vines that knit together after every blow.", ['Regrowth']),
    _c("primeval_c_13", "Colossus of Roots", "Creature", "epic", 6, 7, 8, 8, "earth", "ancient", "Trample: excess damage hits hero face.", "Roots tearing through soil like living siege rams.", ['Trample']),
    _c("primeval_c_14", "Apex Mammoth", "Creature", "legendary", 7, 8, 9, 9, "earth", "ancient", "Crush: sweeps through enemy defenses.", "Tusks of ivory carved by glaciers.", ['Crush']),
    _c("primeval_c_15", "Primeval World-Tree", "Creature", "legendary", 8, 9, 11, 11, "nature", "grove", "Overgrowth: summons two 4/4 Treants.", "The heartwood of the primeval realm.", ['Overgrowth']),
    _c("primeval_c_16", "Forest Spriggan", "Creature", "common", 2, 2, 2, 2, "nature", "grove", "Quick: early dropped scout.", "A mischievous twig spirit darting between roots.", ['Quick']),
    _c("primeval_c_17", "Volcanic Tyrannosaur", "Creature", "legendary", 8, 9, 8, 8, "fire", "feral", "Molten Roar: deals 3 damage to all enemies.", "The apex predator walking on cooled magma.", ['Roar']),
    _c("primeval_c_18", "Ashfang Raptor", "Creature", "common", 2, 3, 1, 1, "fire", "feral", "Ignite: burns target for 1 extra damage.", "Hunting through smoking ash fields.", ['Ignite']),
    _c("primeval_c_19", "Magma Scutosaur", "Creature", "rare", 4, 3, 6, 6, "fire", "ancient", "Shell: reflects 1 damage to melee attackers.", "Plated carapace glowing with internal heat.", ['Reflect']),
    _c("primeval_c_20", "River Spinosaurus", "Creature", "epic", 6, 7, 7, 7, "water", "beast", "Amphibious: gains +2 attack in water lanes.", "Sail crest cutting through primeval rivers.", ['Amphibious']),
    _c("primeval_c_21", "Prehistoric Crocodile", "Creature", "rare", 4, 5, 5, 5, "water", "feral", "Death Roll: drags target underwater.", "Unchanged for sixty million years.", ['Grip']),
    _c("primeval_c_22", "Marsh Brontosaur", "Creature", "epic", 7, 6, 10, 10, "water", "ancient", "Immense: takes half damage from spells.", "Steps that create freshwater lakes.", ['Immense']),
    _c("primeval_c_23", "Sunwing Pterodactyl", "Creature", "common", 3, 3, 2, 2, "light", "beast", "Flying: ignores non-flying defenders.", "Gliding on thermal updrafts beneath the sun.", ['Flying']),
    _c("primeval_c_24", "Skyterror Quetzal", "Creature", "epic", 6, 6, 6, 6, "light", "ancient", "Dive: deals double damage when attacking first.", "A winged giant blotting out the morning sky.", ['Dive']),
    _c("primeval_c_25", "Dawn Raptor", "Creature", "rare", 3, 4, 3, 3, "light", "feral", "Haste: attacks on entry turn.", "Crest glowing with sunrise luminescence.", ['Haste']),
    _c("primeval_c_26", "Fossil Wraith", "Creature", "rare", 4, 4, 4, 4, "void", "ancient", "Phasing: 50% chance to dodge attacks.", "Petrified bones animated by ghost currents.", ['Phasing']),
    _c("primeval_c_27", "Bone Scavenger", "Creature", "common", 1, 2, 1, 1, "void", "feral", "Scavenge: gains +1 atk when an ally dies.", "Feasting on ancient extinction beds.", ['Scavenge']),
    _c("primeval_c_28", "Chasm Tar Wurm", "Creature", "epic", 5, 5, 7, 7, "void", "ancient", "Entomb: entangles attackers in pitch tar.", "Emerging from prehistoric tar pits.", ['Entomb']),
    _c("primeval_c_29", "Canopy Chameleon", "Creature", "common", 2, 2, 3, 3, "nature", "grove", "Camouflage: cannot be attacked first turn.", "Shifting colors to match lush rainforest leaves.", ['Stealth']),
    _c("primeval_c_30", "Ironwood Gorilla", "Creature", "rare", 4, 5, 5, 5, "earth", "beast", "Chest Beat: stuns weak enemy units.", "Pounding fists that shake the canopy.", ['Stun']),
    _c("primeval_c_31", "Saber-toothed Stalker", "Creature", "rare", 3, 4, 3, 3, "nature", "feral", "Bleed: deals 1 damage each turn to wounded prey.", "Curved canines honed for ancient prey.", ['Bleed']),
    _c("primeval_c_32", "Dire Wolf Packleader", "Creature", "rare", 4, 4, 4, 4, "nature", "beast", "Howl: allied Beasts gain +1/+1.", "Leading the winter pack across tundra valleys.", ['Buff']),
    _c("primeval_c_33", "Terrasaur Colossus", "Creature", "legendary", 8, 8, 10, 10, "earth", "ancient", "Earthquake: damages all non-flying units.", "A walking mountain shaking the primeval soil.", ['Quake']),
    _c("primeval_c_34", "Amber Beetle", "Creature", "common", 1, 1, 3, 3, "earth", "grove", "Preserve: traps dead cards in amber for redraw.", "Sealed in hardened golden resin.", ['Preserve']),
    _c("primeval_c_35", "Carnivorous Bloom", "Creature", "common", 2, 2, 4, 4, "nature", "grove", "Snare: swallows small creatures whole.", "Vibrant petals masking a fatal trap.", ['Snare']),
    _c("primeval_c_36", "Pyroclast Drake", "Creature", "epic", 5, 6, 5, 5, "fire", "ancient", "Fireburst: deals 2 damage to all board units.", "Wings shedding burning volcanic embers.", ['Burn']),
    _c("primeval_c_37", "Tidal Plesiosaur", "Creature", "rare", 4, 4, 6, 6, "water", "beast", "Swim: bypasses frontline taunt defenders.", "Paddling through mist-shrouded lagoons.", ['Swim']),
    _c("primeval_c_38", "Aurora Moth", "Creature", "rare", 3, 2, 5, 5, "light", "grove", "Silk: grants +2 defense to an ally.", "Wings shimmering like the northern lights.", ['Silk']),
    _c("primeval_c_39", "Shadowstalker Panther", "Creature", "rare", 4, 5, 3, 3, "void", "feral", "Prowl: cannot be targeted by spells.", "A black shape gliding through jungle night.", ['Prowl']),
    _c("primeval_c_40", "Extinction Titan", "Creature", "legendary", 9, 10, 9, 9, "fire", "ancient", "Cataclysm: deals 5 damage to all enemy board creatures.", "The comet's herald bringing the primeval dusk.", ['Cataclysm', 'Wipe']),
    _c("primeval_s_01", "Noxious Spores", "Spell", "common", 2, 0, 0, 0, "nature", "grove", "Poison: deals 2 damage to two enemy creatures.", "Choking green fog rising from the forest floor.", ['Poison']),
    _c("primeval_s_02", "Barkskin Infusion", "Spell", "common", 2, 0, 0, 0, "nature", "ancient", "Buff: grants target ally +1/+3.", "Thick ancient bark hardening over flesh.", ['Buff']),
    _c("primeval_s_03", "Primal Roar", "Spell", "common", 3, 0, 0, 0, "nature", "beast", "Buff: all allied beasts gain +2 attack this turn.", "The savage call of ancient instincts.", ['Buff']),
    _c("primeval_s_04", "Wild Growth", "Spell", "rare", 3, 0, 0, 0, "nature", "grove", "Ramp: permanently increases max mana by 1.", "Life surging through fertile primeval soil.", ['Ramp']),
    _c("primeval_s_05", "Entangling Roots", "Spell", "rare", 3, 0, 0, 0, "earth", "grove", "Stun: immobilizes 2 enemy creatures.", "Vines tightening like steel ropes.", ['Stun']),
    _c("primeval_s_06", "Nature's Wrath", "Spell", "epic", 4, 0, 0, 0, "nature", "ancient", "Damage: deals 5 damage to target enemy.", "The forest strikes back against invaders.", ['Damage']),
    _c("primeval_s_07", "Cataclysmic Quake", "Spell", "epic", 5, 0, 0, 0, "earth", "ancient", "Wipe: deals 4 damage to all board creatures.", "Tectonic upheaval tearing valleys open.", ['Wipe']),
    _c("primeval_s_08", "Primal Bloom", "Spell", "legendary", 4, 0, 0, 0, "nature", "grove", "Draw: draw 3 cards and restore 4 health.", "A rare blossom flowering once a century.", ['Draw', 'Heal']),
    _c("primeval_s_09", "Volcanic Eruption", "Spell", "rare", 4, 0, 0, 0, "fire", "ancient", "Erupt: deal 4 fire damage to target unit.", "Lava raining from smoking crater peaks.", ['Burn']),
    _c("primeval_s_10", "Firefang Strike", "Spell", "common", 2, 0, 0, 0, "fire", "feral", "Strike: deal 3 damage and burn target.", "Blazing jaws snapping in the brush.", ['Strike']),
    _c("primeval_s_11", "Tidal Inundation", "Spell", "common", 3, 0, 0, 0, "water", "ancient", "Wash: washes away enemy buffs.", "Swelling floodwaters cleansing the jungle.", ['Wash']),
    _c("primeval_s_12", "River Flash Flood", "Spell", "rare", 3, 0, 0, 0, "water", "feral", "Flood: returns enemy unit cost 3 or less.", "Raging rapids sweeping away all in their path.", ['Bounce']),
    _c("primeval_s_13", "Solar Radiance Surge", "Spell", "common", 2, 0, 0, 0, "light", "beast", "Radiance: blinds enemy attacker.", "Blinding sunlight breaking through canopy gaps.", ['Flash']),
    _c("primeval_s_14", "Pterosaur Dive", "Spell", "rare", 3, 0, 0, 0, "light", "beast", "Dive: deal 4 damage to backline unit.", "Swooping like a spear from high clouds.", ['Dive']),
    _c("primeval_s_15", "Extinction Meteor", "Spell", "legendary", 7, 0, 0, 0, "void", "ancient", "Meteor: destroy 2 strongest enemy creatures.", "The blazing stone that ended an epoch.", ['Destroy']),
    _c("primeval_s_16", "Fossil Curse", "Spell", "rare", 3, 0, 0, 0, "void", "ancient", "Curse: reduces target attack to 0 for 2 turns.", "Petrifying marrow into cold limestone.", ['Curse']),
    _c("primeval_s_17", "Canopy Camouflage", "Spell", "rare", 3, 0, 0, 0, "nature", "grove", "Camouflage: allied creatures cannot be targeted by spells this turn.", "Miles of green leaves shielding from all above.", ['Cover']),
    _c("primeval_s_18", "Primal Spring Surge", "Spell", "common", 2, 0, 0, 0, "water", "ancient", "Heal: restore 4 health to lowest-health creature and 2 to your hero.", "Pure mineral water bubbling from deep strata.", ['Heal']),
    _c("primeval_s_19", "Tectonic Monolith", "Spell", "rare", 3, 0, 0, 0, "earth", "ancient", "Fortify: all allied creatures on board gain +2 defense.", "Ancient stones raising impassable ramparts.", ['Fortify']),
    _c("primeval_s_20", "Caldera Eruption", "Spell", "legendary", 5, 0, 0, 0, "fire", "ancient", "Erupt: deals 3 damage to all enemy units and burns them for 1.", "A smoking cauldron raining primeval molten rock.", ['Burn', 'Wipe']),
    ]
    return Deck(id="primeval_dominion_60", name="Primeval Dominion", theme="Primeval Wilds", rules=rules, cards=cards)


# ─────────────────────────────────────────────────────────────────────────────
# 4. BENCHMARK META ARCHETYPES FOR BALANCE TESTING
# ─────────────────────────────────────────────────────────────────────────────
def get_meta_archetypes() -> dict[str, list[Card]]:
    """Returns standard Aggro, Midrange, and Control card pools for balance simulation."""
    return {
        "aggro": get_solar_pantheon_60().cards,     # fast damage & hasty attacks (40 creatures, 20 spells)
        "midrange": get_abyssal_depths_60().cards,  # tempo curves, guards, and bounce (40 creatures, 20 spells)
        "control": get_primeval_dominion_60().cards, # high defense, ramp, and board wipes (40 creatures, 20 spells)
    }
