if (process.env.NODE_ENV !== 'production') require('dotenv').config();

const Discord = require('discord.js');
const client = new Discord.Client();
const PREFIX = '!';
const BLACKLISTED = [
  {
    szoveg: 'kys',
    kategoria: 'toxic',
    szint: 2,
  },
];

const PARANCSOK = require('./commands.js');

// spotify
//   .searchTracks('red hot chili peppers')
//   .then((res) => console.log(res.body.tracks.items[0].explicit));

// async function asd() {
//   let playlist = await spotify.getPlaylist(SPOTIFY_PLAYLIST_ID);
//   console.log(playlist.body);
// }
// asd();

client.on('message', (message) => {
  if (message.content.startsWith(PREFIX)) {
    // PARANCS
    const args = message.content.slice(PREFIX.length).split(' ');
    if (PARANCSOK[args[0]]) {
      PARANCSOK[args[0]](message, args.slice(1));
    } else {
      message.reply('Ezt a paracsot nem ismerem');
      // message.channel.send('Ezt a paracsot nem ismerem');
    }
  } else {
    // UZENET
    const SZOVEG = message.content;
    // kiszamolja a legsulyosabb blacklistelt szo szintjet
    let szint = Math.max(
      BLACKLISTED.map((elem) => (SZOVEG.includes(elem.szoveg) ? elem.szint : 0))
    );
    // ha nem talalt, kilep
    if (szint == 0) return;

    switch (szint) {
      case 1:
      //
    }
  }
});

client.login(process.env.DC_TOKEN);
