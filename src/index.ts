import { Elysia, t } from 'elysia';
import { GameCode, Languages } from './types';
import {
    getAllGameChunks,
    getAllVoiceChunks,
    getGameChunks,
    getVoiceChunk,
} from './ManifestResolver';

const GameSchema = t.Object({
    game: t.Unsafe<GameCode>(t.String()),
});

const LanguageSchema = t.Object({
    game: t.Unsafe<GameCode>(t.String()),
    language: t.Unsafe<Languages>(t.String()),
});

// Will replace these functions with db fetch later
const app = new Elysia()
    .get('/', async () => await getAllGameChunks())
    .get('/:game', async ({ params: { game } }) => await getGameChunks(game), {
        params: GameSchema,
    })
    .get(
        '/:game/voice',
        async ({ params: { game } }) => await getAllVoiceChunks(game),
        {
            params: GameSchema,
        },
    )
    .get(
        '/:game/voice/:language',
        async ({ params: { game, language } }) => {
            return await getVoiceChunk(game, language);
        },
        {
            params: LanguageSchema,
        },
    )
    .listen(3000);

console.log(
    `🖥️ Endpoint started at http://${app.server?.hostname}:${app.server?.port}`,
);
