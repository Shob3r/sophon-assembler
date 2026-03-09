# Sophon Assembler

This is a utility project for [yoohoo](https://github.com/shob3r/yoohoo), aiming to abstract the complicated structure of HoYoVerse's sophon chunk downloading api.

## How Sophon Works

### Preamble

Sophon is an internal system developed by HoYoVerse for use in their HoYoPlay unified launcher. As far as I can tell, this system is meant to replace their previous system, where URLs to download the files can be found directly on a public endpoint. This endpoint is still being updated for Zenless Zone Zero, Honkai: Star Rail, and Honkai Impact 3rd, with only Genshin having fully transitioned to the new sophon downloading system

The Sophon chunk download system works by hosting many individual links to small chunks of the file (~5-10Mb per chunk), while only giving small portions of the final download URLs for each chunk in their publically accessible endpoints

### How to get a chunk download

#### Step 1: Access the "Front Door"

This is the first of two endpoints that are needed to assemble a final download URL. [The endpoint can be viewed here](https://sg-hyp-api.hoyoverse.com/hyp/hyp-connect/api/getGameBranches?=gopR6Cufr3&launcher_id=VYTpXlbWo8). This endpoint will provide the package id and "password" needed to get to the second endpoint

#### Step 2: Access the manifest endpoint

This is the second of two endpoints that are needed to assemble a final download URL. Each game has its own unique endpoint (including different server variants, in the case of hi3). The URL format looks like this:

```txt
sg-public-api.hoyoverse.com/downloader/sophon/chunk/api/getbuild?branch=main&package_id={pkg id}&password={password}
```

This endpoint does NOT provide the links to the chunks though. it only provides the two chunks needed for a protobuf manifest, which will first have to be downloaded and decoded, which will provide part of the chunks for the final download link.

You can get the URL by appending the``id`` field under the ``manifest`` tag to the ``url_prefix`` tag, found under ``chunk_download``. The file downloaded must then be decompressed with zstd and then decoded with ``protoc`` (or equivilent for a language being used). From there, you have something you can work with.

#### Step 3: Assembling The Chunk URL

The decoded protobuf file has the following file strucutre:

```protobuf
1 {
    1: "<File Name/Path To File>
    2 {
        1: "<Some Sort Of Hash>"
        2: "<Some Sort of Hash>"
        ...
    }
    ...
}
...
```

This file structure repeats itself for hundreds of thounds of lines (The Genshin Impact 6.4 manifest is 868,280 lines long)

The "1" under a "2" subfield is the final piece of the puzzle. You can now assemble a final download link for **ONE** chunk of a program. Combine ``url_prefix`` from the second API endpoint with the hash for a final download link:

```txt
https://{url_prefix}/{download hash}
```

That's it! you finally have an assmebled sophon chunk URL. Repeat this several thousand more times, and you might have a game at the end of this! (if you save the chunks correctly that is...)

## What this project aims to do

Projects already exist for downloading and resolving Sohpon chunks. However, I want to deobfuscate this issue and create an endpoint that just has a list of the final URLs to the chunks that is accessible by anyone who needs to access the Sophon chunks for any HoYoVerse game for any reason

The endpoint structure will be as such:

- Main Endpoint: ``https://sophon.shob3r.dev/``. This will list Sophon chunks for every game
- Game-Specific: ``https://sophon.shob3r.dev/{game_code}``. This will list Sophon chunks for a requested game using their respective game code (bh3, hk4e, hkrpg, nap)
