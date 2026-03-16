import { Elysia, t } from 'elysia';
import { CloudflareAdapter } from './adapters/Cloudflare';
import { GameCode, Languages } from './types';
import { env } from 'cloudflare:workers';
import { cors } from '@elysiajs/cors';

const GameSchema = t.Object({
    game: t.Unsafe<GameCode>(t.String()),
});

const LanguageSchema = t.Object({
    game: t.Unsafe<GameCode>(t.String()),
    language: t.Unsafe<Languages>(t.String()),
});

export const getR2File = async (filename: string) => {
    const bucket = (env as unknown as CloudflareBindings).SOPHON_CHUNKS;
    console.log(filename);
    const object = await bucket.get(filename);
    if (!object) {
        throw new Error('Object returned null');
    }

    return JSON.parse(await object.text());
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

// Will replace these functions with db fetch later
export default new Elysia({ adapter: CloudflareAdapter }).use(cors())
    .get('/', async () => {
        let res: any = [];

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

        for (let i = 0; i < games.length; i++) {
            const obj = await getR2File(`${games[i]}-gameChunks.json`);
            res.push(obj);
        }
        return res;
    })
    .get(
        '/:game',
        async ({ params: { game } }) => {
            if (!gameExists(game)) {
                throw new Error('Requested game does not exist');
            }
            return await getR2File(`${game}-gameChunks.json`);
        },
        {
            params: GameSchema,
        },
    )
    .get(
        '/:game/voice',
        async ({ params: { game } }) => {
            if (!gameExists(game)) {
                throw new Error('Requested game does not exist');
            }

            if (['bh3-global', 'bh3-jp', 'bh3-kr'].includes(game)) {
                return await getR2File(`${game}-voiceChunks-jp.json`);
            } else if (['bh3-sea', 'bh3-tw'].includes(game)) {
                return await getR2File(`${game}-voiceChunks-cn.json`);
            }

            const languages = ['cn', 'en', 'jp', 'kr'];
            let res = [];
            for (let i = 0; i < languages.length; i++) {
                const obj = await getR2File(
                    `${game}-voiceChunks-${languages[i]}.json`,
                );
                res.push(obj);
            }
            return res;
        },
        {
            params: GameSchema,
        },
    )
    .get(
        '/:game/voice/:language',
        async ({ params: { game, language } }) => {
            if (!gameExists(game)) {
                throw new Error('Requested game does not exist');
            }

            if (!audioLanguageExists(game, language)) {
                throw new Error(
                    'Requested voice-over language chunk data does not exist',
                );
            }
            return await getR2File(`${game}-voiceChunks-${language}.json`);
        },
        {
            params: LanguageSchema,
        },
    )
    .compile()
    .listen(3000);
