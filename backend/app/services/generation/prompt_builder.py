def build_card_generation_prompt(topic: str) -> str:
    return (
        'Generate exactly 10 trading cards in JSON for topic: '
        f'"{topic}". Return an object with a "cards" array where each card contains: '
        'card_id, name, flavour_text, ability_name, ability_description, ability_type, rarity, theme_tags. '
        'Rarity must be one of common, uncommon, rare, legendary.'
    )
