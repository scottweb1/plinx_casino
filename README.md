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

## Konti og leaderboard (Supabase)

Man kan oprette en konto med **brugernavn + adgangskode**. Der bruges ingen mail, så mistet kode = konto kan ikke gendannes.
Saldo og statistik gemmes online, så man kan logge ind fra en anden enhed. Spillet kører lokalt, og ændringer sendes til Supabase
et øjeblik efter hver runde (indikatoren i topbaren viser *saving...* / *saved*). **Leaderboard** (knap i topbaren) kan sorteres efter
**flest penge** (standard), **mest vundet** og **mest tabt**. *Won/Lost* er summen af nettogevinster/-tab pr. runde.
Man kan stadig spille **offline** (kun på enheden, ikke på leaderboardet).

### Opsætning (én gang)
1. Åbn Supabase -> **SQL Editor**, og kør hele filen `supabase/migrations/20261027000000_init.sql`
   (eller `supabase link --project-ref <ref>` og `supabase db push`).
2. Supabase -> **Authentication -> Providers -> Email**: slå **Confirm email** FRA. (Ellers kræves en mail-bekræftelse.)
3. (Valgfrit) Authentication -> Providers -> Email -> *Minimum password length*. Spillet kræver mindst 6 tegn.
4. Kopiér `.env.example` til `.env` og indsæt projekt-URL og **publishable key**. Start derefter med `npm run dev`.

Læg **aldrig** databasens adgangskode eller en `service_role`-nøgle i projektet. Browseren skal kun bruge den offentlige *publishable key*;
beskyttelsen ligger i Row Level Security i SQL-filen (alle indloggede kan læse leaderboardet, men man kan kun ændre sin egen række).

**Sådan virker login uden mail:** Supabase Auth kræver en mail, så spillet laver en falsk én ud fra brugernavnet
(`plinko.<navn>@gmail.com`; navne med æøå kodes). Der sendes aldrig mails. Hvis oprettelse afvises med en besked om mail-domænet,
så sæt `VITE_AUTH_EMAIL_DOMAIN` i `.env` til et andet rigtigt domæne.

**Begrænsning:** spillene kører i browseren, så en teknisk kyndig spiller kan sende falske tal til sin egen række. Reglerne i SQL
forhindrer kun at navnet ændres, at tællere går baglæns og at man rører andres rækker. Det er fint til venner og legepenge,
men leaderboardet er ikke snyde-sikkert.

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
supabase/       migrations/ (SQL til tabel, regler og trigger)
tests/          wallet, math, coinflip, devluck, cloud, email (+ mocks/ til browsertest)
```

## Dev-hæld (Scott / ScottW)

`src/dev/devLuck.js` giver spillerne `Scott` og `ScottW` skæve Plinko-baner (samme som i den gamle version). Slå fra med `DEV_LUCK_ENABLED = false`.
Brug det kun til test: det påvirker leaderboardet, hvis navnene bruges til rigtige konti.

## Ændringer ift. den gamle `index.html`

- Manipulationen af `Scott`/`ScottW` i Plinko ligger nu i det separate dev-modul (se ovenfor).
- Den usynlige knap, der gav gratis penge, er erstattet af den synlige **Refill**-knap.
- Baggrundsbilledet, der var hotlinket fra en stockfoto-side, er erstattet af en ren CSS-baggrund i mørkeblåt casinotema.
- Jackpot-jinglen er flyttet fra base64 i koden til filen `src/assets/jackpot.mp3`.

## Odds (teoretisk tilbagebetaling)

Plinko ca. 99 %, Slots ca. 93,7 %, Limbo ca. 99 %, Coinflip 80 %, Wheel 93,75 %, Mines ca. 99 %.
