require('dotenv').config();
const { I18n } = require("i18n");
const Telegraf = require('telegraf');
const Extra = require('telegraf/extra');
const Stage = require('telegraf/stage');
const Markup = require('telegraf/markup');
const Session = require('telegraf/session');
const Scene = require('telegraf/scenes/base');
const WizardScene = require('telegraf/scenes/wizard')
const commandParts = require('telegraf-command-parts');
const games = require('./gameStats.js');
const mine = require('./functions.js');
const weather = require('weather-js');
const request = require('request');
const SteamID = require('steamid');
const cheerio = require('cheerio');
const _ = require("underscore");
const fs = require('fs');

const bot = new Telegraf(process.env.TOKEN, {
  telegram: { webhookReply: false }
});

console.log("Bot avviato !");

const i18n = new I18n({
  locales: ['English', 'Italian', 'Spanish', 'French', 'German'],
  fallbacks: { 'nl': 'Italian' },
  defaultLocale: 'Italian',
  directory: __dirname + '/translations',
  autoReload: true,
  indent: "  ",
  extension: '.json',
});

function loclang(ctx) {
  if (ctx.from.hasOwnProperty('language_code') && ctx.from.language_code != undefined) {
    let code = ctx.from.language_code.toLowerCase();
    if (code == "it") i18n.setLocale("Italian");
    else if (code == "es") i18n.setLocale("Spanish");
    else if (code == "fr") i18n.setLocale("French");
    else if (code == "de") i18n.setLocale("German");
    else i18n.setLocale("English");
  }
}

let helpcmd = i18n.__("help") + i18n.__("indicates") + i18n.__("misc") +
  "/report" + i18n.__("report") + "/codfis" + i18n.__("codfis") +
  "/weather" + i18n.__("weather") + "/crypto" + i18n.__("crypto") +
  "/twitch" + i18n.__("twitch") + "/anime" + i18n.__("anime") +
  "/ytinfo" + i18n.__("ytinfo") + "/manga" + i18n.__("manga") +
  i18n.__("infos") + "/csgo" + i18n.__("csgo") + "/wot" + i18n.__("wot") +
  "/steam" + i18n.__("steam") + "/steamgame" + i18n.__("steamgame") +
  "/overwatch" + i18n.__("overwatch") + "/srk" + i18n.__("srk") +
  "/srkgame" + i18n.__("srkgame") + "/srktour" + i18n.__("srktour");

let reportmsg, owPF, nomeCF, cognomeCF, sessoCF, ldnCF, ddnCF;

const reportScene = new Scene('report');
reportScene.enter((ctx) => ctx.reply("Inserisci il *messaggio* da inviare :\n(digita /cancel per *cancellare* l'operazione)", Extra.markdown().markup(Markup.forceReply(true))));
reportScene.leave((ctx) => {
  reportmsg = ctx.message.text;
  ctx.reply("*Sicuro di voler inviare questo messaggio ?*\n" +
  "In caso di messaggi inutili, verranno presi provvedimenti nei confronti del mittente.", Extra.markdown().markup(Markup.inlineKeyboard([
    Markup.callbackButton('Si', 'SendMsgToOwner'),
    Markup.callbackButton('No', 'DeleteMsg')
  ])
))});
reportScene.on('text', Stage.leave());

const overwatchWizard = new WizardScene('overwatchWizard',
  (ctx) => {
    ctx.reply("Inserisci la piattaforma di gioco (es. *PC*) :\n(digita /cancel per *cancellare* l'operazione)", Extra.markdown());
    return ctx.wizard.next();
  },
  (ctx) => {
    owPF = ctx.message.text;
    ctx.reply("Inserisci il nome del profilo (es. *osryde#2190*) :\n(digita /cancel per *cancellare* l'operazione)", Extra.markdown());
    return ctx.wizard.next();
  },
  (ctx) => {
    let pf = owPF.toUpperCase(), nick = ctx.message.text, pfs = ["XBL", "PSN", "PC"];
    if (pfs.includes(pf) == false) {
      let abbr = "";
      for (let i = 0; i < pfs.length; i++) {
        if (i === 0) abbr = `\`${pfs[i]}\``;
        else abbr = `\`${pfs[i]}\`` + `*,* ${abbr}`;
      }
      ctx.reply(`Le abbreviazioni disponibili per le piattaforme sono : ${abbr}`, Extra.markdown());
    } else {
      request('https://playoverwatch.com/it-it/career/' + pf.toLowerCase() + '/' + nick.replace("#", "-"), function (error, response, html) {
        if (error || response.statusCode != 200)
          ctx.reply(`L'utente *${nick}* non è presente nei database di Overwatch !`, Extra.markdown());
        else {
          const $ = cheerio.load(html);
          let permission = $('.masthead-permission-level-text').text();
          if (permission == "Profilo pubblico") {
            let playedcomp = parseInt($('#competitive td:contains("Partite giocate")').next().html());
            let woncomp = parseInt($('#competitive td:contains("Partite vinte")').next().html());
            let lostcomp = parseInt($('#competitive td:contains("Partite perse")').next().html());
            let drawcomp = parseInt($('#competitive td:contains("Partite pareggiate")').next().html());
            let kcomp = parseInt($("#competitive td:contains('Eliminazioni')").filter(function () {
              return $(this).text().toLowerCase() == "eliminazioni";
            }).next().html());
            let dcomp = parseInt($('#competitive td:contains("Morti")').next().html());
            let solocomp = parseInt($('#competitive td:contains("Uccisioni solitarie")').next().html());
            let acomp = kcomp - solocomp;
            let kmed = parseFloat(kcomp / playedcomp).toFixed(2);
            let dmed = parseFloat(dcomp / playedcomp).toFixed(2);
            let amed = parseFloat(acomp / playedcomp).toFixed(2);
            let winrate = parseFloat(((woncomp / (playedcomp - drawcomp)) * 100)).toFixed(2);
            let kda = parseFloat((((solocomp + (1 / 3 * acomp)) - dcomp) / playedcomp)).toFixed(2);
            let heroplayednorm = $('#quickplay .ProgressBar-title').first().text();
            let heroplayednormtime = $('#quickplay .ProgressBar-description').first().text();
            let heroplayedcomp = $('#competitive .ProgressBar-title').first().text();
            let heroplayedcomptime = $('#competitive .ProgressBar-description').first().text();
            ctx.reply(`- Dati su *${$('.header-masthead').text()}* -\n` +
              `Livello : *${$('.player-level div').first().text()}*\n` +
              `Eroe più giocato (Normali) : *${heroplayednorm}* con *${heroplayednormtime}* ore\n` +
              `Eroe più giocato (Classificate) : *${heroplayedcomp}* con *${heroplayedcomptime}* ore\n` +
              `Partite giocate (Normali) : *${$('#quickplay td:contains("Partite vinte")').next().html()}*\n` +
              `Ore spese (Normali) : *${$('#quickplay td:contains("Tempo di gioco")').next().html()}* ore\n` +
              `Ore spese (Classificate) : *${$('#competitive td:contains("Tempo di gioco")').next().html()}* ore\n` +
              `Media K/D/A (Classificate) : *${kmed}* / *${dmed}* / *${amed}*\n` +
              `KDA Rateo (Classificate) : *${kda}*\n` +
              `W/D/L (Classificate) : *${woncomp}* / *${drawcomp}* / *${lostcomp}* (in totale *${playedcomp}*)\n` +
              `Winrate (Classificate) : *${winrate}* %`, Extra.markdown());
          } else ctx.reply(`L'utente *${nick}* ha un profilo privato a cui non è possibile accedere !`, Extra.markdown());
        }
      });
    }
    return ctx.scene.leave();
  }
);

const codfisWizard = new WizardScene('codfisWizard',
  (ctx) => {
    ctx.reply("Inserisci il nome :\n(digita /cancel per *cancellare* l'operazione)", Extra.markdown());
    return ctx.wizard.next();
  },
  (ctx) => {
    nomeCF = ctx.message.text;
    ctx.reply("Inserisci il cognome :\n(digita /cancel per *cancellare* l'operazione)", Extra.markdown());
    return ctx.wizard.next();
  },
  (ctx) => {
    cognomeCF = ctx.message.text;
    ctx.reply("Inserisci il sesso :\n(digita /cancel per *cancellare* l'operazione)", Extra.markdown().markup(Markup.keyboard(['Maschio', 'Femmina']).oneTime().resize().extra()));
    return ctx.wizard.next();
  },
  (ctx) => {
    sessoCF = ctx.message.text;
    ctx.reply("Inserisci il luogo di nascita :\n(digita /cancel per *cancellare* l'operazione)", Extra.markdown().markup(Markup.removeKeyboard(true)));
    return ctx.wizard.next();
  },
  (ctx) => {
    ldnCF = ctx.message.text;
    ctx.reply("Inserisci la data di nascita (es. 20/02/2001) :\n(digita /cancel per *cancellare* l'operazione)", Extra.markdown());
    return ctx.wizard.next();
  },
  (ctx) => {
    ddnCF = ctx.message.text;
    let nm = nomeCF.replace(/'/g, "").replace(/ /g, "").toLowerCase();
    let cgm = cognomeCF.replace(/'/g, "").replace(/ /g, "").toLowerCase();
    let ses = sessoCF.toLowerCase(), ldn = ldnCF.toLowerCase(), ddn = ddnCF;
    let codfis = new Array(16), lcgm = cgm.length, lnm = nm.length;
    let i, j = 0, cons = 0, csnm = 0, qcs = 1, ris = 0;
    if (lnm < 3 || lcgm < 3 || ldn.length < 3 || ddn.length < 10 || ddn.length > 10 || mine.isValidDate(ddn) == false || (ses !== "maschio" && ses !== "femmina")) {
      ctx.reply("Per favore, riempi tutti i campi *correttamente* per un funzionamento *ottimale* !", Extra.markdown());
      return ctx.scene.leave();
    } else {
      for (i = 0; i < lcgm; i++) { // INIZIO CALCOLO COGNOME COD. FIS. CARATTERI 0 A 2
        if (cgm.charAt(i) != 'a' && cgm.charAt(i) != 'e' && cgm.charAt(i) != 'i' && cgm.charAt(i) != 'o' && cgm.charAt(i) != 'u') {
          codfis[j] = cgm.charAt(i).toUpperCase();
          j++;
          cons++;
        }
        if (cons == 3) break;
      }
      if (cons == 2) {
        for (i = 0; i < lcgm; i++) {
          if (cgm.charAt(i) != 'a' && cgm.charAt(i) != 'e' && cgm.charAt(i) != 'i' && cgm.charAt(i) != 'o' && cgm.charAt(i) != 'u') {
            codfis[2] = cgm.charAt(i).toUpperCase();
            break;
          }
        }
      }
      if (cons == 1) {
        j = 1;
        for (i = 0; i < lcgm; i++) {
          if (j == 3) break;
          if (cgm.charAt(i) != 'a' && cgm.charAt(i) != 'e' && cgm.charAt(i) != 'i' && cgm.charAt(i) != 'o' && cgm.charAt(i) != 'u') {
            codfis[j] = cgm.charAt(i).toUpperCase();
            j++;
          }
        }
        if (j == 2) codfis[2] = 'X';
      }
      if (cons == 0) {
        j = 0;
        for (i = 0; i < lcgm; i++) {
          if (j == 2) break;
          if (cgm.charAt(i) != 'a' && cgm.charAt(i) != 'e' && cgm.charAt(i) != 'i' && cgm.charAt(i) != 'o' && cgm.charAt(i) != 'u') {
            codfis[j] = cgm.charAt(i).toUpperCase();
            j++;
          }
        }
        codfis[2] = 'X';
      } // FINE CALCOLO COGNOME COD. FIS. CARATTERI 0 A 2
      cons = 0; // INIZIO CALCOLO NOME COD. FIS. CARATTERI 3 A 5
      for (i = 0; i < lnm; i++) {
        if (nm.charAt(i) != 'a' && nm.charAt(i) != 'A' && nm.charAt(i) != 'e' && nm.charAt(i) != 'E' &&
          nm.charAt(i) != 'i' && nm.charAt(i) != 'I' && nm.charAt(i) != 'o' && nm.charAt(i) != 'O' &&
          nm.charAt(i) != 'u' && nm.charAt(i) != 'U') csnm++;
      }
      j = 3;
      for (i = 0; i < lnm; i++) {
        if (nm.charAt(i) != 'a' && nm.charAt(i) != 'A' && nm.charAt(i) != 'e' && nm.charAt(i) != 'E' &&
          nm.charAt(i) != 'i' && nm.charAt(i) != 'I' && nm.charAt(i) != 'o' && nm.charAt(i) != 'O' &&
          nm.charAt(i) != 'u' && nm.charAt(i) != 'U') {
          if (csnm >= 4) {
            if (qcs == 2) qcs++;
            else {
              codfis[j] = nm.charAt(i).toUpperCase();
              qcs++;
              j++;
              cons++;
            }
          } else {
            codfis[j] = nm.charAt(i).toUpperCase();
            j++;
            cons++;
          }
        }
        if (cons == 3) break;
      }
      if (cons == 2) {
        for (i = 0; i < lnm; i++) {
          if (nm.charAt(i) == 'a' || nm.charAt(i) == 'A' || nm.charAt(i) == 'e' || nm.charAt(i) == 'E' ||
            nm.charAt(i) == 'i' || nm.charAt(i) == 'I' || nm.charAt(i) == 'o' || nm.charAt(i) == 'O' ||
            nm.charAt(i) == 'u' || nm.charAt(i) == 'U') {
            codfis[5] = nm.charAt(i).toUpperCase();
            break;
          }
        }
      }
      if (cons == 1) {
        j = 4;
        for (i = 0; i < lnm; i++) {
          if (j == 6) break;
          if (nm.charAt(i) == 'a' || nm.charAt(i) == 'A' || nm.charAt(i) == 'e' || nm.charAt(i) == 'E' ||
            nm.charAt(i) == 'i' || nm.charAt(i) == 'I' || nm.charAt(i) == 'o' || nm.charAt(i) == 'O' ||
            nm.charAt(i) == 'u' || nm.charAt(i) == 'U') {
            codfis[j] = nm.charAt(i).toUpperCase();
            j++;
          }
        }
        if (j == 5) codfis[5] = 'X';
      }
      if (cons == 0) {
        j = 3;
        for (i = 0; i < lnm; i++) {
          if (j == 5) break;
          if (nm.charAt(i) == 'a' || nm.charAt(i) == 'A' || nm.charAt(i) == 'e' || nm.charAt(i) == 'E' ||
            nm.charAt(i) == 'i' || nm.charAt(i) == 'I' || nm.charAt(i) == 'o' || nm.charAt(i) == 'O' ||
            nm.charAt(i) == 'u' || nm.charAt(i) == 'U') {
            codfis[j] = nm.charAt(i).toUpperCase();
            j++;
          }
        }
        codfis[5] = 'X';
      } // FINE CALCOLO NOME COD. FIS. CARATTERI 3 A 5
      codfis[6] = ddn.charAt(8); // INIZIO CALCOLO ANNO COD. FIS. CARATTERI 6 A 7
      codfis[7] = ddn.charAt(9); // FINE CALCOLO ANNO COD. FIS. CARATTERI 6 A 7
      let arrms = ['A', 'B', 'C', 'D', 'E', 'H', 'L', 'M', 'P', 'R', 'S', 'T']; // INIZIO CALCOLO MESE COD. FIS. CARATTERE 8
      let ndn = ddn.charAt(4) - '0';
      if (ddn.charAt(3) == '0') codfis[8] = arrms[ndn - 1];
      else if (ddn.charAt(3) == '1') {
        switch (ddn.charAt(4)) {
          case '0':
            codfis[8] = arrms[9];
            break;
          case '1':
            codfis[8] = arrms[10];
            break;
          case '2':
            codfis[8] = arrms[11];
            break;
          default:
            break;
        }
      } // FINE CALCOLO MESE COD. FIS. CARATTERE 8
      if (ses == "maschio") { // INIZIO CALCOLO SESSO COD. FIS. CARATTERI 9 A 10
        codfis[9] = ddn.charAt(0);
        codfis[10] = ddn.charAt(1);
      } else if (ses == "femmina") {
        codfis[9] = (parseInt(ddn.charAt(0)) + 4).toString();
        codfis[10] = ddn.charAt(1);
      } // FINE CALCOLO SESSO COD. FIS. CARATTERI 9 A 10
      let findldn = JSON.parse(fs.readFileSync('./comuni.json')); // INIZIO RICERCA CODICE CATASTALE COMUNE CARATTERI 11 A 14
      findldn.forEach(function (comune) {
        if (comune.nome == mine.capWord(ldn)) {
          codfis[11] = comune.codiceCatastale.charAt(0);
          codfis[12] = comune.codiceCatastale.charAt(1);
          codfis[13] = comune.codiceCatastale.charAt(2);
          codfis[14] = comune.codiceCatastale.charAt(3);
        }
      }); // FINE RICERCA CODICE CATASTALE COMUNE CARATTERI 11 A 14
      let valncp = new Map([['A', 0], ['B', 1], ['C', 2], ['D', 3], ['E', 4], ['F', 5],  // INIZIO CALCOLO CODICE DI CONTROLLO COD. FIS. CARATTERE 15
        ['G', 6], ['H', 7], ['I', 8], ['J', 9], ['K', 10], ['L', 11], ['M', 12],
        ['N', 13], ['O', 14], ['P', 15], ['Q', 16], ['R', 17], ['S', 18], ['T', 19],
        ['U', 20], ['V', 21], ['W', 22], ['X', 23], ['Y', 24], ['Z', 25]]);
      let valncd = new Map([['A', 1], ['B', 0], ['C', 5], ['D', 7], ['E', 9], ['F', 13],
        ['G', 15], ['H', 17], ['I', 19], ['J', 21], ['K', 2], ['L', 4], ['M', 18],
        ['N', 20], ['O', 11], ['P', 3], ['Q', 6], ['R', 8], ['S', 12], ['T', 14],
        ['U', 16], ['V', 10], ['W', 22], ['X', 25], ['Y', 24], ['Z', 23]]);
      let valnnd = new Map([['0', 1], ['1', 0], ['2', 5], ['3', 7], ['4', 9],
        ['5', 13], ['6', 15], ['7', 17], ['8', 19], ['9', 21]]);
      ris = valncd.get(codfis[0]) + valncp.get(codfis[1]) + valncd.get(codfis[2]) + valncp.get(codfis[3]) + valncd.get(codfis[4]) +
        valncp.get(codfis[5]) + valnnd.get(codfis[6]) + parseInt(codfis[7]) + valncd.get(codfis[8]) + parseInt(codfis[9]) + valnnd.get(codfis[10]) +
        valncp.get(codfis[11]) + valnnd.get(codfis[12]) + parseInt(codfis[13]) + valnnd.get(codfis[14]);
      let lcod = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];
      codfis[15] = lcod[ris % 26]; // FINE CALCOLO CODICE DI CONTROLLO COD. FIS. CARATTERE 15
      ctx.reply(`Il codice fiscale calcolato è *${codfis.join('')}*`, Extra.markdown());
      return ctx.scene.leave();
    }
  }
);

const stage = new Stage([overwatchWizard, codfisWizard]);
stage.register(reportScene);
stage.command('cancel', (ctx) => {
  ctx.reply("Operazione *annullata* con successo !", Extra.markdown());
  ctx.scene.leave();
  Stage.leave();
});

bot.use(commandParts());
bot.use(Session());
bot.use(stage.middleware());

bot.action('SendMsgToOwner', (ctx) => {
  ctx.reply("Messaggio *inviato* con successo !", Extra.markdown());
  bot.telegram.sendMessage("280646563", `- Report da parte di @${ctx.from.username} -\n${reportmsg}`, Extra.markdown());
  //ctx.reply(`- Report da parte di @${ctx.from.username} -\n${reportmsg}`, "280646563", Extra.markdown());
  ctx.deleteMessage();
})

bot.action('DeleteMsg', (ctx) => {
  ctx.reply("Messaggio *cancellato* con successo !", Extra.markdown());
  ctx.deleteMessage();
});

bot.start((ctx) => { ctx.reply(helpcmd, Extra.markdown()); loclang(ctx); });

bot.help((ctx) => ctx.reply(helpcmd, Extra.markdown()));

bot.command('report', (ctx) => ctx.scene.enter('report'));

bot.command('overwatch', (ctx) => ctx.scene.enter('overwatchWizard'));

bot.command('codfis', (ctx) => ctx.scene.enter('codfisWizard'));

bot.command('steampromos', (ctx) => {
  request('https://steamdb.info/upcoming/free/', function (error, response, html) {
    if (error || response.statusCode != 200)
      ctx.reply(`Risorsa non presente !`, Extra.markdown());
    else {
      const $ = cheerio.load(html);
      let currentTable = $('tbody').first();
      let nextTable = $('tbody').last();
      let currentPromos = "", nextPromos = ""
      currentTable.find('td').not('.price-discount').find('b').each(function (index, element) {
        let isPermanent = $(element).parent().parent().parent().find('td').hasClass('price-discount')
        currentPromos = currentPromos + $(element).text() + (isPermanent ? " *[PERMANENTE]*" : " *[WEEKEND]*") + "\n"
      });
      nextTable.find('td').not('.price-discount').find('b').each(function (index, element) {
        let isPermanent = $(element).parent().parent().parent().find('td').hasClass('price-discount')
        nextPromos = nextPromos + $(element).text() + (isPermanent ? " *[PERMANENTE]*" : " *[WEEKEND]*") + "\n"
      });
      ctx.reply(`- *PROMOZIONI ATTIVE* -\n` +
          `${currentPromos}\n` +
          `- *PROMOZIONI IN ARRIVO* -\n` +
          `${nextPromos}`, Extra.markdown());
    }
  });
});

bot.command('wot', (ctx) => {
  let arg = ctx.state.command.args;
  if (arg == '') {
    ctx.reply("*Impossibile* elaborare la richiesta.\nCampo *richiesto* non inserito.", Extra.markdown());
    return;
  }
  request({
    url: "https://api.worldoftanks.eu/wot/account/list/?application_id=" + process.env.WOT + "&search=" + arg,
    json: true
  }, function (error, response, body) {
    if (body.meta.count != 1) {
      ctx.reply("*Impossibile* elaborare la richiesta.\nGiocatore di World of Tanks *non trovato*.", Extra.markdown());
      return;
    }
    let urls = ["https://api.worldoftanks.eu/wot/account/info/?application_id=" + process.env.WOT +
      "&account_id=" + body.data[0].account_id + "&extra=statistics.ranked_battles"];
    games.requestURL(urls, function (response) {
      let plstats = JSON.parse(response[urls[0]].body).data[body.data[0].account_id];
      wotData = {
        nick: body.data[0].nickname,
        wotid: body.data[0].account_id,
        created: plstats.created_at,
        lastbt: plstats.last_battle_time,
        played: plstats.statistics.all.battles,
        spotted: plstats.statistics.all.spotted,
        avgdnblocked: plstats.statistics.all.avg_damage_blocked,
        rimb: plstats.statistics.all.piercings,
        rimbrcvd: plstats.statistics.all.piercings_received,
        survived: plstats.statistics.all.survived_battles,
        hitsperc: plstats.statistics.all.hits_percents,
        draw: plstats.statistics.all.draws,
        win: plstats.statistics.all.wins,
        lose: plstats.statistics.all.losses,
        kills: plstats.statistics.all.frags,
        maxdmg: plstats.statistics.all.max_damage,
        maxkl: plstats.statistics.all.max_frags,
        hits: plstats.statistics.all.hits,
      };
      games.sendWOTStats(ctx, wotData);
    });
  });
});

bot.command('csgo', (ctx) => {
  let steamID64, csgoData, words = 0, arg = ctx.state.command.args;
  if (arg == '') {
    ctx.reply("*Impossibile* elaborare la richiesta.\nCampo *richiesto* non inserito.", Extra.markdown());
    return;
  }
  for (let i = 0; i < arg.length; i++) if (arg.charAt(i) === '_') words++;
  if (words === 0) {
    if (/(?:https?:\/\/)?steamcommunity\.com\/(?:profiles|id)\/[a-zA-Z0-9]+/.test(arg) === true) {
      let regexp = /(?:https?:\/\/)?(?:steamcommunity\.com\/)(?:profiles|id)\/([a-zA-Z0-9]+)/g;
      let matched = regexp.exec(arg);
      arg = matched[1];
    }
  }
  request({
    url: "http://api.steampowered.com/ISteamUser/ResolveVanityURL/v0001/?key=" + process.env.STEAM + "&vanityurl=" + arg,
    json: true
  }, function (error, response, body) {
    if (response.statusCode == 403) {
      ctx.reply(`*Impossibile* elaborare la richiesta.\nChiedere al proprietario del *Bot* per maggiori dettagli.`, Extra.markdown());
      return;
    }
    if (/^\d+$/.test(arg) && arg.length == 17) steamID64 = arg;
    else if (body.response.success == 1) steamID64 = body.response.steamid;
    else if (arg.match(/^STEAM_([0-5]):([0-1]):([0-9]+)$/) || arg.match(/^\[([a-zA-Z]):([0-5]):([0-9]+)(:[0-9]+)?\]$/)) {
      let SteamID3 = new SteamID(arg);
      steamID64 = SteamID3.getSteamID64();
    } else {
      ctx.reply(`*Impossibile* trovare l'account Steam *${arg}*.\n*Controlla* e riprova.`, Extra.markdown());
      return;
    }
    let urls = ["http://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=" + process.env.STEAM + "&steamids=" + steamID64,
    "http://api.steampowered.com/ISteamUserStats/GetUserStatsForGame/v2/?appid=730&key=" + process.env.STEAM + "&steamid=" + steamID64];
    games.requestURL(urls, function (response) {
      if (response[urls[1]].response.statusCode != 200) {
        ctx.reply(`*Impossibile* elaborare la richiesta.\nChiedere al proprietario del *Bot* per maggiori dettagli.`, Extra.markdown());
        return;
      }
      csgoData = { //prendere valori di 123 a 131
        steamid: steamID64,
        username: JSON.parse(response[urls[0]].body).response.players[0].personaname,
        achi: Object.keys(JSON.parse(response[urls[1]].body).playerstats.achievements).length,
        totk: JSON.parse(response[urls[1]].body).playerstats.stats[0].value,
        totd: JSON.parse(response[urls[1]].body).playerstats.stats[1].value,
        totpb: JSON.parse(response[urls[1]].body).playerstats.stats[3].value,
        totdb: JSON.parse(response[urls[1]].body).playerstats.stats[4].value,
        totwins: JSON.parse(response[urls[1]].body).playerstats.stats[5].value,
        totdmg: JSON.parse(response[urls[1]].body).playerstats.stats[6].value,
        totmn: JSON.parse(response[urls[1]].body).playerstats.stats[7].value,
        toths: JSON.parse(response[urls[1]].body).playerstats.stats[24].value,
        totkew: JSON.parse(response[urls[1]].body).playerstats.stats[25].value,
        totknf: JSON.parse(response[urls[1]].body).playerstats.stats[40].value,
        totkasniper: JSON.parse(response[urls[1]].body).playerstats.stats[41].value,
        totdom: JSON.parse(response[urls[1]].body).playerstats.stats[42].value,
        totrev: JSON.parse(response[urls[1]].body).playerstats.stats[44].value,
        totrounds: JSON.parse(response[urls[1]].body).playerstats.stats[47].value,
        totmvp: JSON.parse(response[urls[1]].body).playerstats.stats[101].value,
      };
      games.sendCSGOMessage(ctx, csgoData);
    });
  });
});

bot.command('crypto', (ctx) => {
  let arg = ctx.state.command.args.toLowerCase();
  if (arg == '') {
    ctx.reply("*Impossibile* elaborare la richiesta.\nCampo *richiesto* non inserito.", Extra.markdown());
    return;
  }
  request({
    url: "https://api.coingecko.com/api/v3/coins/markets?vs_currency=eur&ids=" + arg,
    method: 'GET'
  }, function (error, response, body) {
    if (response.statusCode === 404 || error || _.isEqual(JSON.parse(body), JSON.parse("[]")))
      ctx.reply(`La cryptomoneta *${arg}* non esiste, *controlla* l'ortografia e riprova !`, Extra.markdown());
    else if (!error && response.statusCode === 200) {
      let all = JSON.parse(body);
      ctx.replyWithPhoto(all[0].image, {
        caption:
          `- Dati sulla cryptomoneta *${all[0].name}* (*${all[0].symbol.toUpperCase()}*) -\n` +
          `Prezzo : € *${parseFloat(all[0].current_price).toFixed(2)}*\n` +
          `Prezzo in 24h : *${parseFloat(all[0].price_change_percentage_24h).toFixed(2)}* %\n` +
          `Prezzo più alto in 24h : € *${parseFloat(all[0].high_24h).toFixed(2)}*\n` +
          `Prezzo più basso in 24h : € *${parseFloat(all[0].low_24h).toFixed(2)}*`,
        parse_mode: "Markdown"
      });
    }
  })
});

bot.command('steamgame', (ctx) => {
  let arg = ctx.state.command.args;
  if (arg == '') {
    ctx.reply("*Impossibile* elaborare la richiesta.\nCampo *richiesto* non inserito.", Extra.markdown());
    return;
  }
  request({
    url: "http://api.steampowered.com/ISteamApps/GetAppList/v2/",
    json: true
  }, function (error, response, body) {
    let game = body.applist.apps.filter(function (item) {
      return item.name.toUpperCase() === arg.toUpperCase();
    });
    if (game[0] === undefined || body === undefined) {
      ctx.reply(`Il gioco *${arg}* non è stato trovato.\n*Controlla* l'ortografia e riprova.`, Extra.markdown());
      return;
    }
    let urls = ["https://store.steampowered.com/api/appdetails?appids=" + game[0].appid,
      "https://api.steampowered.com/ISteamUserStats/GetNumberOfCurrentPlayers/v1/?key=" + process.env.STEAM + "&appid=" + game[0].appid,
      "http://steamspy.com/api.php?request=appdetails&appid=" + game[0].appid];
    games.requestURL(urls, function (response) {
      if (JSON.parse(response[urls[0]].body)[game[0].appid].data === undefined || JSON.parse(response[urls[1]].body).response.result === 42) {
        ctx.reply(`*${arg}* non è un'APP ID valido.\n*Controlla* l'ortografia e riprova.`, Extra.markdown());
        return;
      }
      steamGameData = {
        name: JSON.parse(response[urls[0]].body)[game[0].appid].data.name,
        type: JSON.parse(response[urls[0]].body)[game[0].appid].data.type,
        age: JSON.parse(response[urls[0]].body)[game[0].appid].data.required_age,
        dlcs: JSON.parse(response[urls[0]].body)[game[0].appid].data.dlc,
        borf: JSON.parse(response[urls[0]].body)[game[0].appid].data.is_free,
        bg: JSON.parse(response[urls[0]].body)[game[0].appid].data.header_image,
        price: JSON.parse(response[urls[0]].body)[game[0].appid].data.price_overview,
        achi: JSON.parse(response[urls[0]].body)[game[0].appid].data.achievements.total,
        rel: JSON.parse(response[urls[0]].body)[game[0].appid].data.release_date.date,
        plats: JSON.parse(response[urls[0]].body)[game[0].appid].data.platforms,
        dev: JSON.parse(response[urls[0]].body)[game[0].appid].data.developers,
        pub: JSON.parse(response[urls[0]].body)[game[0].appid].data.publishers,
        pls: JSON.parse(response[urls[1]].body).response.player_count,
        mtg: JSON.parse(response[urls[2]].body).average_forever
      };
      games.sendEmbedGameMessage(ctx, steamGameData);
    });
  });
});

bot.command('steam', (ctx) => {
  let steamID64, steamUserData, words = 0, arg = ctx.state.command.args;
  if (arg == '') {
    ctx.reply("*Impossibile* elaborare la richiesta.\nCampo *richiesto* non inserito.", Extra.markdown());
    return;
  }
  for (let i = 0; i < arg.length; i++) if (arg.charAt(i) === '_') words++;
  if (words === 0) {
    if (/(?:https?:\/\/)?steamcommunity\.com\/(?:profiles|id)\/[a-zA-Z0-9]+/.test(arg) === true) {
      let regexp = /(?:https?:\/\/)?(?:steamcommunity\.com\/)(?:profiles|id)\/([a-zA-Z0-9]+)/g;
      let matched = regexp.exec(arg);
      arg = matched[1];
    }
  }
  request({
    url: "http://api.steampowered.com/ISteamUser/ResolveVanityURL/v0001/?key=" + process.env.STEAM + "&vanityurl=" + arg,
    json: true
  }, function (error, response, body) {
    if (response.statusCode == 403) {
      ctx.reply(`*Impossibile* elaborare la richiesta.\nChiedere al proprietario del *Bot* per maggiori dettagli.`, Extra.markdown());
      return;
    }
    if (/^\d+$/.test(arg) && arg.length == 17) steamID64 = arg;
    else if (body.response.success == 1) steamID64 = body.response.steamid;
    else if (arg.match(/^STEAM_([0-5]):([0-1]):([0-9]+)$/) || arg.match(/^\[([a-zA-Z]):([0-5]):([0-9]+)(:[0-9]+)?\]$/)) {
      let SteamID3 = new SteamID(arg);
      steamID64 = SteamID3.getSteamID64();
    } else {
      ctx.reply(`*Impossibile* trovare l'account Steam *${arg}*.\n*Controlla* e riprova.`, Extra.markdown());
      return;
    }
    let urls = ["http://api.steampowered.com/IPlayerService/GetSteamLevel/v1/?key=" + process.env.STEAM + "&steamid=" + steamID64,
      "http://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=" + process.env.STEAM + "&steamids=" + steamID64,
      "http://api.steampowered.com/IPlayerService/GetOwnedGames/v1/?key=" + process.env.STEAM + "&steamid=" + steamID64,
      "http://api.steampowered.com/ISteamUser/GetFriendList/v1/?key=" + process.env.STEAM + "&steamid=" + steamID64];
    games.requestURL(urls, function (response) {
      steamUserData = {
        avatar: (JSON.parse(response[urls[1]].body).response.players[0].avatarfull),
        username: (JSON.parse(response[urls[1]].body).response.players[0].personaname),
        realname: (JSON.parse(response[urls[1]].body).response.players[0].realname),
        status: (JSON.parse(response[urls[1]].body).response.players[0].personastate),
        friends: (JSON.parse(response[urls[3]].body)),
        gameinfo: (JSON.parse(response[urls[1]].body).response.players[0].gameextrainfo),
        gameid: (JSON.parse(response[urls[1]].body).response.players[0].gameid),
        games: (JSON.parse(response[urls[2]].body).response.games),
        level: (JSON.parse(response[urls[0]].body).response.player_level),
        timecreated: (JSON.parse(response[urls[1]].body).response.players[0].timecreated),
        lastlogoff: (JSON.parse(response[urls[1]].body).response.players[0].lastlogoff),
        loccountrycode: (JSON.parse(response[urls[1]].body).response.players[0].loccountrycode),
        locstatecode: (JSON.parse(response[urls[1]].body).response.players[0].locstatecode),
        loccityid: (JSON.parse(response[urls[1]].body).response.players[0].loccityid),
      };
      games.sendEmbedUserMessage(ctx, steamUserData);
    });
  });
});

bot.command('srk', (ctx) => {
  let arg = ctx.state.command.args.toLowerCase();
  if (arg == '') {
    ctx.reply("*Impossibile* elaborare la richiesta.\nCampo *richiesto* non inserito.", Extra.markdown());
    return;
  }
  request({
    url: "http://rank.shoryuken.com/api/player/name/" + arg,
    method: 'GET'
  }, function (error, response, body) {
    if (response.statusCode === 404 || error || _.isEqual(JSON.parse(body), JSON.parse("{}")))
      ctx.reply(`L'utente *${arg}* non è presente nel database di Shoryuken.com !`, Extra.markdown());
    else if (!error && response.statusCode === 200) {
      let srkpl = JSON.parse(body), rname = "Non disponibile", teams = "Nessuno sponsor", torns = "Nessuno", rankg = 0, ranks = "", places = "";
      if (srkpl.realname != "") rname = srkpl.realname;
      if (!_.isEqual(srkpl.teams, JSON.parse("[]"))) {
        teams = "";
        srkpl.teams.forEach(function (element) { teams = element + "\n" + teams; });
      }
      if (srkpl.results !== undefined) torns = Object.keys(srkpl.results).length;
      if (srkpl.rankings !== undefined) rankg = Object.keys(srkpl.rankings).length;
      for (let i = 0; i < rankg; i++)
        ranks = `*${srkpl.rankings[Object.getOwnPropertyNames(srkpl.rankings)[i]].rank}°* su *${Object.getOwnPropertyNames(srkpl.rankings)[i]}*\n` + ranks;
      if (torns > 0) {
        for (let i = 0; i < torns; i++) {
          places = `*${srkpl.results[i].place}° :* \`${srkpl.results[i].tournamentname}\`\n` + places;
          if (i == 8) break;
        }
        if (torns > 9) places = places + `e altri *${torns - 9}* tornei...`
      } else places = "Nessun torneo";
      ctx.reply(`- Dati su *${srkpl.name}* -\n` +
        `Nome : *${rname}*\n` +
        `Gioco principale : *${srkpl.mainGame}*\n` +
        `Tornei partecipati : *${torns}*\n` +
        `Punti Capcom Pro Tour : *${srkpl.cptScore}*\n` +
        `Paese : *${mine.getCountryName(srkpl.country)}*\n` +
        `Sponsors : *${teams}*` +
        `Rank nei giochi : \n${ranks}` +
        `Posizionamento nei tornei : \n${places}\n`, Extra.markdown());
    }
  })
});

bot.command('srkgame', (ctx) => {
  let arg = ctx.state.command.args.toLowerCase(), games = ["SF5", "DBFZ", "T7", "GGXRD", "SKULLGIRL", "IGAU", "MKX",
    "KI", "INJUSTICE2", "MVCI", "BBCP", "USF4", "UMVC3"];
  if (arg == '') {
    ctx.reply("*Impossibile* elaborare la richiesta.\nCampo *richiesto* non inserito.", Extra.markdown());
    return;
  }
  if (arg === "list" || games.includes(arg.toUpperCase()) === false) {
    let abbr = "";
    for (let i = 0; i < games.length; i++) {
      if (i === 0) abbr = `\`${games[i]}\``;
      else abbr = `\`${games[i]}\`` + `*,* ${abbr}`;
    }
    ctx.reply(`Le abbreviazioni disponibili per i giochi sono : ${abbr}`, Extra.markdown());
  } else {
    request({
      url: "http://rank.shoryuken.com/api/top?game=" + arg.toLowerCase() + "&format=json",
      method: 'GET'
    }, function (error, response, body) {
      if (response.statusCode === 404 || error || _.isEqual(JSON.parse(body), JSON.parse("{}")))
        ctx.reply(`Il gioco *${arg.toUpperCase()}* non è presente nel database di Shoryuken.com !`, Extra.markdown());
      else if (!error && response.statusCode === 200) {
        let srkgame = JSON.parse(body), tensg = "";
        for (let i = 0; i < 10; i++) tensg = tensg + `*${srkgame[i].rank}°* : *${srkgame[i].name}* (${mine.getCountryName(srkgame[i].country.toUpperCase())})\n`;
        ctx.reply(`Primi 10 classificati su *${arg.toUpperCase()}* : \n${tensg}`, Extra.markdown());
      }
    })
  }
});

bot.command('srktour', (ctx) => {
  let arg = ctx.state.command.args.toLowerCase();
  if (arg == '') {
    ctx.reply("*Impossibile* elaborare la richiesta.\nCampo *richiesto* non inserito.", Extra.markdown());
    return;
  }
  request({
    url: "http://rank.shoryuken.com/api/tournament/name/" + arg,
    method: 'GET'
  }, function (error, response, body) {
    if (response.statusCode === 404 || error || _.isEqual(JSON.parse(body), JSON.parse("{}")))
      ctx.reply(`Il torneo \`${arg}\` non è presente nel database di Shoryuken.com !`, Extra.markdown());
    else if (!error && response.statusCode === 200) {
      let srktour = JSON.parse(body), tens = "", players = 0, tenspl;
      if (srktour.results !== undefined) players = Object.keys(srktour.results).length;
      tenspl = srktour.results.filter(function (item) { return item.place === 1; });
      tens = tens + `*${tenspl[0].place}°* : *${tenspl[0].playername}*\n`;
      tenspl = srktour.results.filter(function (item) { return item.place === 2; });
      tens = tens + `*${tenspl[0].place}°* : *${tenspl[0].playername}*\n`;
      tenspl = srktour.results.filter(function (item) { return item.place === 3; });
      tens = tens + `*${tenspl[0].place}°* : *${tenspl[0].playername}*\n`;
      if (players > 3) tens = tens + `e altri *${players - 3}* giocatori...`
      ctx.reply(`- Dati sul torneo *${srktour.name}* -\n` +
        `Svoltosi in *${mine.getCountryName(srktour.country)}*\n` +
        `Svoltosi il *${mine.SRKTourDate(srktour.date)}*\n` +
        `Partecipanti : *${players}*\n` +
        `Primi 3 classificati : \n${tens}\n`, Extra.markdown());
    }
  })
});

bot.command('weather', (ctx) => {
  let arg = ctx.state.command.args;
  if (arg == '') {
    ctx.reply("*Impossibile* elaborare la richiesta.\nCampo *richiesto* non inserito.", Extra.markdown());
    return;
  }
  weather.find({ search: arg, degreeType: 'C' }, function (err, result) {
    if (err || result[0] === undefined)
      ctx.reply(`Il luogo *${arg}* non è stato trovato.`, Extra.markdown());
    else {
      let current = result[0].current, location = result[0].location;
      ctx.reply(`- Info su *${current.observationpoint}* -\n` +
        `Latitudine : *${location.lat}*\n` +
        `Longitudine : *${location.long}*\n` +
        `Fuso orario : *${current.observationtime}* (*UTC${location.timezone}*)\n` +
        `Temperatura : *${current.temperature} °C*\n` +
        `Tempo : *${current.skytext}*\n` +
        `Vento : *${current.winddisplay}*\n` +
        `Umidità  : *${current.humidity} %*`, Extra.markdown());
    }
  });
});

bot.command('twitch', (ctx) => {
  let arg = ctx.state.command.args;
  if (arg == '') {
    ctx.reply("*Impossibile* elaborare la richiesta.\nCampo *richiesto* non inserito.", Extra.markdown());
    return;
  }
  request({
    url: 'https://api.twitch.tv/helix/users?login=' + arg,
    method: 'GET',
    headers: { 'Client-ID': process.env.TWITCH }
  }, function (error, response, body) {
    if (response.statusCode === 404 || error || _.isEqual(JSON.parse(body), JSON.parse("{}")))
      ctx.reply(`Lo streamer *${arg}* non è presente su Twitch !`, Extra.markdown());
    else if (!error && response.statusCode === 200) {
      let twitch = JSON.parse(body);
      let id = twitch.data[0].id, pic = twitch.data[0].profile_image_url, streamer = twitch.data[0].display_name;
      let views = parseInt(twitch.data[0].view_count).toLocaleString().replace(/,/g, ".");
      request({
        url: 'https://api.twitch.tv/helix/users/follows?to_id=' + id,
        method: 'GET',
        headers: { 'Client-ID': process.env.TWITCH }
      }, function (error, response, body) {
        let twitch = JSON.parse(body);
        let followers = parseInt(twitch.total).toLocaleString().replace(/,/g, ".");
        request({
          url: 'https://api.twitch.tv/helix/streams?user_id=' + id,
          method: 'GET',
          headers: { 'Client-ID': process.env.TWITCH }
        }, function (error, response, body) {
          let twitch = JSON.parse(body), streamerplaying = "";
          if (twitch.data.length === 0) {
            ctx.replyWithPhoto(pic, {
              caption:
                `- Informazioni su *${streamer}* -\n` +
                `Visualizzazioni totali : *${views}*\n` +
                `Followers totali : *${followers}*\n` +
                `Stato : *Offline*`,
              parse_mode: "Markdown"
            });
          } else {
            let gameid = twitch.data[0].game_id, title = twitch.data[0].title;
            let viewers = parseInt(twitch.data[0].viewer_count).toLocaleString().replace(/,/g, ".");
            request({
              url: 'https://api.twitch.tv/helix/games?id=' + gameid,
              method: 'GET',
              headers: { 'Client-ID': process.env.TWITCH }
            }, function (error, response, body) {
              let twitch = JSON.parse(body);
              streamerplaying = twitch.data[0].name;
                ctx.replyWithPhoto(pic, {
                caption:
                  `- Informazioni su *${streamer}* -\n` +
                  `Visualizzazioni totali : *${views}*\n` +
                  `Followers totali : *${followers}*\n` +
                  `Online su *${streamerplaying}* con *${viewers}* spettatori\n` +
                  `- *${title}* -`,
                parse_mode: "Markdown"
              });
            })
          }
        })
      })
    }
  })
});

bot.command('ytinfo', (ctx) => {
  let arg = ctx.state.command.args;
  if (arg == '') {
    ctx.reply("*Impossibile* elaborare la richiesta.\nCampo *richiesto* non inserito.", Extra.markdown());
    return;
  }
  request({
    url: "https://www.googleapis.com/youtube/v3/channels?part=snippet%2Cstatistics&forUsername=" + arg + "&key=" + process.env.GOOGLE,
    method: 'GET'
  }, function (error, response, body) {
    let yt = JSON.parse(body);
    if (response.statusCode === 404 || error || _.isEqual(JSON.parse(body), JSON.parse("[]")) || Object.keys(yt.items).length < 1)
      ctx.reply(`Il canale youtube ${arg} non esiste, controlla l'ortografia e riprova !`, Extra.markdown());
    else if (!error && response.statusCode === 200) {
      let subs = "Nascosti"
      if (yt.items[0].statistics.hiddenSubscriberCount == false)
        subs = parseInt(yt.items[0].statistics.subscriberCount).toLocaleString().replace(/,/g, ".");
      ctx.replyWithPhoto(yt.items[0].snippet.thumbnails.medium.url, {
        caption:
          `- Dati su *${yt.items[0].snippet.title}* -\n` +
          `Canale creato il giorno *${mine.IsoConv(yt.items[0].snippet.publishedAt)}*\n` +
          `Paese : *${mine.getCountryName(yt.items[0].snippet.country)}*\n` +
          `Iscritti : *${subs}*\n` +
          `Video : *${parseInt(yt.items[0].statistics.videoCount).toLocaleString().replace(/,/g, ".")}*\n` +
          `Visualizzazioni totali : *${parseInt(yt.items[0].statistics.viewCount).toLocaleString().replace(/,/g, ".")}*`,
        parse_mode: "Markdown"
      });
    }
  })
});

bot.command('anime', (ctx) => ctx.reply("Comando *in costruzione* !", Extra.markdown()));

bot.command('manga', (ctx) => ctx.reply("Comando *in costruzione* !", Extra.markdown()));

bot.command('metacritic', (ctx) => ctx.reply("Comando *in costruzione* !", Extra.markdown()));

bot.command('wiki', (ctx) => ctx.reply("Comando *in costruzione* !", Extra.markdown()));

bot.launch();
bot.startPolling();