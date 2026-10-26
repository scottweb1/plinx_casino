# Plinko Casino

Et casino bygget med **React + Vite**. Alt foregår med **virtuelle legepenge**, aldrig rigtige penge.

Spil: **Plinko**, **Mines**, **Slots** (rigtige ruller), **Limbo**, **Coinflip** (3 sider) og **Spin the Wheel**.

## Kom i gang

```bash
npm install
npm run dev      # starter udviklingsserveren (http://localhost:5173)
npm run build    # bygger til produktion i mappen dist/
npm run preview  # forhåndsviser produktionsbygget
npm test         # kører enhedstests (wallet og spilmatematik)
```

Kræver Node.js 18 eller nyere.

## Funktioner

- **Fælles wallet** med spillernavn og startsaldo: $500, $1.000, $10.000 eller $50.000.
- **Saldo og historik gemmes i localStorage**, og flere spillere kan gemmes og vælges igen ("Continue as").
- **Regnskab i hele cent**, så der ikke opstår afrundingsfejl. Hver runde har et unikt id og kan kun afregnes én gang, så der kan ikke ske dobbeltbetaling.
- Lukker du siden midt i en Plinko-, Slots-, Limbo- eller Wheel-runde, bliver gevinsten udbetalt ved næste start. En igangværende Mines-runde kan genoptages.
- **Lyd:** bling på Plinko-pins, kliklyde, gevinstlyde og jackpot-jingle. Sound On/Off og lydstyrke i topbaren.
- **Turbo**, **Auto Play** (antal runder, stop ved gevinst, stop ved tab) og **Stop** i Plinko, Slots, Limbo, Coinflip og Wheel. Auto stopper ved jackpot og kan genoptages fra jackpot-skærmen.
- **Slots:** rigtige lodrette ruller der scroller med sløring og lander med et lille hop, én ad gangen fra venstre. Knappen STOP hurtigstopper rullerne.
- Guldpartikler i baggrunden, mønt-udbrud og flydende gevinsttekst, og en jackpot-overlay med pengesedler, mønter og stråler.
- Responsivt design til både mobil og computer.
- **History** (knap i topbaren) viser de seneste 200 runder med statistik. **Refill** giver ekstra legepenge uden at ændre din gevinst/tab.

## Coinflip

Mønten har tre sider: **Heads 40 %** (2×), **Tails 40 %** (2×) og **Edge 20 %** (4×). Alle tre valg har samme forventede tilbagebetaling (80 %).
Ændr multiplikatorerne i `src/games/coinflip/coinflipMath.js`.

## Baggrundsmusik (valgfrit)

Læg en lydfil ved navn `1.mp3` i mappen `public/`. Så dukker en **Music**-knap op i topbaren.
Findes filen ikke, skjules knappen.

## Projektstruktur

```
src/
  App.jsx, main.jsx
  components/   Start, Lobby, TopBar, BetBox, AutoPanel, HistoryModal, JackpotOverlay, GoldDust, FxLayer ...
  games/        plinko/  mines/  slots/  limbo/  coinflip/  wheel/
  lib/          walletStore (regnskab), settingsStore, money (cent), rng, config
  audio/        engine (WebAudio), sfx (lydeffekter), music
  hooks/        useStores, useAuto
  effects/      fxBus (mønt-udbrud)
  styles/       base.css, ui.css, games.css, jackpot.css, extras.css
tests/          wallet.test.js, math.test.js, coinflip.test.js
```

## Ændringer ift. den gamle `index.html`

- Den skjulte manipulation i Plinko, hvor spillerne `Scott` og `ScottW` fik styrede baner, er **fjernet**, så alle spillere har samme odds.
- Den usynlige knap, der gav gratis penge, er erstattet af den synlige **Refill**-knap.
- Baggrundsbilledet, der var hotlinket fra en stockfoto-side, er erstattet af en ren CSS-baggrund i mørkeblåt casinotema.
- Jackpot-jinglen er flyttet fra base64 i koden til filen `src/assets/jackpot.mp3`.

## Odds (teoretisk tilbagebetaling)

Plinko ca. 99 %, Slots ca. 93,7 %, Limbo ca. 99 %, Coinflip 80 %, Wheel 93,75 %, Mines ca. 99 %.
