import { Elysia, t } from 'elysia';
import { getProtobufData } from './ProtobufParse';
import { GameCode } from './types';

const app = new Elysia()
    .get('/', () => 'Select a sub-url!')
    .get(
        '/:game',
        ({ params: { game } }) => {
            'test';
        },
        {
            params: t.Object({
                game: t.Unsafe<GameCode>(t.String()),
            }),
        },
    )
    .get('/test', () => 'this is a test page')
    .listen(3000);

console.log(
    `🖥️ Endpoint started at http://${app.server?.hostname}:${app.server?.port}`,
);
