const config = require('./config.json');
const SpotifyWebApi = require('spotify-web-api-node');
const scopes = [
  'playlist-read-collaborative',
  'playlist-modify-public',
  'playlist-read-private',
  'playlist-modify-private',
];
const spotify = new SpotifyWebApi({
  redirectUri: 'https://example.com/callback',
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
});

// let authorizeURL = spotify.createAuthorizeURL(scopes);
// console.log(authorizeURL);
spotify.setRefreshToken(process.env.REFRESH_TOKEN);

const { MessageEmbed } = require('discord.js');

function refresh() {
  spotify.refreshAccessToken().then((data) => {
    console.log('The access token has been refreshed!');
    spotify.setAccessToken(data.body['access_token']);
  });
}

refresh();
setInterval(refresh, 30 * 60 * 1000);

module.exports = {
  explicit: async (message, args) => {
    message.channel.send('Keresés...');
    const szam = args.join(' ');
    try {
      const spotifySzam = (await spotify.searchTracks(szam, { limit: 1 })).body
        .tracks.items[0];

      message.channel.send(
        new MessageEmbed()
          .setColor(spotifySzam.explicit ? '#ff0000' : '#00ff00')
          .setTitle(spotifySzam.name)
          .setDescription(
            spotifySzam.artists.map((artist) => artist.name).join(', ')
          )
          .setThumbnail(spotifySzam.album.images[2].url)
          .addField('Explicit?', spotifySzam.explicit ? 'Igen' : 'Nem')
      );
    } catch (error) {
      if (error.statusCode != 400) {
        refresh();
      }
      message.channel.send('Hiba történt');
      console.log(error);
    }
  },
  szamkeres: async (message, args) => {
    let keresMessage = await message.channel.send('Keresés...');
    let messages = [keresMessage];
    const szam = args.join(' ');
    try {
      let [spotifySzamok, playlist, havi] = await Promise.all([
        spotify.searchTracks(szam, { limit: 3 }),
        spotify.getPlaylistTracks(config['playlist-id'], {
          fields: 'items',
        }),
        spotify.getPlaylistTracks(config['havi-lejatszott'], {
          fields: 'items',
        }),
      ]);

      // console.log(spotifySzamok.body.tracks);
      let jatszhatok = [];
      playlist = playlist.body.items;
      havi = havi.body.items;
      for (let spotifySzam of spotifySzamok.body.tracks.items) {
        // console.log(playlist);
        let jatszhato =
          !spotifySzam.explicit &&
          !playlist.map((szam) => szam.track.id).includes(spotifySzam.id) &&
          !havi.map((szam) => szam.track.id).includes(spotifySzam.id);
        jatszhatok.push(jatszhato);
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
        );
        messages.push(ujMessage);
      }
      let emojis = require('./emojis.js');
      const filter = (reaction, user) => {
        return (
          [emojis[1], emojis[2], emojis[3], '❌'].includes(
            reaction.emoji.name
          ) && user.id === message.author.id
        );
      };

      await Promise.all([
        message.react(emojis[1]),
        message.react(emojis[2]),
        message.react(emojis[3]),
        message.react('❌'),
      ]);

      message
        .awaitReactions(filter, { max: 1, time: 60000, errors: ['time'] })
        .then(async (collected) => {
          const reaction = collected.first();
          if (reaction.emoji.name == '❌') {
            await Promise.all(messages.map((mess) => mess.delete()));
            message.reply(
              'Sajnálom, hogy nem találtad meg a keresett számot 😢'
            );
          }
          for (let i = 0; i < 3; i++) {
            if (reaction.emoji.name == emojis[i + 1]) {
              if (jatszhatok[i]) {
                await spotify.addTracksToPlaylist(config['playlist-id'], [
                  spotifySzamok.body.tracks.items[i].uri,
                ]);
                await Promise.all(messages.map((mess) => mess.delete()));
                message.reply(
                  `Oké, hozzáadtam a(z) ${spotifySzamok.body.tracks.items[i].name}-t a számkérésekhez!`
                );
                break;
              } else {
                message.reply('Sajnálom, de ezt a számot nem játszhatjuk le');
              }
            }
          }
          message.reactions.removeAll();
        })
        .catch(async (collected) => {
          await Promise.all(messages.map((mess) => mess.delete()));
          message.reply('Nem reagáltál időben');
        });

      // if (jatszhato)
      //   await spotify.addTracksToPlaylist(config['playlist-id'], [
      //     spotifySzam.uri,
      //   ]);
    } catch (error) {
      console.log(error);
      if (error.statusCode != 400) {
        refresh();
      }
      message.channel.send('Hiba történt');
    }
  },
};
