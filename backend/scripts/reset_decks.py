"""Reset decks in the database: remove old scrambled test decks and seed clean 60-card meta decks."""
import asyncio
from sqlalchemy import select, delete
from app.db.database import SessionFactory
from app.db.orm import DeckRow, CardRow, BuildRun
from app.balance.meta_decks import (
    get_abyssal_depths_60,
    get_solar_pantheon_60,
    get_primeval_dominion_60,
)
from app.db import repository as repo

async def reset():
    async with SessionFactory() as session:
        print("Cleaning up old scrambled decks and build runs...")
        await session.execute(delete(BuildRun))
        await session.execute(delete(CardRow))
        await session.execute(delete(DeckRow))
        await session.commit()
        print("Scrambled decks removed.")

        meta_decks = [
            get_abyssal_depths_60(),
            get_solar_pantheon_60(),
            get_primeval_dominion_60(),
        ]

        for deck in meta_decks:
            print(f"Seeding {deck.name} ({len(deck.cards)} cards, theme: {deck.theme})...")
            await repo.save_or_update_deck(session, deck)

        print("Finished seeding clean 60-card decks!")

if __name__ == "__main__":
    asyncio.run(reset())
