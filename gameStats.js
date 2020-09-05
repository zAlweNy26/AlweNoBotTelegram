const steamCountries = require('./steam_countries.min.json');
const Extra = require('telegraf/extra');
const mine = require('./functions.js');
const request = require('request');
const _ = require("underscore");

module.exports = {
  requestURL: async function (urls, callback) {
    'use strict';
    let results = {}, t = urls.length, c = 0,
      handler = function (error, response, body) {
        let url = response.request.uri.href;
        results[url] = { error: error, response: response, body: body };
        if (++c === urls.length) { callback(results); }
      };
    while (t--) { request(urls[t], handler); }
  },
  sendWOTStats: async function (ctx, wotData) {
    let win = parseInt(wotData.win), draw = parseInt(wotData.draw);
    let played = parseInt(wotData.played), kills = parseInt(wotData.kills);
    let kmed = parseFloat(kills / played).toFixed(2);
    let winrate = parseFloat(((win / (played - draw)) * 100)).toFixed(2);
    ctx.reply(`- Statistiche di *${wotData.nick}* ( *${wotData.wotid}* ) -\n` +
      `Creato il *${mine.UnixConv(wotData.created)}*\n` +
      `Ultima battaglia il *${mine.UnixConv(wotData.lastbt)}*\n` +
      `Partite giocate : *${played}*\n` +
      `Partite sopravvissute : *${wotData.survived}*\n` +
      `W/D/L | Win % : *${win}* / *${draw}* / *${wotData.lose}* | *${winrate} %*\n` +
      `Carri distrutti | Media a partita : *${kills}* | *${kmed}*\n` +
      `Massimo carri distrutti in una partita : *${wotData.maxkl}*\n` +
      `Nemici avvistati : *${wotData.spotted}*\n` +
      `Danno medio bloccato : *${wotData.avgdnblocked}*\n` +
      `Danno massimo in una partita : *${wotData.maxdmg}*\n` +
      `Colpi sparati | % messi a segno : *${wotData.hits}* | *${wotData.hitsperc} %*\n` +
      `Colpi rimbalzati : *${wotData.rimb}*\n` +
      `Rimbalzi ricevuti  : *${wotData.rimbrcvd}*\n`, Extra.markdown());
  },
  sendCSGOMessage: async function (ctx, csgoData) {
    ctx.reply(`- Statistiche di *${csgoData.username}* ( *${csgoData.steamid}* ) -\n` +
      `Achievements completati : *${csgoData.achi.toLocaleString()}*\n` +
      `Danno totalizzato : *${csgoData.totdmg.toLocaleString().replace(/,/g, "'")}*\n` +
      `Soldi guadagnati : *${csgoData.totmn.toLocaleString().replace(/,/g, "'")}*\n` +
      `Morti totali : *${csgoData.totd.toLocaleString().replace(/,/g, "'")}*\n` +
      `Rateo K/D : *${(parseInt(csgoData.totk) / parseInt(csgoData.totd)).toFixed(2).toString().replace(/\./g, ",")}*\n` +
      `□ *Uccisioni* :\n` +
      `└ Totali : *${csgoData.totk.toLocaleString().replace(/,/g, "'")}*\n` +
      `└ Colpi in testa : *${csgoData.toths.toLocaleString().replace(/,/g, "'")}*\n` +
      `└ Con il coltello : *${csgoData.totknf.toLocaleString().replace(/,/g, "'")}*\n` +
      `└ Con arma nemica : *${csgoData.totkew.toLocaleString().replace(/,/g, "'")}*\n` +
      `└ Di cecchini in mira : *${csgoData.totkasniper.toLocaleString().replace(/,/g, "'")}*\n` +
      `└ Vendette eseguite : *${csgoData.totrev.toLocaleString().replace(/,/g, "'")}*\n` +
      `□ *Partite* :\n` +
      `└ Vittorie : *${csgoData.totwins.toLocaleString().replace(/,/g, "'")}*\n` +
      `└ MVP totali : *${csgoData.totmvp.toLocaleString().replace(/,/g, "'")}*\n` +
      `└ Dominazioni giocate : *${csgoData.totdom.toLocaleString().replace(/,/g, "'")}*\n` +
      `└ Round giocati : *${csgoData.totdom.toLocaleString().replace(/,/g, "'")}*\n` +
      `□ *Bombe* :\n` +
      `└ Piazzate : *${csgoData.totpb.toLocaleString().replace(/,/g, "'")}*\n` +
      `└ Disinnescate : *${csgoData.totdb.toLocaleString().replace(/,/g, "'")}*\n`, Extra.markdown());
  },
  sendEmbedGameMessage: async function (ctx, steamGameData) {
    let type = "Non disponibile", forb = "Non disponibile", pegi = steamGameData.age, plsnow = "";
    let achiev = "", mtg = "", devs = "", pubs = "", dlc = "";
    if (steamGameData.type === "game") {
      type = "Gioco";
      achiev = "Achievements : ";
      if (steamGameData.achi === undefined) achiev = "*0*\n";
      else achiev = achiev + `*${parseInt(steamGameData.achi).toLocaleString().replace(/,/g, ".")}*\n`;
      if (steamGameData.mtg > 0) mtg = `Media tempo di gioco : *${(steamGameData.mtg / 60).toFixed(2).toString().replace(/\./g, ",")}* ore\n`;
      plsnow = `Giocatori attuali : *${parseInt(steamGameData.pls).toLocaleString().replace(/,/g, ".")}*\n`;
    } else if (steamGameData.type === "dlc") type = "DLC";
    else if (steamGameData.type === "mod") type = "Mod";
    if (steamGameData.dlcs !== undefined) dlc = `DLC : *${Object.keys(steamGameData.dlcs).length}*\n`;
    if (steamGameData.age === 0 || steamGameData.age === '0') pegi = "Non disponibile";
    if (steamGameData.borf === true) forb = "Gratis";
    else if (steamGameData.borf === false && steamGameData.price.discount_percent != 0)
      forb = "€ " + (steamGameData.price.final / 100) + " (" + (steamGameData.price.initial / 100) + ") [" + steamGameData.price.discount_percent + " %]";
    else forb = "€ " + (steamGameData.price.final / 100);
    steamGameData.dev.forEach(function (element) { devs = devs + ";\n" + element; });
    let devs1 = devs.substr(2);
    steamGameData.pub.forEach(function (element) { pubs = pubs + ";\n" + element; });
    let pubs1 = pubs.substr(2), platforms = "Non disponibile", ddu = "Non disponibile";
    if (steamGameData.plats.windows === true && steamGameData.plats.mac === true && steamGameData.plats.linux === true) platforms = "Windows, Mac e Linux";
    else if (steamGameData.plats.windows === true && steamGameData.plats.mac === true) platforms = "Windows e Mac";
    else if (steamGameData.plats.windows === true && steamGameData.plats.linux === true) platforms = "Windows e Linux";
    else if (steamGameData.plats.mac === true && steamGameData.plats.linux === true) platforms = "Mac e Linux";
    else if (steamGameData.plats.windows === true) platforms = "Windows";
    else if (steamGameData.plats.mac === true) platforms = "Mac";
    else if (steamGameData.plats.linux === true) platforms = "Linux";
    for (let i = 0; i < 12; i++)
      if (steamGameData.rel.includes(mine.engmonths[i]) == true) ddu = steamGameData.rel.replace(mine.engmonths[i] + ",", mine.months[i]);
    ctx.replyWithPhoto(steamGameData.bg, {
      caption:
        `- Informazioni su *${steamGameData.name}* -\n` +
        `Tipo : *${type}*\n` +
        `PEGI : *${pegi}*\n` +
        `Prezzo : *${forb}*\n` +
        dlc + achiev + plsnow + mtg +
        `Sviluppatore/i : *${devs1}*\n` +
        `Editore/i : *${pubs1}*\n` +
        `Piattaforma/e : *${platforms}*\n` +
        `Data di uscita : *${ddu}*\n`,
      parse_mode: "Markdown"
    });
  },
  sendEmbedUserMessage: async function (ctx, steamUserData) {
    let status = "Non disponibile", name = "Non disponibile", ingame = "", timecreated = "Non disponibile", lastaccess = "";
    if (steamUserData.status === 0) {
      status = "Offline";
      lastaccess = `Ultimo accesso il :\n*${mine.UnixConv(steamUserData.lastlogoff)}*\n`;
    } else if (steamUserData.status === (1 || 5 || 6)) status = "Online";
    else if (steamUserData.status === 2) status = "Occupato";
    else if (steamUserData.status === (3 || 4)) status = "Assente";
    if (steamUserData.realname !== undefined) name = steamUserData.realname;
    let friends = "Non disponibili", games = "Non disponibili", level = "Non disponibile";
    if (steamUserData.level !== undefined) level = steamUserData.level;
    if (!_.isEqual(steamUserData.friends, JSON.parse("{}"))) friends = Object.keys(steamUserData.friends.friendslist.friends).length;
    if (steamUserData.games !== undefined) games = Object.keys(steamUserData.games).length;
    if (steamUserData.gameinfo !== undefined) {
      let hgame = steamUserData.games.filter(function (item) {
        return item.appid === parseInt(steamUserData.gameid, 10);
      });
      ingame = `In gioco su *${steamUserData.gameinfo}* -\n*${parseFloat(hgame[0].playtime_forever / 60).toFixed(2)}* ore`;
    }
    let loccountrycode = steamUserData.loccountrycode, locstatecode = steamUserData.locstatecode, loccityid = steamUserData.loccityid;
    let loccityname = "", locregionname = "", location = "Non disponibile";
    if (steamUserData.timecreated !== undefined) timecreated = mine.UnixConv(steamUserData.timecreated);
    if (steamUserData.loccityid !== undefined && steamUserData.locstatecode !== undefined && steamUserData.loccountrycode !== undefined) {
      loccityname = steamCountries[loccountrycode].states[locstatecode].cities[loccityid].name;
      locregionname = steamCountries[loccountrycode].states[locstatecode].name;
      location = loccityname + ", " + locregionname + ", " + mine.getCountryName(steamUserData.loccountrycode);
    } else if (steamUserData.loccountrycode !== undefined && steamUserData.locstatecode !== undefined) {
      locregionname = steamCountries[loccountrycode].states[locstatecode].name;
      location = locregionname + ", " + mine.getCountryName(steamUserData.loccountrycode);
    } else if (steamUserData.loccountrycode !== undefined) location = mine.getCountryName(steamUserData.loccountrycode);
    ctx.replyWithPhoto(steamUserData.avatar, {
      caption:
        `- Informazioni su *${steamUserData.username}* -\n` +
        `Stato : *${status}*\n` +
        `Nome : *${name}*\n` +
        `Livello : *${level}*\n` +
        `Amici : *${friends}*\n` +
        `Videogiochi giocati : *${games}*\n` +
        `Provenienza : *${location}*\n` +
        `Account creato il :\n*${timecreated}*\n` +
        lastaccess + ingame,
      parse_mode: "Markdown"
    });
  }
};