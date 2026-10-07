# Fenrir

**Mod any game. Host anything.** Fenrir turns one Windows PC into a home for your games and your friends: it hosts the game, sends each friend a link of their own, gets their copy ready with the same mods, mods every game you own and puts every file back.

**Website:** <https://iksamxul.github.io/fenrir/> · **Download:** [the latest release](https://github.com/iksamxul/fenrir/releases/latest)

This repository holds the website and the releases. Fenrir is free for Windows 10 and 11.

## The three apps

| App | For | What it does |
| --- | --- | --- |
| **Fenrir** | the PC that hosts | Your games, their mods and servers, a Minecraft world, mashups of up to four games, and your own sites and apps online |
| **Fenrir Connect** | friends | Opens the host's link, gets their copy of the game ready with the same mods, and joins with one button |
| **Fenrir Link** | your phone | Start, stop and watch your servers from anywhere (Android, or any iPhone straight from Safari) |

## What it does

- **Every game you own**, from Steam, Epic, GOG, Ubisoft, EA and Xbox, even the ones not downloaded yet. Mods install in one press, and removing them puts every original file back. Games whose anti-cheat bans for changed files are shown and never touched.
- **Servers for friends**: a Minecraft world with any modpack, and game servers for Valheim, Palworld, 7 Days to Die, Terraria, GTA V (FiveM) and Skyrim Together, each with its dashboard, log, players, settings and backups. A free tunnel gives friends an address, with no router changes.
- **Ask Fenrir**: press Ctrl+K and say what you want. Fenrir does the everyday things on its own, the AI you pick answers the rest, and every change waits for your Do it.
- **AI apps**: Claude Code, Claude Desktop and other apps that speak MCP can use Fenrir once you switch it on. They look first; each change waits for your Allow.
- **Crash help**: when a modded game crashes, Fenrir names the mod most likely to blame, with Take it out and play. Mod sets keep the mods that work together.
- **Mashups**: up to four games in one, built with the AI you choose.
- **Sites and apps**: a folder, an app or a port online, with a free address or your own domain.
- **Always a way back**: checked backups, a restore rehearsed each month, and a list of everything Fenrir changed on your PC, each with its way back.

## Safe to run

- Installs for your Windows account only, with no administrator prompt.
- What leaves your PC: update checks with GitHub, the mod sites you install from, the tunnels and addresses you switch on, and the AI provider you choose. No analytics, no account, no ads.
- Every update is checked against a signature only Fenrir's publisher can make (`update-feed.json`, Ed25519).
- Each release lists the SHA-256 of every file on the [download page](https://iksamxul.github.io/fenrir/download).

## In this repository

The website is static: HTML pages, one stylesheet, two small scripts, and `versions.json` (file names, sizes, checksums and notes for the current build, signed into `update-feed.json`). [DEPLOY.md](DEPLOY.md) explains how it is published.

Fenrir is an independent project. It is not affiliated with Mojang, Microsoft, Valve, Epic Games, GOG, Cloudflare, Anthropic or the makers of any game.
