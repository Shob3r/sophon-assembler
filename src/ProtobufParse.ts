import { zstdDecompress } from 'bun';
import { Reader } from 'protobufjs/minimal';
import {
    FrontDoor,
    FrontDoorGameBranch,
    GameBranchInfo,
    GameManifest,
} from './types';

const LAUNCHER_ID = 'VYTpXlbWo8';
const HYV_FRONT_DOOR = `https://sg-hyp-api.hoyoverse.com/hyp/hyp-connect/api/getGameBranches?=gopR6Cufr3&launcher_id=${LAUNCHER_ID}`;

type GameCode = 'bh3' | 'hk4e' | 'hkrpg' | 'nap';

export const getProtobufData = async (gameCode: GameCode) => {
    const frontDoorResponse = await fetch(HYV_FRONT_DOOR);
    if (frontDoorResponse.status === 200) {
        const frontDoor: FrontDoor = await frontDoorResponse.json();
        const manifestResponse = await fetch(
            assembleManifestURL(
                frontDoor.data.game_branches[getGameCodeIndex(gameCode)],
            ),
        );
        if (manifestResponse.status === 200) {
            const rawManifestData: GameBranchInfo =
                await manifestResponse.json();

            const manifestData: GameManifest =
                rawManifestData.data.manifests[0];

            const chunkPrefix = manifestData.chunk_download.url_prefix;
            const manifestPrefix = manifestData.manifest_download.url_prefix;
            const protobufURL = `${manifestPrefix}/${manifestData.manifest.id}`;

            const manifestFile = await (await fetch(protobufURL)).arrayBuffer(); // oh my lord
            const encodedManifestData = await zstdDecompress(manifestFile);
            return mapManifest(encodedManifestData, chunkPrefix);
        }
        throw new Error(
            `Manifest responded with status code ${manifestResponse.status}`,
        );
    }
    throw new Error(
        `Front Door responded with status code ${frontDoorResponse.status}`,
    );
};

type ProtoValue = string | number | ProtoObject;
type ProtoObject = { [field: string]: ProtoValue | ProtoValue[] };

const mapManifest = (buf: Buffer | Uint8Array, cdnUrlPrefix: string) => {
    const raw = decodeProtobuf(buf);

    const rawFiles = Array.isArray(raw['1'])
        ? (raw['1'] as ProtoObject[])
        : [raw['1'] as ProtoObject];

    return rawFiles.map((file) => {
        const rawChunks = file['2'];
        const chunks = (
            Array.isArray(rawChunks)
                ? (rawChunks as ProtoObject[])
                : [rawChunks as ProtoObject]
        ).map((c) => ({
            cdn_url: `${cdnUrlPrefix}/${c['1']}`,
            compressed_md5: c['2'] as string,
            offset: Number(c['3'] ?? 0),
            compressed_size: Number(c['4']),
            uncompressed_size: Number(c['5']),
            xxhash64: c['6'] as string,
            uncompressed_md5: c['7'] as string,
        }));

        return {
            filename: file['1'] as string,
            size: Number(file['4']),
            md5: file['5'] as string,
            chunks,
        };
    });
};

const decodeProtobuf = (buf: Buffer | Uint8Array): ProtoObject => {
    const reader = Reader.create(buf);
    const obj: ProtoObject = {};

    while (reader.pos < reader.len) {
        const tag = reader.uint32();
        const field = String(tag >>> 3);
        const wire = tag & 0x7;

        let value: ProtoValue;
        switch (wire) {
            case 0:
                value = reader.uint64().toString();
                break;
            case 1:
                value = reader.fixed64().toString();
                break;
            case 2: {
                const bytes: Uint8Array = reader.bytes();
                try {
                    value = decodeProtobuf(bytes);
                } catch {
                    value = Buffer.from(bytes).toString('utf8');
                }
                break;
            }
            case 5:
                value = reader.fixed32();
                break;
            default:
                throw new Error(`Unknown wire type: ${wire}`);
        }

        const existing = obj[field];
        if (existing !== undefined) {
            if (Array.isArray(existing)) {
                existing.push(value);
            } else {
                obj[field] = [existing, value];
            }
        } else {
            obj[field] = value;
        }
    }

    return obj;
};

const assembleManifestURL = (data: FrontDoorGameBranch) => {
    const baseURL =
        'https://sg-public-api.hoyoverse.com/downloader/sophon_chunk/api/getBuild?branch=main'; // &package_id={packageID}&password={password}
    return `${baseURL}&package_id=${data.main.package_id}&password=${data.main.password}`;
};

const getGameCodeIndex = (code: GameCode) => {
    // Only worldwide releases for now...
    switch (code) {
        case 'bh3':
            return 3;
        case 'hk4e':
            return 2;
        case 'hkrpg':
            return 1;
        case 'nap':
            return 0;
    }
};

(async () => {
    const res = await getProtobufData('nap');
    await Bun.write('output.txt', JSON.stringify(res));
})();
