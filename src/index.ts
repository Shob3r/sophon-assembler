import { Elysia, t } from 'elysia';
import { CloudflareAdapter } from './adapters/Cloudflare';
import { GameCode, Languages } from './types';
import { env } from 'cloudflare:workers';

const GameSchema = t.Object({
    game: t.Unsafe<GameCode>(t.String()),
});
const LanguageSchema = t.Object({
    game: t.Unsafe<GameCode>(t.String()),
    language: t.Unsafe<Languages>(t.String()),
});

export const streamR2File = async (filename: string): Promise<Response> => {
    const bucket = (env as unknown as CloudflareBindings).SOPHON_CHUNKS;
    console.log(filename);
    const object = await bucket.get(filename);
    if (!object) {
        throw new Error('Object returned null');
    }
    return new Response(object.body, {
        headers: { 'Content-Type': 'application/json' },
    });
};

export const streamR2FilesAsArray = async (
    filenames: string[],
): Promise<Response> => {
    const bucket = (env as unknown as CloudflareBindings).SOPHON_CHUNKS;

    const objects = await Promise.all(
        filenames.map(async (filename) => {
            const object = await bucket.get(filename);
            if (!object) throw new Error(`Object ${filename} returned null`);
            return object;
        }),
    );

    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();

    (async () => {
        await writer.write(encoder.encode('['));
        for (let i = 0; i < objects.length; i++) {
            const reader = objects[i].body.getReader();
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                await writer.write(value);
            }
            if (i < objects.length - 1) {
                await writer.write(encoder.encode(','));
            }
        }
        await writer.write(encoder.encode(']'));
        await writer.close();
    })();

    return new Response(readable, {
        headers: { 'Content-Type': 'application/json' },
    });
};

const gameExists = (game: string) => {
    return [
        'bh3-global',
        'bh3-jp',
        'bh3-kr',
        'bh3-sea',
        'bh3-tw',
        'hk4e',
        'hkrpg',
        'nap',
    ].includes(game);
};

const audioLanguageExists = (game: string, language: string) => {
    return (
        (['bh3-global', 'bh3-jp', 'bh3-kr'].includes(game) &&
            language === 'jp') ||
        (['bh3-tw', 'bh3-sea'].includes(game) && language === 'cn') ||
        (['hk4e', 'hkrpg', 'nap'].includes(game) &&
            ['cn', 'en', 'jp', 'kr'].includes(language))
    );
};

export default new Elysia({ adapter: CloudflareAdapter })
    .get('/', async () => {
        const games = [
            'bh3-global',
            'bh3-jp',
            'bh3-kr',
            'bh3-sea',
            'bh3-tw',
            'hk4e',
            'hkrpg',
            'nap',
        ] as const;
        return streamR2FilesAsArray(games.map((g) => `${g}-gameChunks.json`));
    })
    .get(
        '/:game',
        async ({ params: { game } }) => {
            if (!gameExists(game))
                throw new Error('Requested game does not exist');
            return streamR2File(`${game}-gameChunks.json`);
        },
        { params: GameSchema },
    )
    .get(
        '/:game/voice',
        async ({ params: { game } }) => {
            if (!gameExists(game))
                throw new Error('Requested game does not exist');

            if (['bh3-global', 'bh3-jp', 'bh3-kr'].includes(game)) {
                return streamR2File(`${game}-voiceChunks-jp.json`);
            }
            if (['bh3-sea', 'bh3-tw'].includes(game)) {
                return streamR2File(`${game}-voiceChunks-cn.json`);
            }
            return streamR2FilesAsArray(
                ['cn', 'en', 'jp', 'kr'].map(
                    (lang) => `${game}-voiceChunks-${lang}.json`,
                ),
            );
        },
        { params: GameSchema },
    )
    .get(
        '/:game/voice/:language',
        async ({ params: { game, language } }) => {
            if (!gameExists(game))
                throw new Error('Requested game does not exist');
            if (!audioLanguageExists(game, language)) {
                throw new Error(
                    'Requested voice-over language chunk data does not exist',
                );
            }
            return streamR2File(`${game}-voiceChunks-${language}.json`);
        },
        { params: LanguageSchema },
    )
    .compile()
    .listen(3000);
