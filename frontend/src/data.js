import { defaultTemplate, defaultRarities, materialiseLayers } from './templates.js';
import { PREBAKED_ART_REGISTRY, getFallbackArtwork } from './artRegistry.js';
export { PREBAKED_ART_REGISTRY, getFallbackArtwork };

function mkCard(id, name, type, rarity, cost, attack, defense, health, element, faction, ability, flavor, tags, usage, artwork = "") {
  const art = artwork || PREBAKED_ART_REGISTRY[name] || "";
  return {
    id, rarity, tags: tags || [],
    gameplay: { cost, attack, defense, health, element, faction },
    metadata: { artist: "AI generated", set: "Default Set", serial: id.toUpperCase(), collectorNumber: 0 },
    content: { name, ability, flavor, typeLine: type, artwork: art },
    overrides: {}, extraLayers: [],
    name, type, cost, attack, defense, health, element, faction, ability, flavor,
    keywords: tags || [], usage,
    artwork: art,
  };
}

export const DECK_PRESETS = {};

DECK_PRESETS["Deep Sea Creatures"] = { deck: { id: "deep_sea_v1", name: "Deep Sea Creatures", locale: "en", template: defaultTemplate({ titleFont:"Cinzel", titleColor:"#9af1f9", typeColor:"#67d9e6", abilityColor:"#cce6ee", flavorColor:"#7aaabb", costBg:"#0a4d5e", attackBg:"#6e1a1a", defenseBg:"#1a4d78", backTitleColor:"#67d9e6" }), rules: { elements:["water","void","earth","neutral"], factions:["abyssal","deep","surface","coral"], keywords:["Lure","Devour","Glow","Cloak","Bounce","Decompose","Scout","Symbiosis","Bristle","Feed","Crush","Summon","Drift","Heat","Pressure","Tentacle","Pull","Strike","Abyssal","Deep"], cardTypes:["Creature","Spell"], rarities:defaultRarities(), stats:{cost:{min:0,max:10},attack:{min:0,max:12},defense:{min:0,max:12},health:{min:0,max:20}} } }, cards: [
  mkCard("ds01","Anglerfish Lure","Creature","rare",3,2,4,4,"water","abyssal","Lure: opponent must target this with their next attack.","A flicker in the dark is rarely a kindness.",["Lure","Abyssal"],0.78),
  mkCard("ds02","Bioluminescent Jelly","Creature","common",1,1,1,1,"water","deep","Glow: draw a card at end of turn if opponent has 3+ cards in hand.","Light without warmth, beauty without thought.",["Glow"],0.62),
  mkCard("ds03","Giant Squid Ambush","Spell","epic",4,0,0,0,"void","abyssal","Deal 5 damage split between up to 3 targets.","Eight arms. One purpose. No return.",["Tentacle","Pull"],0.41),
  mkCard("ds04","Hydrothermal Vent","Terrain","rare",2,0,6,6,"earth","deep","Heat: your Abyssal creatures gain +1/+1 while this is in play.","Where the earth bleeds, life finds a way.",["Terrain","Heat"],0.55),
  mkCard("ds05","Coelacanth Elder","Creature","legendary",6,5,7,7,"water","abyssal","Ancient: costs (1) less for each Abyssal in graveyard.","Older than memory. Slower than patience.",["Abyssal","Ancient"],0.34),
  mkCard("ds06","Vampire Squid","Creature","rare",3,3,3,3,"void","abyssal","Cloak: cannot be targeted by spells until it attacks.","It does not hunt. It waits.",["Cloak","Abyssal"],0.71),
  mkCard("ds07","Pressure Wave","Spell","common",2,0,0,0,"water","deep","Bounce: return target creature cost 3 or less to hand.","A mile down, even silence has weight.",["Bounce"],0.58),
  mkCard("ds08","Gulper Eel","Creature","common",2,4,1,1,"water","deep","Devour: gain temp mana equal to cost when destroying a creature.","A mouth that knew nothing of restraint.",["Devour"],0.66),
  mkCard("ds09","Leviathan Awakens","Spell","legendary",8,0,0,0,"void","abyssal","Summon a 9/9 Leviathan with Crush. Destroy all Terrain.","The deep does not stir. The deep wakes.",["Summon","Crush"],0.18),
  mkCard("ds10","Bone-eating Worm","Creature","common",1,0,2,2,"earth","deep","Decompose: gain 1 life per creature in graveyards at turn start.","Nothing falls forever. Something is waiting.",["Decompose"],0.49),
  mkCard("ds11","Black Smoker Reef","Terrain","epic",3,0,5,5,"earth","coral","Mineral Bloom: gain 2 mineral tokens when playing an Abyssal.","Chemistry, not sunlight, sustains this garden.",["Terrain"],0.43),
  mkCard("ds12","Frilled Shark Strike","Spell","rare",3,0,0,0,"water","deep","Strike: deal damage equal to cost of target creature.","Three hundred teeth, one terrible memory.",["Strike"],0.61),
  mkCard("ds13","Dumbo Octopus","Creature","common",2,2,2,2,"water","deep","Drift: cannot be blocked by creatures cost 4+.","Soft, slow, and entirely unbothered.",["Drift"],0.52),
  mkCard("ds14","Mariana Trench","Terrain","legendary",5,0,10,10,"void","abyssal","Deepen: once per turn, banish target creature for 2 turns.","Where pressure becomes prayer.",["Terrain","Deep"],0.29),
  mkCard("ds15","Lanternfish Scout","Creature","common",1,1,2,2,"water","surface","Scout: look at top 2 of deck, replace one.","Small lights, long shadows.",["Scout","Glow"],0.69),
  mkCard("ds16","Tube Worm Colony","Creature","rare",4,2,8,8,"earth","coral","Symbiosis: gain +1 def when a Terrain is played.","Many bodies. One slow, patient idea.",["Symbiosis"],0.44),
  mkCard("ds17","Abyssal Tide","Spell","epic",5,0,0,0,"void","abyssal","Tide: all creatures lose 2 attack until end of turn.","The deep takes its pound back.",["Tide"],0.37),
  mkCard("ds18","Whale Fall","Terrain","common",1,0,3,3,"earth","deep","Feed: discard a card to draw two.","Death below is dinner for a decade.",["Feed","Sacrifice"],0.51),
  mkCard("ds19","Sea Cucumber","Creature","common",1,0,4,4,"water","coral","Bristle: deals 1 damage to attacker when blocking.","Modest. Unyielding. Slightly toxic.",["Bristle"],0.47),
  mkCard("ds20","Kraken's Wrath","Spell","legendary",7,0,0,0,"void","abyssal","Wipe: destroy all creatures with cost 4 or higher.","One arm could swallow a galleon. It has eight.",["Wipe"],0.22),
]};

DECK_PRESETS["Greek Mythology"] = { deck: { id: "greek_v1", name: "Greek Mythology", locale: "en", template: defaultTemplate({ titleFont:"Cinzel", titleColor:"#f0c168", typeColor:"#d8a64b", abilityColor:"#f5e6c0", flavorColor:"#9a8a5a", costBg:"#5a3a1a", attackBg:"#8a4a2a", defenseBg:"#3a5a8a", backTitleColor:"#f0c168" }), rules: { elements:["light","fire","void","earth"], factions:["olympian","titan","mortal","underworld"], keywords:["Haste","Regrow","Taunt","Divine","Scry","Flying","Burn","Heal","Charm","Stun","Hero","Formation","Sacrifice","Multi-strike","Random","Buff","Revive","Draw","Trick","Curse"], cardTypes:["Creature","Spell"], rarities:defaultRarities(), stats:{cost:{min:0,max:10},attack:{min:0,max:12},defense:{min:0,max:12},health:{min:0,max:20}} } }, cards: [
  mkCard("gm01","Hermes Messenger","Creature","common",1,1,1,1,"light","olympian","Haste: draw a card on attack.","Wings on his ankles, gossip on his tongue.",["Haste"],0.71),
  mkCard("gm02","Hydra Hatchling","Creature","rare",2,1,1,1,"earth","titan","Regrow: when destroyed, summon two 1/1 heads.","Each fall, twice the trouble.",["Regrow"],0.66),
  mkCard("gm03","Apollo's Sun Chariot","Spell","epic",4,0,0,0,"fire","olympian","Burn: deal 3 damage to all creatures. Heal your hero 3.","Light heals. Light burns. Same thing.",["Burn","Heal"],0.43),
  mkCard("gm04","Mount Olympus","Terrain","legendary",5,0,8,8,"light","olympian","Divine: your Olympian creatures cost (1) less.","Above the clouds, gods make rules.",["Terrain","Divine"],0.28),
  mkCard("gm05","Minotaur Warden","Creature","rare",4,5,4,4,"earth","titan","Taunt: must be attacked first.","Half man. Half bull. Entirely lost.",["Taunt"],0.62),
  mkCard("gm06","Pandora's Box","Spell","legendary",6,0,0,0,"void","mortal","Random: generate 4 cards. One is cursed.","Hope was the worst evil left inside.",["Random","Curse"],0.20),
  mkCard("gm07","Athena's Wisdom","Spell","rare",2,0,0,0,"light","olympian","Draw: draw 3 cards. Discard 1.","She judged. She knew. She rarely smiled.",["Draw"],0.69),
  mkCard("gm08","Cerberus","Creature","epic",5,4,6,6,"void","underworld","Multi-strike: attacks up to three targets for 2 each.","The good dog of the bad place.",["Multi-strike"],0.39),
  mkCard("gm09","Charon's Ferry","Creature","common",2,1,4,4,"void","underworld","Sacrifice: send target friendly creature to graveyard, gain 2 mana.","No coin? No crossing. House rule.",["Sacrifice"],0.55),
  mkCard("gm10","Medusa's Gaze","Spell","epic",3,0,0,0,"earth","titan","Stun: target creature cannot attack or be targeted for 2 turns.","Do not look. Do not look. Do not look.",["Stun"],0.48),
  mkCard("gm11","Zeus' Thunderbolt","Spell","legendary",6,0,0,0,"light","olympian","Burn: deal 8 damage to any target.","The argument that ends arguments.",["Burn"],0.31),
  mkCard("gm12","Achilles Hero","Creature","legendary",6,7,7,7,"light","mortal","Vulnerable: takes double damage from spells.","Mostly invincible is still mortal.",["Hero"],0.27),
  mkCard("gm13","Spartan Phalanx","Creature","common",3,3,3,3,"earth","mortal","Formation: +2 def while another Spartan is in play.","Side by side, or not at all.",["Formation"],0.58),
  mkCard("gm14","Oracle of Delphi","Creature","rare",3,0,3,3,"light","mortal","Scry: look at top 3 of deck, reorder freely.","She spoke in fog and was always right.",["Scry"],0.61),
  mkCard("gm15","Pegasus","Creature","rare",4,3,3,3,"light","olympian","Flying: cannot be blocked by non-flying.","White as cloud. Faster than any.",["Flying"],0.57),
  mkCard("gm16","Underworld Gate","Terrain","epic",4,0,6,6,"void","underworld","Revive: summon one creature from your graveyard each turn.","One way in, one paid way out.",["Terrain","Revive"],0.36),
  mkCard("gm17","Trojan Horse","Spell","epic",3,0,0,0,"earth","mortal","Trick: place a hidden 0/1 in opponent's board. Reveals as 5/5 next turn.","A gift always has a giver. Sometimes also teeth.",["Trick"],0.42),
  mkCard("gm18","Sirens' Song","Spell","rare",2,0,0,0,"void","titan","Charm: take control of target creature with cost 3 or less.","They sang. He listened. He drowned.",["Charm"],0.59),
  mkCard("gm19","Mount Ida Grove","Terrain","common",1,0,4,4,"earth","mortal","Heal: heal 1 each turn.","Birthplace of gods. Mostly quiet now.",["Terrain","Heal"],0.51),
  mkCard("gm20","Prometheus' Fire","Spell","legendary",5,0,0,0,"fire","titan","Buff: permanently grant +2/+0 to all your creatures.","The gift no god could rescind.",["Buff"],0.33),
]};

DECK_PRESETS["Vietnamese Street Food"] = { deck: { id: "viet_v1", name: "Vietnamese Street Food", locale: "en", template: defaultTemplate({ titleFont:"Cinzel", titleColor:"#ffb38a", typeColor:"#e07a7a", abilityColor:"#fbe6d4", flavorColor:"#a08070", costBg:"#5e2a1a", attackBg:"#8a3a1a", defenseBg:"#2a6a4a", backTitleColor:"#ffb38a" }), rules: { elements:["fire","water","earth","neutral"], factions:["street","restaurant","market","vendor"], keywords:["Spice","Broth","Fresh","Sizzle","Crispy","Grill","Steam","Pungent","Adapt","Boost","Cycle","Growth","Synergy","Quick","AOE","Heal","Mana","Sacrifice","Block","Comfort"], cardTypes:["Creature","Spell"], rarities:defaultRarities(), stats:{cost:{min:0,max:10},attack:{min:0,max:12},defense:{min:0,max:12},health:{min:0,max:20}} } }, cards: [
  mkCard("vf01","Bún Bò Huế","Creature","rare",3,4,3,3,"fire","street","Spice: deals 1 damage to attacker on block.","Red broth, white noodles, full sweat.",["Spice"],0.67),
  mkCard("vf02","Phở Bò","Creature","epic",4,3,5,5,"water","restaurant","Broth: heals you 2 each turn.","Hours of bones. Minutes of joy.",["Heal"],0.72),
  mkCard("vf03","Bánh Mì Stall","Spell","common",2,0,0,0,"earth","market","Quick: your creatures cost (1) less this turn.","One sandwich, four cultures, no fuss.",["Quick"],0.61),
  mkCard("vf04","Cà Phê Sữa Đá","Spell","common",1,0,0,0,"earth","vendor","Mana: gain 1 mana this turn. Draw a card.","Strong, sweet, slow drip, fast morning.",["Mana"],0.78),
  mkCard("vf05","Gỏi Cuốn","Creature","common",1,1,2,2,"water","vendor","Fresh: cannot be targeted on the turn it is played.","Wrapped, light, refusing to be heavy.",["Fresh"],0.66),
  mkCard("vf06","Chả Cá Lã Vọng","Creature","legendary",6,5,6,6,"fire","restaurant","Sizzle: deals 3 damage to all enemies when played.","Turmeric, dill, fish, fire, ritual.",["AOE","Sizzle"],0.31),
  mkCard("vf07","Bánh Xèo","Spell","rare",3,0,0,0,"fire","street","Crispy: destroy target creature with cost 2 or less.","Loud in the pan, louder in the mouth.",["Crispy"],0.58),
  mkCard("vf08","Bún Đậu Mắm Tôm","Creature","epic",4,2,6,6,"earth","street","Pungent: enemies lose 1 attack next to it.","Bold flavor, bolder friends.",["Pungent"],0.39),
  mkCard("vf09","Trà Đá","Spell","common",1,0,0,0,"water","vendor","Heal: heal 2.","Free at every table. Don't take it for granted.",["Heal"],0.74),
  mkCard("vf10","Bún Chả","Creature","rare",3,3,3,3,"fire","restaurant","Grill: gain +1 attack on second turn played.","Smoke, sweet, sour, herbs piled high.",["Grill"],0.63),
  mkCard("vf11","Hà Nội Night Market","Spell","epic",4,0,0,0,"earth","market","Bustle: draw 2 cards and gain 1 mana.","Plastic stools. Real conversation.",["Draw"],0.45),
  mkCard("vf12","Bánh Cuốn","Creature","common",2,1,3,3,"water","vendor","Steam: blocks creatures cost 4+.","Translucent, tender, ghostly.",["Steam","Block"],0.59),
  mkCard("vf13","Nem Rán","Creature","common",1,2,1,1,"fire","street","Crispy: dies giving +1/+1 to a friendly.","Golden outside. Memories inside.",["Crispy","Sacrifice"],0.55),
  mkCard("vf14","Hủ Tiếu","Creature","rare",3,2,4,4,"water","restaurant","Adapt: choose attack or defense at start of turn.","Many origins, one bowl.",["Adapt"],0.62),
  mkCard("vf15","Bánh Tráng Trộn","Spell","rare",2,0,0,0,"earth","market","Cycle: discard 2, draw 3.","Everything, all at once, lime on top.",["Cycle"],0.57),
  mkCard("vf16","Ốc Luộc","Creature","common",2,2,2,2,"water","market","Growth: gain +1/+1 each turn it stays.","Pick, dip, talk, repeat.",["Growth"],0.51),
  mkCard("vf17","Mì Quảng","Creature","rare",4,4,4,4,"fire","restaurant","Synergy: gain +1/+1 for each other regional card you own.","Yellow noodles, peanut crunch, rare-found bliss.",["Synergy"],0.49),
  mkCard("vf18","Chè Trôi Nước","Spell","common",1,0,0,0,"water","vendor","Comfort: heal 3.","Sweet sticky moons in ginger water.",["Heal"],0.69),
  mkCard("vf19","Saigon Street Corner","Spell","legendary",3,0,0,0,"earth","market","Discount: all allied creatures gain +1/+1.","Hot, loud, kind. Somehow always open.",["Buff"],0.32),
  mkCard("vf20","Bia Hơi","Spell","common",1,0,0,0,"fire","vendor","Boost: a creature gains +2 attack until end of turn.","Cold-ish. Cheap-ish. Endless-ish.",["Boost"],0.64),
]};

DECK_PRESETS["Forgotten Gods"] = { deck: { id: "forgotten_v1", name: "Forgotten Gods", locale: "en", template: defaultTemplate({ titleFont:"Cinzel", titleColor:"#c78ad9", typeColor:"#9a6aba", abilityColor:"#e8d8f0", flavorColor:"#7a6a8a", costBg:"#3a1a4a", attackBg:"#5a1a3a", defenseBg:"#2a3a5a", backTitleColor:"#c78ad9" }), rules: { elements:["void","fire","dark","earth"], factions:["mesopotamian","egyptian","mesoamerican","primordial"], keywords:["Storm","Sacrifice","Revive","Plague","Flying","Spawn","Dread","Charge","Mystery","Comfort","Judgement","Buff","Cloak","Heal","Scry","Burn","Token","Discount","Stun","Curse"], cardTypes:["Creature","Spell"], rarities:defaultRarities(), stats:{cost:{min:0,max:10},attack:{min:0,max:12},defense:{min:0,max:12},health:{min:0,max:20}} } }, cards: [
  mkCard("fg01","Marduk, Reborn","Creature","legendary",7,7,7,7,"void","mesopotamian","Storm: deals 2 damage to all enemies on attack.","His tablets were dust before your alphabet was born.",["Storm"],0.30),
  mkCard("fg02","Inanna's Descent","Spell","epic",4,0,0,0,"void","mesopotamian","Sacrifice: sacrifice a creature, resurrect with +2/+2.","Down seven gates. Up one transformed.",["Sacrifice","Revive"],0.41),
  mkCard("fg03","Anubis Weighing","Spell","rare",2,0,0,0,"void","egyptian","Judgement: compare costs. Destroy the higher.","His scales know no mercy and no haste.",["Judgement"],0.59),
  mkCard("fg04","Mictlān Underworld","Terrain","legendary",5,0,9,9,"dark","mesoamerican","Revive: graveyard cards cost (2) less to revive.","The dead travel four years to rest.",["Terrain","Revive"],0.27),
  mkCard("fg05","Pazuzu, Wind Demon","Creature","epic",5,4,5,5,"void","mesopotamian","Plague: opponent draws one less per turn.","Carved at every door. For protection. From him.",["Plague","Curse"],0.38),
  mkCard("fg06","Quetzalcoatl Rising","Creature","legendary",8,8,8,8,"void","mesoamerican","Flying: returns from graveyard once.","Feathered. Serpent. Sky. Bone.",["Flying","Revive"],0.22),
  mkCard("fg07","Bastet's Blessing","Spell","common",1,0,0,0,"earth","egyptian","Buff: target creature gains +1/+1 and stealth.","Soft on paw. Sharp on memory.",["Buff","Cloak"],0.66),
  mkCard("fg08","Tiamat's Children","Creature","epic",4,3,4,4,"fire","mesopotamian","Spawn: summon a 1/1 dragon each turn.","Eleven were her brood. Eleven were enough.",["Spawn","Token"],0.43),
  mkCard("fg09","Babylon Ziggurat","Terrain","epic",3,0,6,6,"earth","mesopotamian","Discount: your spells cost (1) less.","Brick by sun-baked brick to heaven.",["Terrain","Discount"],0.46),
  mkCard("fg10","Thoth's Tablet","Spell","rare",2,0,0,0,"void","egyptian","Scry: look at top 4 of deck. Keep two, shuffle rest.","Every word written, by him, before it was thought.",["Scry"],0.61),
  mkCard("fg11","Set's Storm","Spell","epic",4,0,0,0,"fire","egyptian","Burn: deal 4 damage to a creature and 1 to its owner.","The red god of all wrong weather.",["Burn"],0.49),
  mkCard("fg12","Tlaloc Rain","Spell","common",2,0,0,0,"void","mesoamerican","Heal: heal all your creatures 2.","Crying gods make growing things.",["Heal"],0.63),
  mkCard("fg13","Hathor Cow","Creature","common",2,1,3,3,"earth","egyptian","Comfort: heals you 1 per turn.","Mother of all kind things.",["Comfort","Heal"],0.58),
  mkCard("fg14","Ereshkigal Throne","Creature","legendary",7,5,9,9,"dark","mesopotamian","Dread: opposing creatures enter exhausted.","Queen of the place no light goes.",["Dread","Stun"],0.25),
  mkCard("fg15","Coatlicue, Mother","Creature","epic",5,4,5,5,"dark","mesoamerican","Birth: when destroyed, summons two 2/2 serpents.","Two-headed. Skull-skirted. Patient.",["Spawn"],0.40),
  mkCard("fg16","Apsu, Deep Water","Terrain","rare",3,0,5,5,"void","primordial","Mana: gain 1 mana every other turn.","From him, freshwater. From her, salt. From both, world.",["Terrain","Mana"],0.52),
  mkCard("fg17","Osiris Wakes","Spell","legendary",6,0,0,0,"void","egyptian","Revive: resurrect all your creatures at half HP.","Stitched together once. Now? Now we see.",["Revive"],0.28),
  mkCard("fg18","Ra's Solar Disk","Spell","rare",3,0,0,0,"fire","egyptian","Burn: deal 3 damage. Heal 3.","Every morning he wins. Again.",["Burn","Heal"],0.57),
  mkCard("fg19","Forgotten Idol","Creature","common",1,0,2,2,"dark","primordial","Mystery: reveals a random keyword on first attack.","Nobody remembers what it does. It remembers you.",["Mystery"],0.50),
  mkCard("fg20","Enkidu, Wild","Creature","rare",3,4,2,2,"earth","primordial","Charge: cannot block.","He learned to read. He stopped being free.",["Charge"],0.61),
]};

DECK_PRESETS["Quantum Particles"] = { deck: { id: "quantum_v1", name: "Quantum Particles", locale: "en", template: defaultTemplate({ titleFont:"JetBrains Mono", titleColor:"#9ab6ff", typeColor:"#6a8ada", abilityColor:"#dce4f8", flavorColor:"#7a8aaa", costBg:"#1a2a5a", attackBg:"#5a3a8a", defenseBg:"#1a4a6a", backTitleColor:"#9ab6ff" }), rules: { elements:["void","light","neutral","fire"], factions:["boson","fermion","field","exotic"], keywords:["Massify","Probabilistic","Confinement","Collapse","Link","Ghost","Pierce","Double","Extra","Collide","Buff","Dodge","Burn","Exile","Token","Reveal","Adapt","Speed","Trio","Reset"], cardTypes:["Creature","Spell"], rarities:defaultRarities(), stats:{cost:{min:0,max:10},attack:{min:0,max:12},defense:{min:0,max:12},health:{min:0,max:20}} } }, cards: [
  mkCard("qp01","Higgs Boson","Creature","legendary",7,4,9,9,"void","boson","Massify: all friendly creatures gain +1 def.","The one that makes you matter.",["Massify","Buff"],0.32),
  mkCard("qp02","Photon Burst","Spell","common",1,0,0,0,"light","boson","Speed: deal 1 damage to up to 2 targets.","Massless, ageless, in a hurry.",["Burn","Speed"],0.74),
  mkCard("qp03","Electron Cloud","Creature","common",1,1,1,1,"void","fermion","Probabilistic: 50% chance to dodge first attack.","Definitely there. Definitely not.",["Probabilistic","Dodge"],0.68),
  mkCard("qp04","Quark Triplet","Creature","rare",3,3,3,3,"void","fermion","Confinement: cannot leave the battlefield alone.","Always three. Never alone.",["Confinement","Trio"],0.59),
  mkCard("qp05","Superposition","Spell","epic",3,0,0,0,"void","exotic","Double: target creature becomes two until end of turn.","Both alive. Both dead. Don't open the box.",["Double"],0.46),
  mkCard("qp06","Quantum Entanglement","Spell","rare",2,0,0,0,"void","field","Link: pair two creatures — damage to one applies to both.","Far apart, same heartbeat.",["Link"],0.55),
  mkCard("qp07","Black Hole Singularity","Terrain","legendary",6,0,10,10,"void","exotic","Exile: cards played near it are exiled.","All math, no escape.",["Terrain","Exile"],0.24),
  mkCard("qp08","Muon Decay","Spell","common",1,0,0,0,"void","fermion","Burn: destroy a creature with cost 1.","Lived 2.2 microseconds. Mattered for them.",["Burn"],0.62),
  mkCard("qp09","Tachyon Wave","Spell","epic",4,0,0,0,"light","exotic","Extra: take an extra turn after this one ends.","Faster than light. Therefore strictly hypothetical.",["Extra"],0.39),
  mkCard("qp10","LHC Accelerator","Terrain","epic",4,0,5,5,"void","field","Collide: deal 4 damage when two creatures attack same target.","Twenty-seven kilometers of patience.",["Terrain","Collide"],0.44),
  mkCard("qp11","Antimatter Strike","Spell","legendary",5,0,0,0,"void","exotic","Exile: destroy target creature and deal damage equal to its cost.","Annihilation is just math, run backwards.",["Exile","Strike"],0.34),
  mkCard("qp12","Neutrino Drift","Creature","common",1,0,1,1,"void","fermion","Ghost: passes through blockers.","A trillion through you a second. You're fine. Probably.",["Ghost","Pierce"],0.66),
  mkCard("qp13","Gluon Field","Terrain","rare",3,0,6,6,"void","field","Buff: friendly Quark creatures gain +1/+1.","The only force that gets stronger far away.",["Terrain","Buff"],0.51),
  mkCard("qp14","Wave Function","Creature","epic",4,3,4,4,"void","field","Collapse: choose attack or defense each turn.","Many futures, until someone looks.",["Collapse","Adapt"],0.47),
  mkCard("qp15","Heisenberg Limit","Spell","rare",2,0,0,0,"void","exotic","Reveal: opponent reveals hand; choose one to make uncertain.","Position or momentum. Pick one.",["Reveal"],0.58),
  mkCard("qp16","Cosmic Ray","Spell","common",2,0,0,0,"light","exotic","Burn: deal 2 damage. May destroy a random Terrain.","From a star that died before us.",["Burn"],0.60),
  mkCard("qp17","Schrödinger's Cat","Creature","legendary",4,5,5,5,"void","exotic","Both: enters as alive and dead. Opponent picks.","Until observed, all things possible.",["Double","Probabilistic"],0.36),
  mkCard("qp18","Dark Matter Halo","Terrain","epic",4,0,7,7,"void","field","Ward: terrain immune to spells.","Eighty-five percent of everything. Invisible.",["Terrain","Ward"],0.41),
  mkCard("qp19","Pair Production","Spell","common",2,0,0,0,"light","boson","Token: summon two 1/1 particle tokens. They cancel on attack.","One and its opposite, born together.",["Token"],0.57),
  mkCard("qp20","Heat Death","Spell","legendary",9,0,0,0,"void","exotic","Reset: all creatures and Terrains return to deck.","The longest, dullest ending.",["Reset"],0.19),
]};


DECK_PRESETS["Abyssal Depths"] = {
  deck: {
    id: "abyssal_depths_60",
    name: "Abyssal Depths",
    locale: "en",
    template: defaultTemplate({
      titleFont: "Cinzel",
      titleColor: "#9af1f9",
      typeColor: "#67d9e6",
      abilityColor: "#cce6ee",
      flavorColor: "#7aaabb",
      costBg: "#0a4d5e",
      attackBg: "#6e1a1a",
      defenseBg: "#1a4d78",
      backTitleColor: "#67d9e6"
    }),
    rules: {
      elements: ["water", "light", "fire", "nature", "earth", "void"],
      factions: ["abyssal", "deep", "coral", "surface"],
      keywords: ["Lure", "Devour", "Glow", "Cloak", "Bounce", "Crush", "Summon", "Strike", "Tide", "Wipe", "Armor", "Rush", "Shield", "Quake", "Charm", "Swarm", "Echo", "Bite", "Blast", "Vortex"],
      card_types: ["Creature", "Spell"],
      stat_ranges: { cost: { min: 0, max: 10 }, attack: { min: 0, max: 12 }, defense: { min: 0, max: 12 }, health: { min: 0, max: 20 } },
      ability_values: {},
      ability_constraints: {},
      synergy_bonuses: {}
    }
  },
  cards: [
    // 40 Unique Diverse Creatures
    mkCard("abyssal_c_01", "Lanternfish Scout", "Creature", "common", 1, 1, 2, 2, "water", "deep", "Glow: reveals the top card of opponent deck.", "A solitary bulb drifting through endless dark.", ["Glow"], 0.5),
    mkCard("abyssal_c_02", "Coral Crab", "Creature", "common", 2, 2, 4, 4, "water", "coral", "Armor: takes 1 less damage from all attacks.", "Hardened calcite carapace encrusted with live polyps.", ["Armor"], 0.5),
    mkCard("abyssal_c_03", "Gulper Eel", "Creature", "rare", 3, 4, 2, 2, "water", "deep", "Devour: gains +1 attack whenever it destroys an enemy.", "Jaws that unhinge to swallow creatures twice its size.", ["Devour"], 0.5),
    mkCard("abyssal_c_04", "Dumbo Octopus", "Creature", "common", 1, 1, 3, 3, "water", "deep", "Drift: cannot be targeted by spells on summon turn.", "Gentle ear-like fins beating rhythmically in the black abyss.", ["Drift"], 0.5),
    mkCard("abyssal_c_05", "Sand Burrower", "Creature", "common", 2, 3, 1, 1, "earth", "deep", "Ambush: deals double damage if attacking an unblocked lane.", "Lurking beneath silt until vibrations betray prey.", ["Ambush"], 0.5),
    mkCard("abyssal_c_06", "Deep Lurker", "Creature", "rare", 4, 5, 4, 4, "water", "abyssal", "Rush: can attack immediately on the turn summoned.", "A flash of pale scales in the abyss, gone before you turn.", ["Rush"], 0.5),
    mkCard("abyssal_c_07", "Ancient Megalodon", "Creature", "epic", 6, 7, 6, 6, "water", "abyssal", "Crush: excess damage hits opponent hero directly.", "Primeval jaws that snap ancient galleons in two.", ["Crush"], 0.5),
    mkCard("abyssal_c_08", "Giant Manta", "Creature", "rare", 3, 2, 6, 6, "water", "surface", "Taunt: enemy creatures in adjacent lanes must target this unit.", "Wings spanning sixty feet casting shadows across the reef.", ["Taunt"], 0.5),
    mkCard("abyssal_c_09", "Viperfish", "Creature", "common", 2, 3, 2, 2, "water", "deep", "Strike: deals 1 damage to opposing defender before combat.", "Needle fangs curved so long they cannot close their jaws.", ["Strike"], 0.5),
    mkCard("abyssal_c_10", "Bioluminescent Jelly", "Creature", "common", 1, 1, 4, 4, "light", "surface", "Glow: illuminates lane, reducing enemy attack by 1.", "Cold sapphire pulses warding predators away.", ["Glow"], 0.5),
    mkCard("abyssal_c_11", "Trench Angler", "Creature", "epic", 5, 6, 5, 5, "void", "abyssal", "Lure: pulls an enemy creature into this combat lane.", "The hypnotic light is the last thing you ever see.", ["Lure"], 0.5),
    mkCard("abyssal_c_12", "Abyssal Siphonophore", "Creature", "legendary", 7, 7, 8, 8, "water", "deep", "Colony: heals 2 health to all friendly creatures at turn end.", "A hundred-meter ribbon of colonial light and stinging cells.", ["Colony", "Heal"], 0.5),
    mkCard("abyssal_c_13", "Crown of Thorns Star", "Creature", "rare", 3, 3, 5, 5, "nature", "coral", "Poison: poisons attacker, dealing 1 damage per turn.", "Spines dripping with reef-dissolving venom.", ["Poison"], 0.5),
    mkCard("abyssal_c_14", "Sunlit Flying Fish", "Creature", "common", 1, 2, 1, 1, "light", "surface", "Haste: can attack the turn it is summoned.", "Gliding forty yards above cresting sunlit rollers.", ["Haste"], 0.5),
    mkCard("abyssal_c_15", "Reef Guardian Shark", "Creature", "rare", 4, 4, 5, 5, "water", "coral", "Guard: blocks 2 damage from all incoming direct attacks.", "Patrolling outer reef boundaries since before the continents broke.", ["Guard"], 0.5),
    mkCard("abyssal_c_16", "Sulfur Vent Worm", "Creature", "common", 2, 1, 6, 6, "fire", "deep", "Immunity: immune to all fire and poison damage.", "Plumes of bright crimson thriving on boiling hydrothermal chimneys.", ["Immunity"], 0.5),
    mkCard("abyssal_c_17", "Colossal Squid", "Creature", "legendary", 8, 9, 8, 8, "void", "abyssal", "Grapple: locks two opposing enemy lanes from attacking.", "Eyes like dinner plates staring out of midnight depths.", ["Grapple"], 0.5),
    mkCard("abyssal_c_18", "Magma Vent Crab", "Creature", "common", 2, 2, 3, 3, "fire", "deep", "Armor: reduces damage taken by 1.", "Scuttles across glowing mineral fissures.", ["Armor"], 0.5),
    mkCard("abyssal_c_19", "Boiling Viper", "Creature", "rare", 3, 4, 2, 2, "fire", "deep", "Venom: deals 2 fire damage over time.", "Venom hotter than boiling brine.", ["Venom"], 0.5),
    mkCard("abyssal_c_20", "Kelp Strangler", "Creature", "common", 2, 1, 5, 5, "nature", "coral", "Root: holds enemy creature in place.", "Tendrils woven into inescapable snares.", ["Root"], 0.5),
    mkCard("abyssal_c_21", "Deep Spore Polyp", "Creature", "common", 1, 1, 2, 2, "nature", "coral", "Spore: spawns a 1/1 spore on death.", "Releasing glowing benthic spores.", ["Spore"], 0.5),
    mkCard("abyssal_c_22", "Abyssal Behemoth", "Creature", "legendary", 7, 8, 9, 9, "void", "abyssal", "Crush: excess damage hits hero face.", "A shadow that eclipses whole trenches.", ["Crush"], 0.5),
    mkCard("abyssal_c_23", "Nautiloid Sentry", "Creature", "common", 3, 2, 5, 5, "water", "coral", "Shield: blocks first attack.", "Spiral shell impervious to water pressure.", ["Shield"], 0.5),
    mkCard("abyssal_c_24", "Ghost Shark", "Creature", "rare", 4, 5, 3, 3, "void", "deep", "Stealth: cannot be targeted until attacking.", "Silently prowling twilight depths.", ["Stealth"], 0.5),
    mkCard("abyssal_c_25", "Sunken Glowray", "Creature", "rare", 3, 2, 4, 4, "light", "surface", "Radiance: blinds enemy attacker.", "Radiant wings glowing in dark water.", ["Radiance"], 0.5),
    mkCard("abyssal_c_26", "Prism Medusa", "Creature", "epic", 4, 3, 6, 6, "light", "deep", "Refract: splits damage among attackers.", "Crystalline bell refracting holy light.", ["Refract"], 0.5),
    mkCard("abyssal_c_27", "Tectonic Crustacean", "Creature", "common", 3, 3, 4, 4, "earth", "deep", "Quake: +1 attack when taking damage.", "Hardened plates carved from tectonic basalt.", ["Quake"], 0.5),
    mkCard("abyssal_c_28", "Basalt Golem", "Creature", "epic", 6, 5, 8, 8, "earth", "coral", "Solid: cannot be stunned or bounced.", "Carved from deep sea tectonic bedrock.", ["Solid"], 0.5),
    mkCard("abyssal_c_29", "Seabed Crawler", "Creature", "common", 1, 2, 1, 1, "earth", "deep", "Scavenge: gains +1/+1 on enemy death.", "Feeding on ancient oceanic falls.", ["Scavenge"], 0.5),
    mkCard("abyssal_c_30", "Trench Leviathan", "Creature", "legendary", 8, 9, 10, 10, "water", "abyssal", "Tsunami: damages all enemy non-water units.", "Ruler of the deepest abyssal trenches.", ["Tsunami"], 0.5),
    mkCard("abyssal_c_31", "Siren of the Trench", "Creature", "rare", 4, 3, 4, 4, "water", "surface", "Charm: steals control of creature cost 2.", "Haunting melodies calling from the abyss.", ["Charm"], 0.5),
    mkCard("abyssal_c_32", "Armored Pufferfish", "Creature", "common", 2, 2, 3, 3, "water", "coral", "Inflate: gains +3 defense when attacked.", "Expanding into a spiked iron sphere.", ["Inflate"], 0.5),
    mkCard("abyssal_c_33", "Abyssal Anemone", "Creature", "rare", 3, 1, 6, 6, "nature", "coral", "Sting: poisons attacker for 1 each turn.", "Gentle beauty hiding lethal neurotoxins.", ["Poison"], 0.5),
    mkCard("abyssal_c_34", "Pelagic Swarm", "Creature", "common", 1, 3, 1, 1, "water", "surface", "Swarm: gains +1 atk for each other Swarm.", "Ten thousand glistening silver bodies.", ["Swarm"], 0.5),
    mkCard("abyssal_c_35", "Phantom Angler", "Creature", "rare", 4, 4, 3, 3, "void", "abyssal", "Bait: draws enemy into direct confrontation.", "The light you see is the last you know.", ["Bait"], 0.5),
    mkCard("abyssal_c_36", "Obsidian Vent Snail", "Creature", "common", 2, 1, 5, 5, "fire", "deep", "Heat Shell: deals 1 damage to melee attackers.", "Scales of mineralized iron and sulfur.", ["Heat"], 0.5),
    mkCard("abyssal_c_37", "Deepwater Dolphin", "Creature", "rare", 3, 3, 4, 4, "water", "surface", "Echo: reveals opponent hand cards.", "Sonar cutting through opaque depths.", ["Echo"], 0.5),
    mkCard("abyssal_c_38", "Ancient Megalodon Brood", "Creature", "epic", 6, 7, 6, 6, "water", "abyssal", "Bite: instantly defeats low-health units.", "Primeval jaws that snap galleons in two.", ["Bite"], 0.5),
    mkCard("abyssal_c_39", "Kraken Spawn", "Creature", "rare", 4, 4, 5, 5, "void", "abyssal", "Tentacle: restrains enemy unit.", "A broodling born of the crushing void.", ["Tentacle"], 0.5),
    mkCard("abyssal_c_40", "Oceanic Titan", "Creature", "legendary", 8, 8, 11, 11, "water", "deep", "Immense: immune to debuff spells.", "A living island swimming through time.", ["Immense"], 0.5),
    // 20 Unique Multi-element Spells
    mkCard("abyssal_s_01", "Pressure Wave", "Spell", "common", 2, 0, 0, 0, "water", "deep", "Bounce: return an enemy creature of cost 3 or less to hand.", "A mile down, even silence has weight.", ["Bounce"], 0.5),
    mkCard("abyssal_s_02", "Tidal Healing", "Spell", "common", 2, 0, 0, 0, "water", "coral", "Heal: restore 4 health to your hero or a creature.", "Pure soothing brine sealing open wounds.", ["Heal"], 0.5),
    mkCard("abyssal_s_03", "Frilled Strike", "Spell", "common", 3, 0, 0, 0, "water", "deep", "Strike: deal 3 damage to any enemy target.", "Three hundred razor teeth striking in unison.", ["Strike"], 0.5),
    mkCard("abyssal_s_04", "Abyssal Grip", "Spell", "rare", 4, 0, 0, 0, "void", "abyssal", "Crush: destroy target creature with 4 or less health.", "Black water closing like a fist.", ["Crush"], 0.5),
    mkCard("abyssal_s_05", "Coral Regeneration", "Spell", "rare", 3, 0, 0, 0, "nature", "coral", "Regrow: target friendly creature gains +2/+4 and Taunt.", "Polyps spreading across bone and shell.", ["Buff"], 0.5),
    mkCard("abyssal_s_06", "Ink Cloud Escape", "Spell", "common", 1, 0, 0, 0, "void", "surface", "Cloak: friendly creatures cannot be attacked this turn.", "A dense billow of sepia concealing all retreat.", ["Cloak"], 0.5),
    mkCard("abyssal_s_07", "Leviathan Call", "Spell", "legendary", 6, 0, 0, 0, "water", "abyssal", "Summon: summon two 3/3 Deep Lurker tokens with Rush.", "The horn of the depths resounds across five miles.", ["Summon"], 0.5),
    mkCard("abyssal_s_08", "Tsunami Surge", "Spell", "epic", 5, 0, 0, 0, "water", "surface", "Wipe: deals 3 damage to all enemy board creatures.", "A wall of displaced ocean sweeping the shelf.", ["Wipe"], 0.5),
    mkCard("abyssal_s_09", "Brine Pool Trap", "Spell", "rare", 3, 0, 0, 0, "earth", "deep", "Stun: stun target enemy creature for 2 turns.", "Hypersaline lake drowning all who sink within.", ["Stun"], 0.5),
    mkCard("abyssal_s_10", "Phosphor Flare", "Spell", "common", 2, 0, 0, 0, "light", "surface", "Flash: blind all enemy creatures, -2 attack for 1 turn.", "A blinding cascade of oceanic spark.", ["Flash"], 0.5),
    mkCard("abyssal_s_11", "Boiling Geyser", "Spell", "rare", 3, 0, 0, 0, "fire", "deep", "Erupt: deal 4 fire damage to target and 1 to adjacent.", "Superheated steam bursting upward.", ["Erupt"], 0.5),
    mkCard("abyssal_s_12", "Vent Eruption", "Spell", "epic", 5, 0, 0, 0, "fire", "deep", "Inferno: deals 3 damage to all non-fire creatures.", "Sulfur fire sweeping the ocean floor.", ["Inferno"], 0.5),
    mkCard("abyssal_s_13", "Entangling Kelp", "Spell", "common", 2, 0, 0, 0, "nature", "coral", "Snare: prevents target creature from attacking for 2 turns.", "Coiling stalks dragging prey downward.", ["Snare"], 0.5),
    mkCard("abyssal_s_14", "Benthic Quake", "Spell", "rare", 4, 0, 0, 0, "earth", "deep", "Tremor: deals 3 damage to an enemy creature and stuns it for 1 turn.", "The seafloor fractures under immense stress.", ["Tremor", "Stun"], 0.5),
    mkCard("abyssal_s_15", "Oceanic Shield", "Spell", "common", 2, 0, 0, 0, "water", "coral", "Barrier: grants +3 defense to target allied unit.", "Dense pressurized water deflecting steel.", ["Barrier"], 0.5),
    mkCard("abyssal_s_16", "Maelstrom Surge", "Spell", "legendary", 7, 0, 0, 0, "water", "abyssal", "Vortex: reshuffle all creatures on board back into decks.", "A vortex that devours ship and sea alike.", ["Vortex", "Wipe"], 0.5),
    mkCard("abyssal_s_17", "Thermal Vent Eruption", "Spell", "rare", 3, 0, 0, 0, "fire", "deep", "Erupt: deals 3 damage and burns target for 1.", "Scalding steam bursting through abyssal cracks.", ["Burn"], 0.5),
    mkCard("abyssal_s_18", "Deep Sea Bloom", "Spell", "rare", 3, 0, 0, 0, "earth", "coral", "Bloom: draw 2 cards and restore 2 health to your hero.", "Chemistry, not sunlight, sustains this rich benthic bloom.", ["Draw", "Heal"], 0.5),
    mkCard("abyssal_s_19", "Trench Banishment", "Spell", "epic", 5, 0, 0, 0, "void", "abyssal", "Banish: banish an enemy creature from the board.", "Where pressure crushes all matter into oblivion.", ["Banish"], 0.5),
    mkCard("abyssal_s_20", "Luminous Pearl Blessing", "Spell", "common", 1, 0, 0, 0, "light", "surface", "Luminous: restore 3 health to your hero and draw a card.", "Glowing oyster pearls radiating healing light.", ["Heal", "Draw"], 0.5)
  ]
};

DECK_PRESETS["Solar Pantheon"] = {
  deck: {
    id: "solar_pantheon_60",
    name: "Solar Pantheon",
    locale: "en",
    template: defaultTemplate({
      titleFont: "Cinzel",
      titleColor: "#f0c168",
      typeColor: "#d8a64b",
      abilityColor: "#f5e6c0",
      flavorColor: "#9a8a5a",
      costBg: "#5a3a1a",
      attackBg: "#8a4a2a",
      defenseBg: "#3a5a8a",
      backTitleColor: "#f0c168"
    }),
    rules: {
      elements: ["light", "fire", "earth", "nature", "void", "water"],
      factions: ["olympian", "titan", "mortal", "underworld"],
      keywords: ["Haste", "Divine", "Burn", "Heal", "Taunt", "Flying", "Smite", "Shield", "Draw", "Stun", "Champion", "Radiance", "Charge", "Roar", "Purify", "Valor", "Forge", "Supernova", "Buff", "Revive"],
      card_types: ["Creature", "Spell"],
      stat_ranges: { cost: { min: 0, max: 10 }, attack: { min: 0, max: 12 }, defense: { min: 0, max: 12 }, health: { min: 0, max: 20 } },
      ability_values: {},
      ability_constraints: {},
      synergy_bonuses: {}
    }
  },
  cards: [
    mkCard("solar_c_01", "Hermes Messenger", "Creature", "common", 1, 2, 1, 1, "light", "olympian", "Haste: attacks on entry turn.", "Wings on his ankles, gossip on his tongue.", ["Haste"], 0.5),
    mkCard("solar_c_02", "Temple Novice", "Creature", "common", 1, 1, 2, 2, "light", "mortal", "Heal: restores 1 health to ally.", "Tending dawn flames with reverent care.", ["Heal"], 0.5),
    mkCard("solar_c_03", "Spartan Recruit", "Creature", "common", 1, 2, 2, 2, "earth", "mortal", "Formation: +1 def if next to an ally.", "Side by side, or not at all.", ["Formation"], 0.5),
    mkCard("solar_c_04", "Apollo Archer", "Creature", "common", 2, 3, 2, 2, "fire", "olympian", "Ranged: attacks without taking retaliation.", "Golden arrows dipped in sunfire.", ["Ranged"], 0.5),
    mkCard("solar_c_05", "Shield Maiden", "Creature", "common", 2, 1, 4, 4, "light", "mortal", "Shield: absorbs first damage taken.", "A gilded shield reflecting holy light.", ["Shield"], 0.5),
    mkCard("solar_c_06", "Hydra Hatchling", "Creature", "rare", 2, 2, 2, 2, "nature", "titan", "Regrow: splits into two 1/1s upon death.", "Each severed head breeds two more.", ["Regrow"], 0.5),
    mkCard("solar_c_07", "Solar Hoplite", "Creature", "common", 3, 3, 4, 4, "light", "olympian", "Divine: +1 attack against void creatures.", "Radiant armor forged under noon skies.", ["Divine"], 0.5),
    mkCard("solar_c_08", "Minotaur Warden", "Creature", "rare", 4, 5, 4, 4, "earth", "titan", "Taunt: forces enemy attackers to target it.", "Half man, half bull, guarding the maze.", ["Taunt"], 0.5),
    mkCard("solar_c_09", "Sun Priestess", "Creature", "rare", 3, 2, 4, 4, "light", "olympian", "Bless: grants adjacent allies +1/+1.", "Chanting hymns to dawn's golden return.", ["Bless"], 0.5),
    mkCard("solar_c_10", "Pegasus Scout", "Creature", "common", 3, 3, 3, 3, "light", "olympian", "Flying: bypasses non-flying blockers.", "White as cloud, faster than the wind.", ["Flying"], 0.5),
    mkCard("solar_c_11", "Titan Centurion", "Creature", "rare", 4, 4, 5, 5, "earth", "titan", "Crush: excess damage strikes opponent face.", "Marches with the weight of mountains.", ["Crush"], 0.5),
    mkCard("solar_c_12", "Cerberus Guard", "Creature", "epic", 5, 5, 6, 6, "void", "underworld", "Multi-strike: hits 2 adjacent enemy slots.", "Three heads guarding the twilight gate.", ["Multi-strike"], 0.5),
    mkCard("solar_c_13", "Promethean Titan", "Creature", "epic", 5, 6, 6, 6, "fire", "titan", "Burn: deals 2 damage to attacker.", "Bearer of stolen divine fire.", ["Burn"], 0.5),
    mkCard("solar_c_14", "Achilles Hero", "Creature", "legendary", 6, 7, 7, 7, "light", "mortal", "Champion: takes half damage from combat hits.", "Mostly invincible is still mortal.", ["Champion"], 0.5),
    mkCard("solar_c_15", "Helios Sun Colossus", "Creature", "epic", 7, 8, 8, 8, "fire", "olympian", "Radiance: deals 2 damage to all enemies on entry.", "Blazing colossus striding through clouds.", ["Radiance"], 0.5),
    mkCard("solar_c_16", "Zeus Avatar", "Creature", "legendary", 8, 9, 10, 10, "light", "olympian", "Smite: calls lightning dealing 5 damage on entry.", "The king of gods commands the sky.", ["Smite"], 0.5),
    mkCard("solar_c_17", "Solar Guard", "Creature", "common", 2, 2, 3, 3, "light", "olympian", "Shield: absorbs 1 hit.", "Golden barrier shining bright.", ["Shield"], 0.5),
    mkCard("solar_c_18", "Flame Sprite", "Creature", "common", 1, 2, 1, 1, "fire", "olympian", "Spark: deals 1 damage when played.", "Dancing on warm altar stones.", ["Spark"], 0.5),
    mkCard("solar_c_19", "Dawn Valkyrie", "Creature", "rare", 4, 4, 4, 4, "light", "mortal", "Radiant Charge: gains +2 atk on charge.", "Spear flashing in morning skies.", ["Charge"], 0.5),
    mkCard("solar_c_20", "Sunstone Golem", "Creature", "rare", 4, 3, 6, 6, "earth", "olympian", "Fortify: gains +1 def each turn.", "Hewn from crystalline sunstone.", ["Fortify"], 0.5),
    mkCard("solar_c_21", "Underworld Shade", "Creature", "common", 2, 3, 1, 1, "void", "underworld", "Fear: attacker loses 1 attack.", "Flickering in cold subterranean gloom.", ["Fear"], 0.5),
    mkCard("solar_c_22", "Solar Drake", "Creature", "epic", 6, 6, 6, 6, "fire", "titan", "Fire Breath: deals 3 damage in a line.", "Scales radiant with trapped sunbeams.", ["Breath"], 0.5),
    mkCard("solar_c_23", "Sunlit Centaur", "Creature", "common", 3, 4, 3, 3, "nature", "mortal", "Charge: attacks on first movement.", "Galloping across sun-bleached steppes.", ["Charge"], 0.5),
    mkCard("solar_c_24", "Golden Lion", "Creature", "rare", 4, 5, 4, 4, "nature", "olympian", "Roar: adjacent allies gain +1 atk.", "Mane spun of radiant gold.", ["Roar"], 0.5),
    mkCard("solar_c_25", "Nemean Beast", "Creature", "epic", 5, 5, 7, 7, "earth", "titan", "Invulnerable: immune to weapon damage.", "Pelt unpierced by mortal bronze.", ["Armor"], 0.5),
    mkCard("solar_c_26", "Searing Phoenix", "Creature", "legendary", 7, 7, 6, 6, "fire", "olympian", "Rebirth: revives once upon defeat.", "Rising glorious from white-hot ash.", ["Rebirth"], 0.5),
    mkCard("solar_c_27", "Oasis Nymph", "Creature", "common", 2, 1, 4, 4, "water", "mortal", "Spring: heals hero 2 on turn start.", "A pool of clear water under midday sun.", ["Heal"], 0.5),
    mkCard("solar_c_28", "Sunken Spring Spirit", "Creature", "rare", 3, 2, 5, 5, "water", "olympian", "Purify: cleanses allied status ailments.", "Cool currents beneath desert sands.", ["Purify"], 0.5),
    mkCard("solar_c_29", "Eclipse Serpent", "Creature", "rare", 4, 4, 4, 4, "void", "underworld", "Eclipse: dims enemy light spells by 1.", "Coiling to swallow the morning sun.", ["Eclipse"], 0.5),
    mkCard("solar_c_30", "Twilight Stalker", "Creature", "common", 2, 3, 2, 2, "void", "underworld", "Shadowstep: bypasses taunt defenders.", "Hunting in the boundary between day and night.", ["Shadowstep"], 0.5),
    mkCard("solar_c_31", "Heliopolis Priest", "Creature", "common", 3, 2, 4, 4, "light", "mortal", "Chant: reduces sun spell costs by 1.", "Carrying the sacred solar ankh.", ["Chant"], 0.5),
    mkCard("solar_c_32", "Radiant Paladin", "Creature", "rare", 4, 4, 5, 5, "light", "mortal", "Valor: gains +1/+1 when ally falls.", "Unwavering oath of the dawn order.", ["Valor"], 0.5),
    mkCard("solar_c_33", "Vulcan Blacksmith", "Creature", "rare", 3, 2, 5, 5, "fire", "olympian", "Temper: allies gain +1 attack weapons.", "Hammering thunder into bronze blades.", ["Forge"], 0.5),
    mkCard("solar_c_34", "Blazing Ifrit", "Creature", "epic", 5, 6, 4, 4, "fire", "titan", "Combustion: explodes dealing 3 to all on death.", "Born of pure desert heatwaves.", ["Explode"], 0.5),
    mkCard("solar_c_35", "Poseidon Sovereign", "Creature", "legendary", 8, 8, 9, 9, "water", "olympian", "Earthshaker: stuns 2 enemies on entry.", "Trident striking sea and stone.", ["Stun"], 0.5),
    mkCard("solar_c_36", "Hades Lord", "Creature", "legendary", 8, 7, 10, 10, "void", "underworld", "Reap: steals 2 health from each dying creature.", "Lord of the realm no sun penetrates.", ["Reap"], 0.5),
    mkCard("solar_c_37", "Demeter Harvestkeeper", "Creature", "rare", 4, 3, 6, 6, "nature", "olympian", "Bounty: draws a card whenever mana is spent.", "Goddess of fertile fields and golden wheat.", ["Bounty"], 0.5),
    mkCard("solar_c_38", "Athena Strategist", "Creature", "legendary", 6, 6, 7, 7, "light", "olympian", "Wisdom: allies counterattack with double damage.", "Wisdom sharper than any spear.", ["Tactics"], 0.5),
    mkCard("solar_c_39", "Charon Ferryman", "Creature", "common", 2, 1, 4, 4, "void", "underworld", "Toll: opponent must pay 1 mana to attack it.", "No coin, no crossing across the Styx.", ["Toll"], 0.5),
    mkCard("solar_c_40", "Solar Dragon Sovereign", "Creature", "legendary", 9, 10, 10, 10, "fire", "olympian", "Supernova: destroys all low cost units.", "The winged terror of the blazing zenith.", ["Supernova"], 0.5),
    mkCard("solar_s_01", "Apollo's Sun Beam", "Spell", "common", 2, 0, 0, 0, "fire", "olympian", "Burn: deal 3 damage to any enemy creature.", "A focused ray that melts mortal shields.", ["Burn"], 0.5),
    mkCard("solar_s_02", "Divine Aegis", "Spell", "common", 2, 0, 0, 0, "light", "olympian", "Shield: give target allied creature Shield.", "Impenetrable blessing of dawn light.", ["Shield"], 0.5),
    mkCard("solar_s_03", "Athena's Wisdom", "Spell", "rare", 3, 0, 0, 0, "light", "olympian", "Draw: draw 2 cards from deck.", "She judged, she knew, she planned ahead.", ["Draw"], 0.5),
    mkCard("solar_s_04", "Medusa's Gaze", "Spell", "rare", 3, 0, 0, 0, "earth", "titan", "Stun: target enemy creature is stunned for 1 turn.", "A single glance turns flesh to stone.", ["Stun"], 0.5),
    mkCard("solar_s_05", "Solar Flare", "Spell", "epic", 4, 0, 0, 0, "fire", "olympian", "Burn: deal 3 damage to all enemy creatures.", "Crown of coronal fire sweeping the field.", ["Burn"], 0.5),
    mkCard("solar_s_06", "Zeus' Thunderbolt", "Spell", "legendary", 5, 0, 0, 0, "light", "olympian", "Smite: deal 7 damage to target enemy.", "The divine decree that shatters mountains.", ["Smite"], 0.5),
    mkCard("solar_s_07", "Hero's Call", "Spell", "rare", 3, 0, 0, 0, "light", "mortal", "Buff: give all allied creatures +1 attack.", "A battle cry echoing across Troy.", ["Buff"], 0.5),
    mkCard("solar_s_08", "Prometheus' Gift", "Spell", "epic", 4, 0, 0, 0, "fire", "titan", "Ramp: gain 2 temporary mana this turn.", "Fire given to ignite mortal destiny.", ["Ramp"], 0.5),
    mkCard("solar_s_09", "Sirens' Song", "Spell", "rare", 2, 0, 0, 0, "water", "titan", "Charm: take control of creature cost 3 or less.", "They sang, he listened, he surrendered.", ["Charm"], 0.5),
    mkCard("solar_s_10", "Tidal Cascade", "Spell", "common", 2, 0, 0, 0, "water", "olympian", "Wash: pushes enemy creatures back one lane.", "Spring tides sweeping coastal temples.", ["Tide"], 0.5),
    mkCard("solar_s_11", "Earth Shatter", "Spell", "common", 3, 0, 0, 0, "earth", "titan", "Quake: deals 3 damage and breaks defense.", "The ground fractures under divine fury.", ["Quake"], 0.5),
    mkCard("solar_s_12", "Nature's Bloom", "Spell", "common", 2, 0, 0, 0, "nature", "olympian", "Heal: restore 5 health to target ally.", "Blossoms flourishing under morning rays.", ["Heal"], 0.5),
    mkCard("solar_s_13", "Eclipse Shroud", "Spell", "rare", 3, 0, 0, 0, "void", "underworld", "Shroud: stealths all your units for a turn.", "Darkness blotting out midday glory.", ["Shroud"], 0.5),
    mkCard("solar_s_14", "Underworld Gate Call", "Spell", "rare", 4, 0, 0, 0, "void", "underworld", "Revive: return highest cost creature from graveyard.", "The gates open briefly for the worthy.", ["Revive"], 0.5),
    mkCard("solar_s_15", "Heavenly Light", "Spell", "common", 1, 0, 0, 0, "light", "olympian", "Dispel: removes all enemy enchantments.", "Pure dawn radiance clearing deceit.", ["Dispel"], 0.5),
    mkCard("solar_s_16", "Sun Chariot Strike", "Spell", "epic", 5, 0, 0, 0, "fire", "olympian", "Blast: deals 5 damage and burns target 2.", "Wheels of fire rolling over the sky.", ["Blast"], 0.5),
    mkCard("solar_s_17", "Olympian Decrees", "Spell", "legendary", 4, 0, 0, 0, "light", "olympian", "Decree: allied creatures cost 1 less this turn and gain +1 attack.", "Above the clouds, gods write the laws.", ["Buff"], 0.5),
    mkCard("solar_s_18", "Hephaestus Armament", "Spell", "rare", 3, 0, 0, 0, "fire", "olympian", "Forge: all allied creatures on board gain +2 attack.", "Masterwork blades forged in divine magma.", ["Forge", "Buff"], 0.5),
    mkCard("solar_s_19", "Stygian Resurgence", "Spell", "rare", 3, 0, 0, 0, "void", "underworld", "Revive: summon a random fallen creature with 3 cost or less.", "Souls returning from the dark shores.", ["Revive"], 0.5),
    mkCard("solar_s_20", "Apollo's Elixir", "Spell", "common", 2, 0, 0, 0, "water", "mortal", "Heal: restore 4 health to hero and draw 1 card.", "Sacred waters scooped from Apollo's shrine.", ["Heal", "Draw"], 0.5)
  ]
};

DECK_PRESETS["Primeval Dominion"] = {
  deck: {
    id: "primeval_dominion_60",
    name: "Primeval Dominion",
    locale: "en",
    template: defaultTemplate({
      titleFont: "Cinzel",
      titleColor: "#a3e635",
      typeColor: "#84cc16",
      abilityColor: "#ecfccb",
      flavorColor: "#65a30d",
      costBg: "#14532d",
      attackBg: "#854d0e",
      defenseBg: "#166534",
      backTitleColor: "#a3e635"
    }),
    rules: {
      elements: ["nature", "earth", "fire", "water", "light", "void"],
      factions: ["beast", "ancient", "grove", "feral"],
      keywords: ["Rush", "Taunt", "Regenerate", "Trample", "Ramp", "Enrage", "Poison", "Draw", "Armor", "Speed", "Petrify", "Regrowth", "Crush", "Ignite", "Amphibious", "Dive", "Phasing", "Camouflage", "Bleed", "Cataclysm"],
      card_types: ["Creature", "Spell"],
      stat_ranges: { cost: { min: 0, max: 10 }, attack: { min: 0, max: 12 }, defense: { min: 0, max: 12 }, health: { min: 0, max: 20 } },
      ability_values: {},
      ability_constraints: {},
      synergy_bonuses: {}
    }
  },
  cards: [
    mkCard("primeval_c_01", "Bramble Wolf", "Creature", "common", 1, 2, 1, 1, "nature", "feral", "Rush: strikes on entry turn.", "Prowling swiftly through dense undergrowth.", ["Rush"], 0.5),
    mkCard("primeval_c_02", "Sporeling", "Creature", "common", 1, 1, 2, 2, "nature", "grove", "Poison: applies 1 damage over time.", "Tiny caps puffing toxic spores.", ["Poison"], 0.5),
    mkCard("primeval_c_03", "Stone Mole", "Creature", "common", 1, 1, 3, 3, "earth", "ancient", "Armor: takes 1 less combat damage.", "Tunneling through solid granite strata.", ["Armor"], 0.5),
    mkCard("primeval_c_04", "Wild Raptor", "Creature", "common", 2, 3, 2, 2, "nature", "feral", "Speed: can attack open lane directly.", "Leaping from shadow with bared talons.", ["Speed"], 0.5),
    mkCard("primeval_c_05", "Barkskin Dryad", "Creature", "common", 2, 2, 4, 4, "nature", "grove", "Taunt: protects neighboring allies.", "Skin of oak and heart of ancient sap.", ["Taunt"], 0.5),
    mkCard("primeval_c_06", "Ironwood Treant", "Creature", "rare", 3, 2, 6, 6, "earth", "ancient", "Regenerate: restores 2 health each turn.", "A walking tree older than human speech.", ["Regenerate"], 0.5),
    mkCard("primeval_c_07", "Feral Bear", "Creature", "common", 3, 4, 4, 4, "nature", "beast", "Enrage: +2 attack when damaged.", "A roar that rattles the valley walls.", ["Enrage"], 0.5),
    mkCard("primeval_c_08", "Grove Tender", "Creature", "rare", 3, 2, 3, 3, "nature", "grove", "Ramp: gain +1 permanent max mana.", "Nurturing seeds of primordial giants.", ["Ramp"], 0.5),
    mkCard("primeval_c_09", "Granite Golem", "Creature", "rare", 4, 4, 6, 6, "earth", "ancient", "Taunt: absorbs attacks for the hero.", "Carved from mountain stone by ancient magic.", ["Taunt"], 0.5),
    mkCard("primeval_c_10", "Savage Tiger", "Creature", "common", 4, 5, 4, 4, "nature", "beast", "Rush: leaps into combat immediately.", "Stripes blending into golden ferns.", ["Rush"], 0.5),
    mkCard("primeval_c_11", "Ancient Basilisk", "Creature", "epic", 5, 5, 6, 6, "earth", "beast", "Petrify: target creature cannot untap.", "Cold eyes that turn warm blood to clay.", ["Petrify"], 0.5),
    mkCard("primeval_c_12", "Bramble Hydra", "Creature", "epic", 5, 6, 5, 5, "nature", "grove", "Regrowth: heals to full when slaying an enemy.", "Vines that knit together after every blow.", ["Regrowth"], 0.5),
    mkCard("primeval_c_13", "Colossus of Roots", "Creature", "epic", 6, 7, 8, 8, "earth", "ancient", "Trample: excess damage hits hero face.", "Roots tearing through soil like living siege rams.", ["Trample"], 0.5),
    mkCard("primeval_c_14", "Apex Mammoth", "Creature", "legendary", 7, 8, 9, 9, "earth", "ancient", "Crush: sweeps through enemy defenses.", "Tusks of ivory carved by glaciers.", ["Crush"], 0.5),
    mkCard("primeval_c_15", "Primeval World-Tree", "Creature", "legendary", 8, 9, 11, 11, "nature", "grove", "Overgrowth: summons two 4/4 Treants.", "The heartwood of the primeval realm.", ["Overgrowth"], 0.5),
    mkCard("primeval_c_16", "Forest Spriggan", "Creature", "common", 2, 2, 2, 2, "nature", "grove", "Quick: early dropped scout.", "A mischievous twig spirit darting between roots.", ["Quick"], 0.5),
    mkCard("primeval_c_17", "Volcanic Tyrannosaur", "Creature", "legendary", 8, 9, 8, 8, "fire", "feral", "Molten Roar: deals 3 damage to all enemies.", "The apex predator walking on cooled magma.", ["Roar"], 0.5),
    mkCard("primeval_c_18", "Ashfang Raptor", "Creature", "common", 2, 3, 1, 1, "fire", "feral", "Ignite: burns target for 1 extra damage.", "Hunting through smoking ash fields.", ["Ignite"], 0.5),
    mkCard("primeval_c_19", "Magma Scutosaur", "Creature", "rare", 4, 3, 6, 6, "fire", "ancient", "Shell: reflects 1 damage to melee attackers.", "Plated carapace glowing with internal heat.", ["Reflect"], 0.5),
    mkCard("primeval_c_20", "River Spinosaurus", "Creature", "epic", 6, 7, 7, 7, "water", "beast", "Amphibious: gains +2 attack in water lanes.", "Sail crest cutting through primeval rivers.", ["Amphibious"], 0.5),
    mkCard("primeval_c_21", "Prehistoric Crocodile", "Creature", "rare", 4, 5, 5, 5, "water", "feral", "Death Roll: drags target underwater.", "Unchanged for sixty million years.", ["Grip"], 0.5),
    mkCard("primeval_c_22", "Marsh Brontosaur", "Creature", "epic", 7, 6, 10, 10, "water", "ancient", "Immense: takes half damage from spells.", "Steps that create freshwater lakes.", ["Immense"], 0.5),
    mkCard("primeval_c_23", "Sunwing Pterodactyl", "Creature", "common", 3, 3, 2, 2, "light", "beast", "Flying: ignores non-flying defenders.", "Gliding on thermal updrafts beneath the sun.", ["Flying"], 0.5),
    mkCard("primeval_c_24", "Skyterror Quetzal", "Creature", "epic", 6, 6, 6, 6, "light", "ancient", "Dive: deals double damage when attacking first.", "A winged giant blotting out the morning sky.", ["Dive"], 0.5),
    mkCard("primeval_c_25", "Dawn Raptor", "Creature", "rare", 3, 4, 3, 3, "light", "feral", "Haste: attacks on entry turn.", "Crest glowing with sunrise luminescence.", ["Haste"], 0.5),
    mkCard("primeval_c_26", "Fossil Wraith", "Creature", "rare", 4, 4, 4, 4, "void", "ancient", "Phasing: 50% chance to dodge attacks.", "Petrified bones animated by ghost currents.", ["Phasing"], 0.5),
    mkCard("primeval_c_27", "Bone Scavenger", "Creature", "common", 1, 2, 1, 1, "void", "feral", "Scavenge: gains +1 atk when an ally dies.", "Feasting on ancient extinction beds.", ["Scavenge"], 0.5),
    mkCard("primeval_c_28", "Chasm Tar Wurm", "Creature", "epic", 5, 5, 7, 7, "void", "ancient", "Entomb: entangles attackers in pitch tar.", "Emerging from prehistoric tar pits.", ["Entomb"], 0.5),
    mkCard("primeval_c_29", "Canopy Chameleon", "Creature", "common", 2, 2, 3, 3, "nature", "grove", "Camouflage: cannot be attacked first turn.", "Shifting colors to match lush rainforest leaves.", ["Stealth"], 0.5),
    mkCard("primeval_c_30", "Ironwood Gorilla", "Creature", "rare", 4, 5, 5, 5, "earth", "beast", "Chest Beat: stuns weak enemy units.", "Pounding fists that shake the canopy.", ["Stun"], 0.5),
    mkCard("primeval_c_31", "Saber-toothed Stalker", "Creature", "rare", 3, 4, 3, 3, "nature", "feral", "Bleed: deals 1 damage each turn to wounded prey.", "Curved canines honed for ancient prey.", ["Bleed"], 0.5),
    mkCard("primeval_c_32", "Dire Wolf Packleader", "Creature", "rare", 4, 4, 4, 4, "nature", "beast", "Howl: allied Beasts gain +1/+1.", "Leading the winter pack across tundra valleys.", ["Buff"], 0.5),
    mkCard("primeval_c_33", "Terrasaur Colossus", "Creature", "legendary", 8, 8, 10, 10, "earth", "ancient", "Earthquake: damages all non-flying units.", "A walking mountain shaking the primeval soil.", ["Quake"], 0.5),
    mkCard("primeval_c_34", "Amber Beetle", "Creature", "common", 1, 1, 3, 3, "earth", "grove", "Preserve: traps dead cards in amber for redraw.", "Sealed in hardened golden resin.", ["Preserve"], 0.5),
    mkCard("primeval_c_35", "Carnivorous Bloom", "Creature", "common", 2, 2, 4, 4, "nature", "grove", "Snare: swallows small creatures whole.", "Vibrant petals masking a fatal trap.", ["Snare"], 0.5),
    mkCard("primeval_c_36", "Pyroclast Drake", "Creature", "epic", 5, 6, 5, 5, "fire", "ancient", "Fireburst: deals 2 damage to all board units.", "Wings shedding burning volcanic embers.", ["Burn"], 0.5),
    mkCard("primeval_c_37", "Tidal Plesiosaur", "Creature", "rare", 4, 4, 6, 6, "water", "beast", "Swim: bypasses frontline taunt defenders.", "Paddling through mist-shrouded lagoons.", ["Swim"], 0.5),
    mkCard("primeval_c_38", "Aurora Moth", "Creature", "rare", 3, 2, 5, 5, "light", "grove", "Silk: grants +2 defense to an ally.", "Wings shimmering like the northern lights.", ["Silk"], 0.5),
    mkCard("primeval_c_39", "Shadowstalker Panther", "Creature", "rare", 4, 5, 3, 3, "void", "feral", "Prowl: cannot be targeted by spells.", "A black shape gliding through jungle night.", ["Prowl"], 0.5),
    mkCard("primeval_c_40", "Extinction Titan", "Creature", "legendary", 9, 10, 9, 9, "fire", "ancient", "Cataclysm: deals 5 damage to all enemy board creatures.", "The comet's herald bringing the primeval dusk.", ["Cataclysm", "Wipe"], 0.5),
    mkCard("primeval_s_01", "Noxious Spores", "Spell", "common", 2, 0, 0, 0, "nature", "grove", "Poison: deals 2 damage to two enemy creatures.", "Choking green fog rising from the forest floor.", ["Poison"], 0.5),
    mkCard("primeval_s_02", "Barkskin Infusion", "Spell", "common", 2, 0, 0, 0, "nature", "ancient", "Buff: grants target ally +1/+3.", "Thick ancient bark hardening over flesh.", ["Buff"], 0.5),
    mkCard("primeval_s_03", "Primal Roar", "Spell", "common", 3, 0, 0, 0, "nature", "beast", "Buff: all allied beasts gain +2 attack this turn.", "The savage call of ancient instincts.", ["Buff"], 0.5),
    mkCard("primeval_s_04", "Wild Growth", "Spell", "rare", 3, 0, 0, 0, "nature", "grove", "Ramp: permanently increases max mana by 1.", "Life surging through fertile primeval soil.", ["Ramp"], 0.5),
    mkCard("primeval_s_05", "Entangling Roots", "Spell", "rare", 3, 0, 0, 0, "earth", "grove", "Stun: immobilizes 2 enemy creatures.", "Vines tightening like steel ropes.", ["Stun"], 0.5),
    mkCard("primeval_s_06", "Nature's Wrath", "Spell", "epic", 4, 0, 0, 0, "nature", "ancient", "Damage: deals 5 damage to target enemy.", "The forest strikes back against invaders.", ["Damage"], 0.5),
    mkCard("primeval_s_07", "Cataclysmic Quake", "Spell", "epic", 5, 0, 0, 0, "earth", "ancient", "Wipe: deals 4 damage to all board creatures.", "Tectonic upheaval tearing valleys open.", ["Wipe"], 0.5),
    mkCard("primeval_s_08", "Primal Bloom", "Spell", "legendary", 4, 0, 0, 0, "nature", "grove", "Draw: draw 3 cards and restore 4 health.", "A rare blossom flowering once a century.", ["Draw", "Heal"], 0.5),
    mkCard("primeval_s_09", "Volcanic Eruption", "Spell", "rare", 4, 0, 0, 0, "fire", "ancient", "Erupt: deal 4 fire damage to target unit.", "Lava raining from smoking crater peaks.", ["Burn"], 0.5),
    mkCard("primeval_s_10", "Firefang Strike", "Spell", "common", 2, 0, 0, 0, "fire", "feral", "Strike: deal 3 damage and burn target.", "Blazing jaws snapping in the brush.", ["Strike"], 0.5),
    mkCard("primeval_s_11", "Tidal Inundation", "Spell", "common", 3, 0, 0, 0, "water", "ancient", "Wash: washes away enemy buffs.", "Swelling floodwaters cleansing the jungle.", ["Wash"], 0.5),
    mkCard("primeval_s_12", "River Flash Flood", "Spell", "rare", 3, 0, 0, 0, "water", "feral", "Flood: returns enemy unit cost 3 or less.", "Raging rapids sweeping away all in their path.", ["Bounce"], 0.5),
    mkCard("primeval_s_13", "Solar Radiance Surge", "Spell", "common", 2, 0, 0, 0, "light", "beast", "Radiance: blinds enemy attacker.", "Blinding sunlight breaking through canopy gaps.", ["Flash"], 0.5),
    mkCard("primeval_s_14", "Pterosaur Dive", "Spell", "rare", 3, 0, 0, 0, "light", "beast", "Dive: deal 4 damage to backline unit.", "Swooping like a spear from high clouds.", ["Dive"], 0.5),
    mkCard("primeval_s_15", "Extinction Meteor", "Spell", "legendary", 7, 0, 0, 0, "void", "ancient", "Meteor: destroy 2 strongest enemy creatures.", "The blazing stone that ended an epoch.", ["Destroy"], 0.5),
    mkCard("primeval_s_16", "Fossil Curse", "Spell", "rare", 3, 0, 0, 0, "void", "ancient", "Curse: reduces target attack to 0 for 2 turns.", "Petrifying marrow into cold limestone.", ["Curse"], 0.5),
    mkCard("primeval_s_17", "Canopy Camouflage", "Spell", "rare", 3, 0, 0, 0, "nature", "grove", "Camouflage: allied creatures cannot be targeted by spells this turn.", "Miles of green leaves shielding from all above.", ["Cover"], 0.5),
    mkCard("primeval_s_18", "Primal Spring Surge", "Spell", "common", 2, 0, 0, 0, "water", "ancient", "Heal: restore 4 health to lowest-health creature and 2 to your hero.", "Pure mineral water bubbling from deep strata.", ["Heal"], 0.5),
    mkCard("primeval_s_19", "Tectonic Monolith", "Spell", "rare", 3, 0, 0, 0, "earth", "ancient", "Fortify: all allied creatures on board gain +2 defense.", "Ancient stones raising impassable ramparts.", ["Fortify"], 0.5),
    mkCard("primeval_s_20", "Caldera Eruption", "Spell", "legendary", 5, 0, 0, 0, "fire", "ancient", "Erupt: deals 3 damage to all enemy units and burns them for 1.", "A smoking cauldron raining primeval molten rock.", ["Burn", "Wipe"], 0.5)
  ]
};

Object.values(DECK_PRESETS).forEach(preset => {
  preset.cards = preset.cards.map(c => materialiseLayers(c, preset.deck.template));
});

export const TOPIC_DATA = {};
export const TOPIC_META = {};
Object.entries(DECK_PRESETS).forEach(([name, preset]) => {
  TOPIC_DATA[name] = preset.cards;
  TOPIC_META[name] = {
    locale: preset.deck.locale,
    elements: preset.deck.rules?.elements || [],
    factions: preset.deck.rules?.factions || [],
    keywords: preset.deck.rules?.keywords || [],
  };
});

export function getDeckTemplate(topic) { return DECK_PRESETS[topic]?.deck?.template || null; }
export function getDeckRules(topic) { return DECK_PRESETS[topic]?.deck?.rules || null; }

export const MOCK_TOPIC = "Abyssal Depths";
export const MOCK_CARDS = TOPIC_DATA["Abyssal Depths"] || TOPIC_DATA["Deep Sea Creatures"];

function pickDeck(topic, indices) {
  const cards = TOPIC_DATA[topic] || [];
  return indices.map(i => cards[i]?.id).filter(Boolean);
}
export const MOCK_DECK_A = pickDeck("Deep Sea Creatures", [0,1,3,5,6,7,9,11,13,14,15,4]);
export const MOCK_DECK_B = pickDeck("Deep Sea Creatures", [1,2,7,10,12,6,9,14,8,11,5,3]);

export const MOCK_BALANCE_ITERS = [
  { iter: 0,  variance: 0.184, entropy: 0.42, topDeck: 0.71, length: 6.2 },
  { iter: 1,  variance: 0.171, entropy: 0.46, topDeck: 0.68, length: 6.4 },
  { iter: 2,  variance: 0.152, entropy: 0.51, topDeck: 0.65, length: 6.5 },
  { iter: 3,  variance: 0.139, entropy: 0.54, topDeck: 0.63, length: 6.8 },
  { iter: 4,  variance: 0.121, entropy: 0.58, topDeck: 0.61, length: 7.0 },
  { iter: 5,  variance: 0.108, entropy: 0.61, topDeck: 0.58, length: 7.2 },
  { iter: 6,  variance: 0.094, entropy: 0.64, topDeck: 0.56, length: 7.5 },
  { iter: 7,  variance: 0.081, entropy: 0.67, topDeck: 0.54, length: 7.6 },
  { iter: 8,  variance: 0.072, entropy: 0.70, topDeck: 0.53, length: 7.8 },
  { iter: 9,  variance: 0.063, entropy: 0.72, topDeck: 0.52, length: 7.9 },
  { iter: 10, variance: 0.057, entropy: 0.74, topDeck: 0.51, length: 8.0 },
  { iter: 11, variance: 0.052, entropy: 0.75, topDeck: 0.51, length: 8.1 },
  { iter: 12, variance: 0.049, entropy: 0.76, topDeck: 0.50, length: 8.1 },
];

export const MOCK_MATCH = [
  { turn: 1, side: "A", action: "plays", card: "Lanternfish Scout", note: "scouts top 2 cards" },
  { turn: 1, side: "B", action: "plays", card: "Bioluminescent Jelly", note: "" },
  { turn: 2, side: "A", action: "plays", card: "Bone-eating Worm", note: "" },
  { turn: 2, side: "B", action: "plays", card: "Gulper Eel", note: "" },
  { turn: 3, side: "A", action: "casts", card: "Pressure Wave", note: "returns Gulper Eel to hand" },
  { turn: 3, side: "B", action: "plays", card: "Vampire Squid", note: "enters cloaked" },
  { turn: 4, side: "A", action: "plays", card: "Hydrothermal Vent", note: "+1/+1 to Abyssal" },
  { turn: 4, side: "B", action: "attacks", card: "Vampire Squid", note: "deals 3 to player A" },
  { turn: 5, side: "A", action: "plays", card: "Anglerfish Lure", note: "lure active" },
  { turn: 5, side: "B", action: "plays", card: "Frilled Shark Strike", note: "kills Lanternfish Scout" },
  { turn: 6, side: "A", action: "plays", card: "Coelacanth Elder", note: "cost reduced to 4" },
  { turn: 6, side: "B", action: "plays", card: "Black Smoker Reef", note: "mineral bloom" },
  { turn: 7, side: "A", action: "attacks", card: "Coelacanth Elder", note: "deals 5 to player B" },
  { turn: 7, side: "B", action: "casts", card: "Giant Squid Ambush", note: "5 dmg split" },
  { turn: 8, side: "A", action: "plays", card: "Tube Worm Colony", note: "symbiosis +1 def" },
  { turn: 8, side: "B", action: "plays", card: "Dumbo Octopus", note: "" },
  { turn: 9, side: "A", action: "casts", card: "Leviathan Awakens", note: "summons 9/9, destroys terrains" },
  { turn: 9, side: "B", action: "concedes", card: "—", note: "Deck A wins · 18 damage lethal" },
];

export const MOCK_HEATMAP_LABELS = ["Anglerfish","Jelly","Squid Amb.","Vent","Coelacanth","Vampire Sq.","Pressure W.","Gulper Eel","Leviathan","Bone Worm","Smoker","Frilled Sh.","Dumbo","Trench","Lanternfish","Tube Worm"];

export const MOCK_HEATMAP = (() => {
  const n = 16;
  const m = Array.from({length: n}, () => Array(n).fill(0));
  const seed = [0.78,0.62,0.41,0.55,0.34,0.71,0.58,0.66,0.18,0.49,0.43,0.61,0.52,0.29,0.69,0.44];
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) { m[i][j] = seed[i]; continue; }
      const base = (seed[i] + seed[j]) / 2;
      const noise = ((i * 7 + j * 13) % 11) / 40 - 0.12;
      const synergy = (i + j) % 5 === 0 ? 0.18 : 0;
      m[i][j] = Math.max(0.05, Math.min(0.95, base * 0.7 + noise + synergy));
    }
  }
  for (let i = 0; i < n; i++) for (let j = i+1; j < n; j++) m[j][i] = m[i][j];
  return m;
})();
