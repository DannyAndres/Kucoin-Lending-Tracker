const API = require('kucoin-node-sdk');
const util = require('util');
var figlet = require('figlet');
const fs = require('fs');
var asciichart = require ('asciichart');
const readline = require('readline')

var dataDailyLimit = 100;

/*
  0 -> node path
  1 -> index js path
  2 -> minutes
  3 -> autoplay
*/
const arguments = process.argv;

var autoplay = false;
if (arguments.length > 3 && arguments[3] == 'autoplay') {
  autoplay = true;
}

var updateEveryXMinutes = 60;
if (arguments.length > 2) {
  updateEveryXMinutes = parseFloat(arguments[2]);
}
const updateTime = 1000 * 60 * updateEveryXMinutes;

API.init(require('./config'));

Number.prototype.round = function(places) {
  return +(Math.round(this + "e+" + places)  + "e-" + places);
}

Date.prototype.getWeekNumber = function(){
  var d = new Date(Date.UTC(this.getFullYear(), this.getMonth(), this.getDate()));
  var dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  var yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
  return Math.ceil((((d - yearStart) / 86400000) + 1)/7)
};

function getPercentageOfDailyPayment(selection, array) {
  let basket = [];
  let stringDate = '';
  array.forEach(item => {
    let tempStringDate = '';
    let a = new Date(item.date);
    a.setHours(0);
    a.setMinutes(0);
    a.setSeconds(0);
    if (selection == 'day') {
      tempStringDate = (a.getUTCDate())+'-'+(a.getUTCMonth()+1)+'-'+(a.getUTCFullYear());
    } else if (selection == 'week') {
      tempStringDate = (a.getWeekNumber())+'-'+(a.getUTCFullYear());
    } else if (selection == 'month') {
      tempStringDate = (a.getUTCMonth()+1)+'-'+(a.getUTCFullYear());
    }
    if (tempStringDate != stringDate) {
      basket.push([]);
      basket[basket.length-1].push(item);
      stringDate = tempStringDate;
    } else {
      basket[basket.length-1].push(item);
    }
  });
  if (basket.length == 0 || basket.length == 1) {
    return 0;
  } else {
    let first = basket[basket.length - 2][basket[basket.length - 2].length - 1];
    let last = basket[basket.length - 1][basket[basket.length - 1].length - 1];
    let output = ((last.value * 100) / first.value) - 100;
    return output;
  }
}

function toFixed(x) {
  if (Math.abs(x) < 1.0) {
    var e = parseInt(x.toString().split('e-')[1]);
    if (e) {
        x *= Math.pow(10,e-1);
        x = '0.' + (new Array(e)).join('0') + x.toString().substring(2);
    }
  } else {
    var e = parseInt(x.toString().split('+')[1]);
    if (e > 20) {
        e -= 20;
        x /= Math.pow(10,e);
        x += (new Array(e+1)).join('0');
    }
  }
  return x;
}

function getDate(miliseconds) {
  Number.prototype.padLeft = function(base,chr){
    var  len = (String(base || 10).length - String(this).length)+1;
    return len > 0? new Array(len).join(chr || '0')+this : this;
  }
  var d = new Date();
  if (miliseconds != null) {
    d = new Date(miliseconds);
  }
  let month = (d.getMonth()+1).padLeft();
  let day = d.getDate().padLeft();
  var dformat = [day,
            month,
            d.getFullYear()].join('/') +' ' +
            [d.getHours().padLeft(),
            d.getMinutes().padLeft(),
            d.getSeconds().padLeft()].join(':');
  return dformat;
}

const main = async () => {
  
  const getLends = await API.rest.User.Account.getAccountLedgers();
  const getAccountList = await API.rest.User.Account.getAccountsList();
  const lendData = await API.rest.Margin.BorrowAndLend.getActiveLendOrdersList();
  const marketData = await API.rest.Margin.BorrowAndLend.getLendingMarketData('USDT');

  let coin = 'USDT';
  let lended = 0;
  let deposits = 0;
  let accrued = 0;
  let dailyPercentage = 0;
  let orders = {
    'total orders lent': 0,
    '7 days': {
      quantity: lendData.data.items.filter(item => item.term == 7).length.toString(),
      dates: []
    },
    '14 days': {
      quantity: lendData.data.items.filter(item => item.term == 14).length.toString(),
      dates: []
    },
    '28 days': {
      quantity: lendData.data.items.filter(item => item.term == 28).length.toString(),
      dates: []
    },
  };
  let market = [];

  
  const accountCoin = getAccountList.data.find(item => item.currency == coin);
  const balance = parseFloat(accountCoin.balance);

  //console.log(getLends.data.items.filter(item => item.currency == coin));
  //console.log(lendData.data.items);
  
  lendData.data.items.forEach(item => {
    accrued += parseFloat(item.accruedInterest);
    dailyPercentage += parseFloat(item.dailyIntRate);
    if (item.term == 7) {
      orders['7 days'].dates.push(getDate(item.maturityTime))
    }
    if (item.term == 14) {
      orders['14 days'].dates.push(getDate(item.maturityTime))
    }
    if (item.term == 28) {
      orders['28 days'].dates.push(getDate(item.maturityTime))
    }
  });

  dailyPercentage = dailyPercentage / lendData.data.items.length;

  let first = marketData.data.find(item => item.term == 7);
  market.push({
    days: 7,
    percentage: (parseFloat(first.dailyIntRate)*100) + '%',
    amount: first.size,
    apy: (parseFloat(first.dailyIntRate)*100*365) + '%'
  });
  let second = marketData.data.find(item => item.term == 14);
  market.push({
    days: 14,
    percentage: (parseFloat(second.dailyIntRate)*100) + '%',
    amount: second.size,
    apy: (parseFloat(second.dailyIntRate)*100*365) + '%'
  });
  let third = marketData.data.find(item => item.term == 28);
  market.push({
    days: 28,
    percentage: (parseFloat(third.dailyIntRate)*100) + '%',
    amount: third.size,
    apy: (parseFloat(third.dailyIntRate)*100*365) + '%'
  });

  let firstDeposit = null;

  getLends.data.items.forEach(item => {
    if (
      item.currency == coin
    ) {
      if (item.bizType == 'Loans Repaid') {
        lended += parseFloat(item.amount);
        orders['total orders lent'] += 1;
      }
      if (item.bizType == 'Loans') {
        lended -= parseFloat(item.amount);
      }
      if (item.bizType == 'Deposit') {
        deposits += parseFloat(item.amount);
        if (firstDeposit == null) {
          firstDeposit = item;
        }
      }
    }
  });

  // console.clear();
  // console.clear();
  // console.clear();

  const blank = '\n'.repeat(process.stdout.rows);
  console.log(blank);
  readline.cursorTo(process.stdout, 0, 0);
  readline.clearScreenDown(process.stdout);
  process.stdout.write("\u001b[3J\u001b[2J\u001b[1J");console.clear();

  console.log('\n--------------------------------------------------------------------------------------\n');
  console.log('Stadistics ['+getDate()+']\n');
  if (autoplay) {
    console.log('updated every '+parseFloat(updateTime/60000)+' minutes\n');
  }
  console.table({
    main: {
      coin: coin,
      deposits: deposits.toString(),
      total: (balance - lended).toString(),
      balance: balance.toString(),
      lent: (-1 * lended).toString(),
      'total past orders lent': orders['total orders lent'],
      'active orders': lendData.data.totalNum
    }
  });
  console.table({
    'history': {
      'first deposit date': getDate(firstDeposit.createdAt),
      'days since first deposit': (((new Date().getTime()) - firstDeposit.createdAt)/(1000*60*60*24)).round(2),
    }
  });
  console.table({
    earnings: {
      accrued: accrued.toString(),
      paid: (toFixed((balance - lended)-deposits)),
      percentage: toFixed(((((balance - lended)-deposits) * 100) / deposits)*100) + '%'
    }
  });
  console.table([
    {
      name: 'daily',
      rounded: '1 day',
      amount: ((-1 * lended)*dailyPercentage).toString(),
      percentage: (dailyPercentage*100).toString() + '%'
    },
    {
      name: 'weekly',
      rounded: '7 days',
      amount: (((-1 * lended)*dailyPercentage)*7).toString(),
      percentage: (dailyPercentage*7*100).toString() + '%'
    },
    {
      name: 'monthly',
      rounded: '30 days',
      amount: (((-1 * lended)*dailyPercentage)*30).toString(),
      percentage: (dailyPercentage*30*100).toString() + '%'
    },
    {
      name: 'yearly',
      rounded: '365 days',
      amount: (((-1 * lended)*dailyPercentage)*365).toString(),
      percentage: (dailyPercentage*365*100).toString() + '%'
    }
  ]);
  //console.log('\n');
  console.table(market);
  //console.log('\n');
  console.table([
    {
      days: 7,
      quantity: parseInt(orders['7 days'].quantity),
      dates: orders['7 days'].dates
    },
    {
      days: 14,
      quantity: parseInt(orders['14 days'].quantity),
      dates: orders['14 days'].dates
    },
    {
      days: 28,
      quantity: parseInt(orders['28 days'].quantity),
      dates: orders['28 days'].dates
    },
  ]);
  fs.readFile('./database.json', 'utf-8', (err, data) => {
    if (err) {
      throw err;
    }

    // parse JSON object
    var database = JSON.parse(data.toString());
    database.updated_at = new Date().getTime();
    database.percentages.push({
      value: (parseFloat(first.dailyIntRate)*100*365),
      date: new Date().getTime()
    });
    database.data.push({
      value: ((-1 * lended)*dailyPercentage),
      date: new Date().getTime()
    });

    var dailyColorPercentage = getPercentageOfDailyPayment('day', database.data);
    var weekColorPercentage = getPercentageOfDailyPayment('week', database.data);
    var monthColorPercentage = getPercentageOfDailyPayment('month', database.data);

    var finalLog = '';

    if (dailyColorPercentage >= 0) {
      finalLog += '\n    Daily \x1b[32m'+dailyColorPercentage+'%\x1b[0m';
    } else {
      finalLog += '\n    Daily \x1b[31m'+dailyColorPercentage+'%\x1b[0m';
    }

    if (weekColorPercentage >= 0) {
      finalLog += '    Weekly \x1b[32m'+weekColorPercentage+'%\x1b[0m';
    } else {
      finalLog += '    Weekly \x1b[31m'+weekColorPercentage+'%\x1b[0m';
    }

    if (monthColorPercentage >= 0) {
      finalLog += '    Monthly \x1b[32m'+monthColorPercentage+'%\x1b[0m';
    } else {
      finalLog += '    Monthly \x1b[31m'+monthColorPercentage+'%\x1b[0m';
    }

    let myNumber = (dailyPercentage*100);
    let marketNumber = (parseFloat(first.dailyIntRate)*100);
    let differencePercentage = (((marketNumber * 100) / myNumber) - 100)

    if (differencePercentage >= 0) {
      finalLog += '    Market \x1b[32mUP '+differencePercentage.round(3)+'%\x1b[0m\n';
    } else {
      finalLog += '    Market \x1b[31mDOWN '+differencePercentage.round(3)+'%\x1b[0m\n';
    }

    console.log('\n--------------------------------------------------------------------------------------\n');

    console.log(finalLog);

    fs.writeFileSync('./database.json', JSON.stringify(database));
    figlet('Daily ' + (((-1 * lended)*dailyPercentage).round(3)).toString() + ' / Earned ' + ((((balance - lended)-deposits) + accrued).round(2)).toString(), function(err, data) {
      if (err) {
          console.log('Something went wrong...');
          console.dir(err);
          return;
      }
      console.log(data);

      console.log('\n');
      fs.readFile('./database.json', 'utf-8', (err, data) => {
        if (err) {
          throw err;
        }
    
        // parse JSON object
        var database = JSON.parse(data.toString());

        // last dataDailyLimit lookups
        var lastLookups = [];
        var lastLookupsPercentages = [];
        var lastLookupsSet = new Set();
        var lastLookupsSetPercentages = new Set();
        database.data.forEach((item, index) => {
          if (!lastLookupsSet.has(item.value)) {
            lastLookupsSet.add(item.value);
            lastLookups.push(item);
          }
        });
        database.percentages.forEach((item, index) => {
          if (!lastLookupsSetPercentages.has(item.value)) {
            lastLookupsSetPercentages.add(item.value);
            lastLookupsPercentages.push(item);
          }
        });

        lastLookups = lastLookups.filter((item, index) => index >= (lastLookups.length - dataDailyLimit))
        lastLookupsPercentages = lastLookupsPercentages.filter((item, index) => index >= (lastLookupsPercentages.length - dataDailyLimit))

        var s0 = lastLookups.map(item => parseFloat(item.value));
        var s1 = lastLookupsPercentages.map(item => parseFloat(item.value));

        console.log('\x1b[36m%s\x1b[0m', '          Daily earnings history graph last ' + dataDailyLimit + ' different lookups\n');  //cyan
        console.log (asciichart.plot (s0, { height: 10 }));
        console.log('\x1b[36m%s\x1b[0m', '\n          APY (7 days) history graph last ' + dataDailyLimit + ' different lookups => using: [ ' + (dailyPercentage*365*100).round(3) + '% ] / current: [ ' + (parseFloat(first.dailyIntRate)*100*365).round(3) + '% ]\n');  //cyan
        console.log (asciichart.plot (s1, { height: 10 }));
        console.log('\n--------------------------------------------------------------------------------------\n');
      });
  });
  });
};

// run rest main
main();
if (autoplay) {
  let interval = setInterval(() => {main()}, updateTime);
}