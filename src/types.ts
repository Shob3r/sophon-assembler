export type FrontDoor = {
    retcode: number;
    message: string;
    data: {
        game_branches: FrontDoorGameBranch[];
    };
};

export type FrontDoorGameBranch = {
    game: {
        id: string;
        biz: string;
    };
    main: {
        package_id: string;
        branch: string;
        password: string;
        tag: string;
        diff_tags: string[];
        categories: FrontDoorCategory[];
        required_client_version: string;
        pre_download: null | string;
        enable_base_pkg_predownload: boolean;
    };
};

export type FrontDoorCategory = {
    category_id: string;
    matching_field: string;
    type: string;
};

export type GameBranchInfo = {
    retcode: string;
    message: string;
    data: {
        build_id: string;
        tag: string;
        manifests: GameManifest[];
    };
};

export type GameManifest = {
    category_id: string;
    category_name: string;
    manifest: {
        id: string;
        checksum: string;
        compressed_size: string;
        uncompressed_size: string;
    };
    chunk_download: BranchDownload;
    manifest_download: BranchDownload;
    matching_field: string;
    stats: BranchStats;
    deduplicated_stats: BranchStats;
};

export type BranchDownload = {
    encryption: number;
    password: string;
    compression: number;
    url_prefix: string;
    url_suffix: string;
};

export type BranchStats = {
    compressed_size: string;
    uncompressed_size: string;
    file_count: string;
    chunk_count: string;
};

export type GameCode =
    | 'bh3-global'
    | 'bh3-jp'
    | 'bh3-kr'
    | 'bh3-sea'
    | 'bh3-tw'
    | 'hk4e'
    | 'hkrpg'
    | 'nap';

export type Languages = 'cn' | 'en' | 'jp' | 'kr';

export type ManifestData = {
    game: GameCode;
    languages: LanguageInformation[];
};

export type LanguageInformation = {
    language: string;
    index: number;
};

export type ProtoValue = string | number | ProtoObject;

export type ProtoObject = {
    [field: string]: ProtoValue | ProtoValue[];
};
