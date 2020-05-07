// Környezeti változók
// csak akkor kell manuálisan betölteni, ha nem production környezetben fut
if (process.env.NODE_ENV !== 'production') require('dotenv').config();

// Discord.js
const Discord = require('discord.js');
const client = new Discord.Client();

// Nagyjából így nézne ki egy szó, egy adatbázisból fogja betölteni őket,
// amit egy weboldalon lehet majd szerkeszteni
const BLACKLISTED = [
  {
    szoveg: 'kys',
    kategoria: 'toxic',
    szint: 2,
  },
];

// A parancsok és config külön fájlban vannak
const PARANCSOK = require('./commands.js');
const { prefix: PREFIX } = require('./config.json');

// Üzenet érkezésekor
client.on('message', (message) => {
  if (message.content.startsWith(PREFIX)) {
    // HA PARANCS

    // A prefix utáni szavak a szóközöknél elválasztva az args
    const args = message.content.slice(PREFIX.length).split(' ');

    // Ha az első argumentum (a parancs) megtalálható a parancsokban
    if (PARANCSOK[args[0]]) {
      // Érvényes parancs
      // Végrehajtja a parancsot az argumentumokkal (a parancs utáni többi szóval)
      PARANCSOK[args[0]](message, args.slice(1));
    } else {
      // Nem található
      message.reply('Ezt a paracsot nem ismerem');
    }
  } else {
    // HA ÜZENET

    const szoveg = message.content;
    // Kiszámolja a legsúlyosabb blacklistelt szó szintjét
    let szint = Math.max(
      BLACKLISTED.map((elem) => (szoveg.includes(elem.szoveg) ? elem.szint : 0))
    );
    // Ha nem talált, megszakítja a függvényt
    if (szint == 0) return;

    // Ha talált
    switch (szint) {
      case 1:
      //
    }
  }
});

client.login(process.env.DC_TOKEN);
