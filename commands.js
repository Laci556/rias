const config = require('./config.json');

// Sportify API
const SpotifyWebApi = require('spotify-web-api-node');
// A bejelentkezéshez meg kell adni, milyen funkciókhoz
// férhet hozzá a program (lejátszási lista olvasás és módosítás)
const scopes = [
  'playlist-read-collaborative',
  'playlist-modify-public',
  'playlist-read-private',
  'playlist-modify-private',
];

// Kapcsolódás a Spotifyhoz
const spotify = new SpotifyWebApi({
  redirectUri: 'https://example.com/callback',
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
});

/* 
  Ez generál egy bejelentkezési linket, amit kiír a konzolba,
  bemásolod a böngészőbe, bejelentkezel és átirányít az
  example.com/code=... oldalra
*/
/*
let authorizeURL = spotify.createAuthorizeURL(scopes);
console.log(authorizeURL);

// A linkből másold ki a kódot
let code = A KAPOTT KÓD

spotifyApi.authorizationCodeGrant(code).then(
  function(data) {
    console.log('The refresh token is ' + data.body['refresh_token']);
    // A konzolba kiírja a refresh tokent, ezt másold ki és állítsd be a REFRESH_TOKEN env variable-nek
  },
  function(err) {
    console.log('Something went wrong!', err);
  }
);
*/

// Beállítja a refresh tokent
spotify.setRefreshToken(process.env.REFRESH_TOKEN);

const { MessageEmbed } = require('discord.js');

// Mivel óránként lejár a Spotify bejelentkezés, új tokent kell kérni,
// ez a függvény automatikusan frissíti
function refresh() {
  spotify.refreshAccessToken().then((data) => {
    console.log('The access token has been refreshed!');
    spotify.setAccessToken(data.body['access_token']);
  });
}

// A bot indításakor is frissítjük a tokent
refresh();
// És a biztonság kedvéért félóránként is
setInterval(refresh, 30 * 60 * 1000);

// Maguk a parancsok
/*
  Minden parancsnak 2 paramétere van, az üzenet objektum és az argumentumok.
  Az üzenet az az objektum, amit a onmessage lister-ből kaptunk, tehát lehet rá
  válaszolni, reagálni, törölni stb. Az argumentumok szimplán az üzenet szövegéből lettek
  kiszedve, a prefix és command utáni szavak szóközöknél elválasztva.
  Fontos, hogy az exportált függvény neve lesz a parancs neve is!
*/
module.exports = {
  explicit: async (message, args) => {
    // Mivel külső API-ról kérünk le, várni kell a válaszra, addig írja ki, hogy keresés
    // Megvárjuk, amíg kiírja és változóba mentjük, hogy később törölhessük
    let kereses = await message.channel.send('Keresés...');
    // Ennek a parancsnak igazából nincs több argumentuma, csak a szám, ezért visszarakjuk a szóközöket
    // és egy szöveggé összefűzzük az argumentumokat
    const szam = args.join(' ');
    // Lefuttatja a try-ban lévő kódot, ha bármilyen hiba történik, a catch-re megy át
    try {
      // Rákeresünk Spotifyon a számra, csak 1 találatot kérünk le, annak is csak a body.track.items[0]
      // property-je érdekel
      const spotifySzam = (await spotify.searchTracks(szam, { limit: 1 })).body
        .tracks.items[0];

      // Küld egy Embed-et a számmal
      await message.channel.send(
        new MessageEmbed()
          .setColor(spotifySzam.explicit ? '#ff0000' : '#00ff00') // Embed színe, ha explicit, piros, ha nem, zöld
          .setTitle(spotifySzam.name) // Embed címe = szám címe
          .setDescription(
            spotifySzam.artists.map((artist) => artist.name).join(', ')
            // Embed leírása = előadó neve, ha több is van, vesszővel elválasztva
          )
          .setThumbnail(spotifySzam.album.images[2].url)
          // Thumbnail-nek az album képe (az images egy tömb, a 3. (2-es indexű) kép a legkisebb felbontású)
          .addField('Explicit?', spotifySzam.explicit ? 'Igen' : 'Nem') // Végül kiírjuk, hogy explicit-e
      );
      // Töröljük a keresés üzenetet
      await kereses.delete();
    } catch (error) {
      // Ha bárhol hiba történik, akár a Spotify lekérdezés, akár az üzenetküldés közben

      /* 
        Ezt át kell majd írni.
        Az egyik hibakód azt jelenti, hogy nincs bejelentkezve, de nem tudom pontosan melyik.
        Ha azt a hibakódot kapnánk, refresh-elni kéne a tokent (mert valamilyen okból nem történt meg automatikusan).
        Frissíthetném minden hibánál, de az fölöslegesen is frissítené a tokent.
        A leggyakoribb hibakód a 400-as, amit akkor kapunk, ha a Spotify lekéréshez valamit rosszul adtunk meg,
        pl nem írt a felhasználó számot, csak parancsot.
        Ebben az esetben biztos nem kell frissíteni, minden más hibánál a biztonság kedvéért frissítsük a tokent
      */
      if (error.statusCode != 400) {
        refresh();
      }
      // Kiírjuk, hogy hiba történt
      message.channel.send('Hiba történt');
      console.log(error);
    }
  },
  szamkeres: async (message, args) => {
    // Szintén kiírjuk, hogy keresés, az üzenetet hozzáadjuk a messages tömbhöz
    // (tudom, jobban is elnevezhettem volna, hogy könnyebben meg lehessen különböztetni a message-től)
    let keresMessage = await message.channel.send('Keresés...');
    let messages = [keresMessage];
    // Összefűzzük a szétszedett argumentumokat, aka a keresett számot
    const szam = args.join(' ');
    try {
      // Mindhárom lekérdezést párhuzamosan futtatjuk, csak akkor megy továb, ha mindhárom megérkezett
      let [spotifySzamok, playlist, havi] = await Promise.all([
        // Rákeres a számra, lekéri a top 3 találatot
        spotify.searchTracks(szam, { limit: 3 }),
        // Lekéri a config-ban megadott számkérések lista számait
        spotify.getPlaylistTracks(config['playlist-id'], {
          fields: 'items',
        }),
        // Lekéri a config-ban megadott havi lejátszott lista számait
        spotify.getPlaylistTracks(config['havi-lejatszott'], {
          fields: 'items',
        }),
      ]);

      // Borzalmas megoldás ez a tömb, de működik
      let jatszhatok = [];
      // A playlist-ből és haviból csak a body.items érdekel
      playlist = playlist.body.items;
      havi = havi.body.items;
      // Végigmegy a találatokon, mivel mindig 3 lesz, használhattam volna sima for loopot de ez menőbb így
      for (let spotifySzam of spotifySzamok.body.tracks.items) {
        // A spotifySzam tartalmazza a számot

        // Akkor játszható, ha nem explicit, nincs a számkérések között és nincs a havi lejátszottban
        // Esetleg egy tiltólistában is megnézheti, ha lesz
        let jatszhato =
          !spotifySzam.explicit &&
          !playlist.map((szam) => szam.track.id).includes(spotifySzam.id) &&
          !havi.map((szam) => szam.track.id).includes(spotifySzam.id);
        // Ezt a boolean vátozót hozzáadjuk a játszhatókhoz, később kelleni fog
        jatszhatok.push(jatszhato);
        // Az explicithez hasonlóan Embed-ként küldjük a találatot
        let ujMessage = await message.channel.send(
          new MessageEmbed()
            .setColor(!jatszhato ? '#ff0000' : '#00ff00')
            .setTitle(spotifySzam.name)
            .setDescription(
              spotifySzam.artists.map((artist) => artist.name).join(', ')
            )
            .setThumbnail(spotifySzam.album.images[2].url)
            .addField(
              jatszhato ? 'Játszható' : 'Nem játszható',
              jatszhato
                ? 'Játszható'
                : spotifySzam.explicit
                ? 'Explicit szám'
                : playlist.map((szam) => szam.track.id).includes(spotifySzam.id)
                ? 'Már szerepel a lejátszási listában'
                : 'Már játszottuk a hónapban'
            )
          // Ez az egyetlen különbség az explicithez képest, de ugyanaz az elv
          // Ha játszható, kiírja, hogy játszható, ha nem, kiírja az okát
        );
        // Ezt is elmentjük, hogy később töröni tudjuk
        messages.push(ujMessage);
      }
      // A szám emojik valamiért csak így működnek, a Discord.js dokumentációból töltöttem le
      let emojis = require('./emojis.js');
      // Csak azt a reakciót vizsgáljuk, ami átmegy a filteren
      // Vagyis a 4 megadott emoji egyike és az a felhasználó küldte, aki kérte a számot
      const filter = (reaction, user) => {
        return (
          [emojis[1], emojis[2], emojis[3], '❌'].includes(
            reaction.emoji.name
          ) && user.id === message.author.id
        );
      };

      // Küld 4 reakciót az eredeti üzenetre
      await Promise.all([
        message.react(emojis[1]),
        message.react(emojis[2]),
        message.react(emojis[3]),
        message.react('❌'),
      ]);

      // Vár 1 percet a reakcióra, ha nem jön semmi -> catch
      message
        .awaitReactions(filter, { max: 1, time: 60000, errors: ['time'] })
        .then(async (collected) => {
          // Ha érkezett reakció

          // A reaction az első reakció
          const reaction = collected.first();
          // Ha ❌-el reagált, töröljük az üzeneteket és küldünk egy üzenetet
          if (reaction.emoji.name == '❌') {
            await Promise.all(messages.map((mess) => mess.delete()));
            message.reply(
              'Sajnálom, hogy nem találtad meg a keresett számot 😢'
            );
          }
          // Megnézzük a reakciót a 3 emojira
          for (let i = 0; i < 3; i++) {
            // Ha az i+1-es számmal reagált, akkor megtaláltuk a számot
            if (reaction.emoji.name == emojis[i + 1]) {
              if (jatszhatok[i]) {
                // Ha játszható az i. szám

                // Hozzáadjuk a számkérések listához
                await spotify.addTracksToPlaylist(config['playlist-id'], [
                  spotifySzamok.body.tracks.items[i].uri,
                ]);
                // Majd töröljük az összes üzenetet
                await Promise.all(messages.map((mess) => mess.delete()));
                // És reagálunk, hogy hozzáadtuk xyz számot a listához
                message.reply(
                  `Oké, hozzáadtam a(z) ${spotifySzamok.body.tracks.items[i].name}-t a számkérésekhez!`
                );
                // Ha az egyik szám helyes fölösleges a többire is megnézni, kiléphetünk a loopból
                break;
              } else {
                // Ha nem játszható az i. szám
                message.reply('Sajnálom, de ezt a számot nem játszhatjuk le');
              }
            }
          }
          // Kitöröljük a reakciókat
          message.reactions.removeAll();
        })
        .catch(async (collected) => {
          // Ha nem reagált időben

          // Kitöröljük az üzeneteket és reakciókat és válaszolunk
          await Promise.all(messages.map((mess) => mess.delete()));
          await message.reactions.removeAll();
          message.reply('Nem reagáltál időben');
        });
    } catch (error) {
      // Ugyanaz, mint az explicitnél, és valószínűleg minden más commandnál, akár külön függvénybe is lehetne írni
      console.log(error);
      if (error.statusCode != 400) {
        refresh();
      }
      message.channel.send('Hiba történt');
    }
  },
};
