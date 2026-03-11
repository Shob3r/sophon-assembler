import { getProtobufData } from './ProtobufParse';
import { GameCode, Languages } from './types';

const getManifestIndex = (game: GameCode, voiceLanguage: Languages) => {
    if (game.toString().includes('bh3')) {
        return 1;
    } else {
        switch (voiceLanguage) {
            case 'cn':
                return 1;
            case 'en':
                return 2;
            case 'jp':
                return 3;
            case 'kr':
                return 4;
        }
    }
};

export const getAllGameChunks = async () => {
    let json = [];

    let gameCodes: GameCode[] = [
        'bh3-global',
        'bh3-jp',
        'bh3-kr',
        'bh3-sea',
        'bh3-tw',
        'hk4e',
        'hkrpg',
        'nap',
    ];

    for (let i = 0; i < gameCodes.length; i++) {
        const res = await getProtobufData(gameCodes[i], 0);
        json.push({
            game: gameCodes[i].toString(),
            chunks: res,
        });
    }
    return json;
};

export const getGameChunks = async (game: GameCode) => {
    return await getProtobufData(game, 0);
};

export const getAllVoiceChunks = async (game: GameCode) => {
    if (game.toString().includes('bh3')) {
        return await getProtobufData(game, 1);
    }
    let json = [];
    for (let i = 1; i <= 4; i++) {
        const res = await getProtobufData(game, i);
        json.push(res);
    }
    return json;
};

export const getVoiceChunk = async (game: GameCode, language: Languages) => {
    const gameName = game.toString();
    const languageName = language.toString();
    if (['bh3-tw', 'bh3-sea'].includes(gameName)) {
        if (languageName !== 'cn') {
            throw new Error('Requested Language does not exist for game');
        }
        return await getProtobufData(game, 1);
    } else if (['bh3-kr', 'bh3-jp', 'bh3-global'].includes(gameName)) {
        if (languageName !== 'jp') {
            throw new Error('Requested language does not exist for game');
        }
        return await getProtobufData(game, 1);
    }

    const index = getManifestIndex(game, language);
    return await getProtobufData(game, index);
};
