# Rias

## Telepítés

### npm package-ek

```bash
yarn install
# vagy
npm install
```

### `.env` fájl

Hozz létre egy `.env` fájlt. Tartalma:

```
DC_TOKEN=a botod dc tokenje
SPOTIFY_CLIENT_ID=a spotify alkalmazásod client id-je
SPOTIFY_CLIENT_SECRET=a spotify alkalmazásod client secret-je
REFRESH_TOKEN=ez egyelőre maradjon üres
```

A Spotify client ID-t és secret-et a Spotify dev oldaláról tudod kimásolni, ha csináltál fejlesztőként Spotify alkalmazást.

A megfelelő adatokat szóköz nélkül írd az = után, minden változót külön sorba. A kész fájl valahogy így fog kinézni:

```
DC_TOKEN=NzA3MzMwkfDotlA0NTI5MTUz.XrH4pK.R_jidZFRz6-Rm6kAGq_KD872xHc
SPOTIFY_CLIENT_ID=563ee76d215fa9c6b0afe7e026819fff
SPOTIFY_CLIENT_SECRET=83b6dab94e0f4f0794ddf80f31211273
REFRESH_TOKEN=
```

### `config.json`

A `config.json`-ban átállíthatod a parancs prefixet, a havi lejátszott listát és a számkérés listát

```json
{
  "havi-lejatszott": "6pav3FSJthdlef5WfagKIE",
  "playlist-id": "7gRxChUUREkpEsHNrYkXez",
  "prefix": "!"
}
```

Innen tudod kimásolni a playlistek azonosítóit (ami kelleni fog a számkérés listához, mert az még az én fiókomon van)

![](https://kepkuldes.com/images/693fd27b30f0d057bdb16c829abc7b0b.png)

### Spotify refresh token lekérés

A `commands.js` fájlban kommenteld ki ezt a kódrészletet. Ez generál egy bejelentkezési linket, amit kiír a konzolba, bemásolod a böngészőbe, bejelentkezel és átirányít az example.com/code=... oldalra

```js
let authorizeURL = spotify.createAuthorizeURL(scopes);
console.log(authorizeURL);

// A linkből másold ki a kódot
let code = 'A KAPOTT KÓD';

spotifyApi.authorizationCodeGrant(code).then(
  function (data) {
    console.log('The refresh token is ' + data.body['refresh_token']);
    // A konzolba kiírja a refresh tokent, ezt másold ki és állítsd be a REFRESH_TOKEN env variable-nek
  },
  function (err) {
    console.log('Something went wrong!', err);
  }
);
```

Ha ezzel megvagy, rakd vissza kommentbe és indítsd újra a programot.

### Bot indítása

```bash
# Dev módban, ha mented a kódot, automatikusan újratölt
yarn dev
# vagy
npm run dev

# Normál módban, nem tölt úrja mentéskor, ha nincs rá okod, ne használd dev helyett
yarn start
# vagy
npm run start
```

## Fejlesztés

Új parancsot a `commands.js` fájlban tudsz létrehozni a `module.exports` objektumban.

```js
module.exports = {
  ...,
  ujParancs = async (message, args) => {
    // Minden parancs ezt a két argumentumot kapja
    // A message a listenerből kapott message,
    // args = message.content.slice(PREFIX.length).split(' ').slice(1)
    // azaz a parancs utáni többi szó egy tömbben
    ...
  }
}
```

A moderálás funkcióhoz még nem fogtam hozzá, az egyelőre az `index.js`-ben található, de egy külön fájlba tervezem átírni.

```js
// Moderálás: WIP
```

## Teendők

- [x] Spotify integráció
- [ ] Adatbázis
- [ ] Moderálás

Várom a többi feature kérést :)
