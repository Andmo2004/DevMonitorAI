import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from app.services.ml_predictions import generate_predictions

async def main():
    engine = create_async_engine("sqlite+aiosqlite:///./dev.db")
    async with AsyncSession(engine) as db:
        try:
            res = await generate_predictions(db, days_history=60)
            print("Success")
        except Exception as e:
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())
